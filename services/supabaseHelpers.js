/**
 * Supabase Engineering Helpers
 * Centralized utilities for retry, batch, streaming, and audit patterns.
 * Reference: supabase/docs/ENGINEERING_PATTERNS.md
 */

import { supabase } from './supabase';

// ─── 1. RETRY LOGIC ─────────────────────────────────────────────────────────

/**
 * Determines if an error is transient and worth retrying.
 */
function isRetryable(error) {
    if (!error) return false;
    const code = error?.code || error?.status;
    const msg = (error?.message || '').toLowerCase();

    // Network errors → always retry
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('timeout')) return true;

    // Rate limited → retry after backoff
    if (code === 429 || code === '429') return true;

    // Server errors → retry (502, 503, 504)
    if ([502, 503, 504].includes(Number(code))) return true;

    // PostgreSQL serialization failure → retry
    if (code === '40001') return true;

    // NOT retryable: auth errors, constraint violations, RLS denials
    if ([401, 403, 409, 422].includes(Number(code))) return false;
    if (code === '23505' || code === '42501') return false;

    return false;
}

/**
 * Exponential backoff retry wrapper.
 * Use for any Supabase call that could transiently fail.
 *
 * @param {Function} fn        - Async function to retry
 * @param {Object}   options   - Configuration
 * @param {number}   options.maxRetries   - Max attempts (default: 3)
 * @param {number}   options.baseDelayMs  - Initial delay (default: 500)
 * @param {Function} options.shouldRetry  - Custom retry predicate
 * @returns {Promise<any>}
 */
export async function withRetry(fn, {
    maxRetries = 3,
    baseDelayMs = 500,
    shouldRetry = isRetryable
} = {}) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt === maxRetries || !shouldRetry(error)) {
                throw error;
            }
            const delay = baseDelayMs * Math.pow(2, attempt - 1);
            const jitter = Math.random() * delay * 0.3;
            await new Promise(r => setTimeout(r, delay + jitter));
            if (__DEV__) {
                console.warn(`[withRetry] Attempt ${attempt}/${maxRetries} failed, retrying in ${Math.round(delay + jitter)}ms...`);
            }
        }
    }
    throw lastError;
}

// ─── 2. BATCH PROCESSING ────────────────────────────────────────────────────

/**
 * Process items in fixed-size batches with rate limiting.
 *
 * @param {Array}    items      - Full array to process
 * @param {Function} processFn  - Async function receiving a batch array
 * @param {Object}   options
 * @param {number}   options.batchSize   - Items per batch (default: 50)
 * @param {number}   options.delayMs     - Pause between batches (default: 200)
 * @param {Function} options.onProgress  - Progress callback (processed, total)
 * @returns {Promise<{ succeeded: number, failed: number, errors: Array }>}
 */
export async function batchProcess(items, processFn, {
    batchSize = 50,
    delayMs = 200,
    onProgress = null
} = {}) {
    const results = { succeeded: 0, failed: 0, errors: [] };

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);

        try {
            await processFn(batch);
            results.succeeded += batch.length;
        } catch (error) {
            results.failed += batch.length;
            results.errors.push({
                batchIndex: Math.floor(i / batchSize),
                error: error.message,
                firstItem: batch[0]
            });
        }

        if (onProgress) {
            onProgress(Math.min(i + batchSize, items.length), items.length);
        }

        // Rate limiting pause between batches
        if (i + batchSize < items.length) {
            await new Promise(r => setTimeout(r, delayMs));
        }
    }

    return results;
}

// ─── 3. REALTIME STREAMING ──────────────────────────────────────────────────

/**
 * Create a managed Supabase realtime subscription with auto-cleanup.
 *
 * @param {string}   table     - Table to subscribe to
 * @param {string}   event     - 'INSERT' | 'UPDATE' | 'DELETE' | '*'
 * @param {Function} callback  - Handler receiving (newRow, oldRow, eventType)
 * @param {Object}   filter    - Column filter { column, value }
 * @returns {{ unsubscribe: Function }}
 */
export function subscribeToTable(table, event, callback, filter = null) {
    const channelName = `${table}_${event}_${filter?.value || 'all'}_${Date.now()}`;

    const channel = supabase
        .channel(channelName)
        .on(
            'postgres_changes',
            {
                event,
                schema: 'public',
                table,
                ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {})
            },
            (payload) => {
                callback(payload.new, payload.old, payload.eventType);
            }
        )
        .subscribe((status) => {
            if (__DEV__) {
                if (status === 'SUBSCRIBED') {
                    console.log(`[Stream] Subscribed to ${table}.${event}`);
                } else if (status === 'CHANNEL_ERROR') {
                    console.error(`[Stream] Failed to subscribe to ${table}.${event}`);
                }
            }
        });

    return {
        unsubscribe: () => {
            supabase.removeChannel(channel);
        }
    };
}

// ─── 4. AUDIT WRAPPER ───────────────────────────────────────────────────────

/**
 * Wrap a service call with automatic audit logging.
 * Logs success/failure to user_activity without blocking the main operation.
 *
 * @param {string}   action     - Action name (e.g., 'emergency.create')
 * @param {string}   entityType - Entity type (e.g., 'emergency_request')
 * @param {Function} fn         - The actual operation
 * @param {Object}   metadata   - Extra context to log
 * @returns {Promise<any>}
 */
export async function withAudit(action, entityType, fn, metadata = {}) {
    const startTime = Date.now();
    try {
        const result = await fn();

        // Fire-and-forget audit log (don't block the response)
        _logAudit(action, entityType, result?.id || null, `${action} succeeded`, {
            ...metadata,
            duration_ms: Date.now() - startTime,
            status: 'success'
        });

        return result;
    } catch (error) {
        _logAudit(action, entityType, null, `${action} failed: ${error.message}`, {
            ...metadata,
            duration_ms: Date.now() - startTime,
            status: 'error',
            error_code: error.code
        });

        throw error;
    }
}

/**
 * Internal: fire-and-forget audit log to user_activity.
 * Never throws — audit failures must not crash the app.
 */
async function _logAudit(action, entityType, entityId, description, metadata) {
    try {
        await supabase.rpc('log_user_activity', {
            p_action: action,
            p_entity_type: entityType,
            p_entity_id: entityId,
            p_description: description,
            p_metadata: metadata
        });
    } catch (_) {
        // Swallow silently — audit must never block the user
    }
}
