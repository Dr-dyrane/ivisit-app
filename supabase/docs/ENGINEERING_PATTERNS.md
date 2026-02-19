# 🏗️ Engineering Patterns & Scalability Guide

Best practices for retry logic, bulk operations, streaming, audit, and scalability across the iVisit platform.

---

## 1. Retry Logic

### 1.1 The Problem
Supabase calls fail — bad networks, cold starts, rate limits, RLS timeouts. Silent failures are unacceptable.

### 1.2 Standard Retry Utility
```javascript
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
            const result = await fn();
            return result;
        } catch (error) {
            lastError = error;
            if (attempt === maxRetries || !shouldRetry(error)) {
                throw error;
            }
            const delay = baseDelayMs * Math.pow(2, attempt - 1);
            const jitter = Math.random() * delay * 0.3;
            await new Promise(r => setTimeout(r, delay + jitter));
            console.warn(`[Retry] Attempt ${attempt}/${maxRetries} failed, retrying in ${Math.round(delay + jitter)}ms...`);
        }
    }
    throw lastError;
}

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
```

### 1.3 Usage Patterns
```javascript
// Service-level: wrap critical operations
async getById(id) {
    return withRetry(async () => {
        const { data, error } = await supabase
            .from('hospitals')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    });
}

// RPC calls: wrap with context
async createEmergency(params) {
    return withRetry(
        () => supabase.rpc('create_emergency_v4', params),
        { maxRetries: 2, baseDelayMs: 1000 }  // Fewer retries for mutations
    );
}
```

### 1.4 Rules
| Scenario | Retry? | Why |
|---|---|---|
| `SELECT` / `GET` queries | ✅ Yes (3x) | Idempotent, safe to repeat |
| `INSERT` / mutations | ⚠️ Yes (2x) | Only if idempotent (use `ON CONFLICT`) |
| Atomic RPCs (`create_emergency_v4`) | ⚠️ Cautious (2x) | Check if the record was already created |
| Auth operations | ❌ No | User-facing, should fail fast |
| File uploads | ✅ Yes (3x) | Network-sensitive |

---

## 2. Bulk Insert & Batch Operations

### 2.1 The Problem
Importing hospitals, seeding data, or processing queues requires inserting many rows efficiently without hitting Supabase limits.

### 2.2 Standard Batch Utility
```javascript
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
```

### 2.3 Usage Patterns
```javascript
// Bulk hospital import
const hospitals = [...]; // 500 hospitals from CSV
const result = await batchProcess(
    hospitals,
    async (batch) => {
        const { error } = await supabase
            .from('hospitals')
            .upsert(batch, { onConflict: 'place_id' });  // Idempotent!
        if (error) throw error;
    },
    {
        batchSize: 50,
        delayMs: 300,
        onProgress: (done, total) => console.log(`${done}/${total} hospitals imported`)
    }
);
console.log(`✅ ${result.succeeded} imported, ❌ ${result.failed} failed`);
```

### 2.4 Rules
| Setting | Reads | Writes | Edge Functions |
|---|---|---|---|
| Batch size | 100-200 | 25-50 | 10-25 |
| Delay between | 100ms | 200-500ms | 500ms |
| Use `upsert`? | N/A | ✅ Always when possible | ✅ Yes |
| Use `ON CONFLICT`? | N/A | ✅ Prevents duplicates | ✅ Yes |

---

## 3. Realtime Streaming & Subscriptions

### 3.1 The Problem
Emergency tracking, ambulance locations, and dispatch updates require live data without polling.

### 3.2 Standard Subscription Pattern
```javascript
/**
 * Create a managed Supabase realtime subscription with auto-cleanup.
 *
 * @param {string}   table     - Table to subscribe to
 * @param {string}   event     - 'INSERT' | 'UPDATE' | 'DELETE' | '*'
 * @param {Function} callback  - Handler for each event
 * @param {Object}   filter    - Column filter (e.g., { column: 'user_id', value: userId })
 * @returns {{ unsubscribe: Function }}
 */
export function subscribeToTable(table, event, callback, filter = null) {
    let channel = supabase
        .channel(`${table}_${event}_${Date.now()}`)
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
        .subscribe();

    return {
        unsubscribe: () => {
            supabase.removeChannel(channel);
        }
    };
}
```

### 3.3 Usage Patterns
```javascript
// Track emergency request status changes (React Native)
useEffect(() => {
    if (!requestId) return;
    
    const { unsubscribe } = subscribeToTable(
        'emergency_requests',
        'UPDATE',
        (newRow, oldRow) => {
            setRequest(prev => ({ ...prev, status: newRow.status }));
            
            if (newRow.status === 'arrived') {
                hapticService.notificationSuccess();
            }
        },
        { column: 'id', value: requestId }
    );
    
    return unsubscribe; // Cleanup on unmount
}, [requestId]);

// Live ambulance location tracking
useEffect(() => {
    const { unsubscribe } = subscribeToTable(
        'ambulances',
        'UPDATE',
        (newRow) => {
            updateMarkerPosition(newRow.id, newRow.location);
        },
        { column: 'status', value: 'on_trip' }
    );
    return unsubscribe;
}, []);
```

### 3.4 Rules
- **Always unsubscribe** on component unmount or navigation away.
- **Filter aggressively** — never subscribe to an entire table without a column filter.
- **Debounce updates** if the UI can't keep up (e.g., location pings every 2s).
- **Fallback to polling** if realtime connection drops after 3 reconnect attempts.

---

## 4. Audit & Observability

### 4.1 The Problem
When something goes wrong in production, you need to know what happened, when, and who did it.

### 4.2 Audit Levels

| Level | What | Where | Retention |
|---|---|---|---|
| **System Audit** | Schema changes, RPC calls | `admin_audit_log` | Permanent |
| **User Activity** | Actions, navigation, searches | `user_activity` | 90 days |
| **Financial Audit** | Payments, wallet mutations | `wallet_ledger` | Permanent |
| **Error Tracking** | Failed operations, retries | Application logs | 30 days |

### 4.3 Standard Audit Wrapper
```javascript
/**
 * Wrap a service call with automatic audit logging.
 * Logs success/failure to user_activity without blocking the main operation.
 *
 * @param {string}   action     - Action name (e.g., 'emergency.create')
 * @param {string}   entityType - Entity type (e.g., 'emergency_request')
 * @param {Function} fn         - The actual operation
 * @param {Object}   metadata   - Extra context to log
 */
export async function withAudit(action, entityType, fn, metadata = {}) {
    const startTime = Date.now();
    try {
        const result = await fn();
        
        // Fire-and-forget audit log (don't block the response)
        logActivity(action, entityType, result?.id, `${action} succeeded`, {
            ...metadata,
            duration_ms: Date.now() - startTime,
            status: 'success'
        }).catch(() => {}); // Never let audit logging crash the app
        
        return result;
    } catch (error) {
        logActivity(action, entityType, null, `${action} failed: ${error.message}`, {
            ...metadata,
            duration_ms: Date.now() - startTime,
            status: 'error',
            error_code: error.code
        }).catch(() => {});
        
        throw error;
    }
}
```

### 4.4 Usage
```javascript
// Audited emergency creation
async create(request) {
    return withAudit('emergency.create', 'emergency_request', async () => {
        const result = await supabase.rpc('create_emergency_v4', params);
        if (result.error) throw result.error;
        return result.data;
    }, { hospital_id: request.hospitalId, payment_method: request.paymentMethod });
}
```

---

## 5. Scalability Checklist

### 5.1 Database Layer
- [ ] All queries use indexed columns (`id`, `user_id`, `display_id`, `status`)
- [ ] Geospatial queries use PostGIS spatial indexes
- [ ] `SECURITY DEFINER` functions bypass RLS for internal logic
- [ ] Triggers are lightweight (no HTTP calls, no heavy joins)
- [ ] `wallet_ledger` is append-only (never UPDATE, never DELETE)

### 5.2 Service Layer
- [ ] All reads use `withRetry` for transient failure resilience
- [ ] All mutations validate UUIDs before sending to database
- [ ] Bulk operations use `batchProcess` with rate limiting
- [ ] Display ID resolution is cached client-side where possible
- [ ] Error messages never expose internal UUIDs to users

### 5.3 Realtime Layer
- [ ] Subscriptions are scoped to specific records (never `*` on a whole table)
- [ ] Cleanup functions are called on every unmount/navigation
- [ ] Polling fallback exists for critical flows (emergency tracking)
- [ ] Location updates are throttled to max 1 per 3 seconds

### 5.4 Observability
- [ ] Every mutation logs to `user_activity` (fire-and-forget)
- [ ] Financial operations log to `wallet_ledger` (synchronous, mandatory)
- [ ] Failed retries include attempt count and final error in logs
- [ ] Admin actions log to `admin_audit_log` with operator identity

---

## 6. Anti-Patterns (Do NOT)

| ❌ Anti-Pattern | ✅ Correct Approach |
|---|---|
| Retry auth failures | Fail fast, show login prompt |
| `SELECT *` on large tables without limit | Always use `.limit()` or pagination |
| Subscribe to entire table | Filter by `user_id` or `id` |
| Log audit synchronously in hot paths | Fire-and-forget with `.catch(() => {})` |
| Hardcode batch sizes | Use configurable defaults from this guide |
| Silent `catch` blocks | Always log the error context before swallowing |
| Retry non-idempotent mutations blindly | Use `upsert` / `ON CONFLICT` or check-before-retry |

---
*Standardized — February 18, 2026*
