# Contributing to iVisit

Migration workflow, service patterns, and scalability rules for both codebases.

---

## 1. Migration Hygiene

### Rules
- **Always update the core pillar file** — never create fix migrations.
- **Delete redundant migrations** after integrating fixes.
- **Run tests** before and after schema changes.
- **Sync to console** after any migration change via `node scripts/sync_to_console.js`.

### The 11 Modules
1. `0000_infra` — Extensions, utilities
2. `0001_identity` — Profiles, preferences, medical
3. `0002_org_structure` — Hospitals, doctors
4. `0003_logistics` — Ambulances, emergency requests
5. `0004_finance` — Wallets, payments, insurance
6. `0005_ops_content` — Notifications, support, CMS
7. `0006_analytics` — Activity logs, search trends
8. `0007_security` — RLS policies, access control
9. `0008_emergency_logic` — Atomic operations
10. `0009_automations` — Cross-table hooks
11. `0100_core_rpcs` — Location services, RPCs

### Example
❌ `20260219011000_fix_display_ids.sql`
✅ Edit `20260219000100_identity.sql` directly

---

## 2. Cross-Codebase Architecture

```
┌─────────────────────────────────────────────────┐
│                 SUPABASE (Shared)                │
│  Tables · RPCs · RLS · Triggers · Edge Fns      │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│            SHARED SERVICE PATTERNS               │
│  ID Resolution · UUID Validation · Retry Logic   │
│  Batch Processing · Audit Logging · Timeout      │
│  (supabaseHelpers.js + displayIdService.js)      │
└──────────────────────┬──────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
   ivisit-app (Expo)          ivisit-console (Vite)
   Alert.alert()              toast.error()
   Redux + AsyncStorage       React local state
   Expo deep link             Browser redirect
```

### Zone 1: Must Stay in Sync
| Utility | App | Console |
|---|---|---|
| Display ID Service | `services/displayIdService.js` | `src/services/displayIdService.js` |
| Supabase Helpers | `services/supabaseHelpers.js` | `src/services/supabaseHelpers.js` |

### Zone 2: Rightfully Different
| Concern | App | Console |
|---|---|---|
| Error handling | `utils/authErrorUtils.js` | `utils/errorHandler.js` |
| Domain mapping | `utils/domainNormalize.js` | `utils/dataMappingUtils.js` |
| RBAC | RLS only | `services/rbacPatterns.js` |

### Canonical Imports
| Function | App From | Console From |
|---|---|---|
| `isValidUUID` | `displayIdService.js` | `lib/utils.js` |
| `isDisplayId` | `displayIdService.js` | `displayIdService.js` |
| `resolveEntityId` | `displayIdService.js` | `displayIdService.js` |
| `withRetry` | `supabaseHelpers.js` | `supabaseHelpers.js` |
| `withTimeout` | `supabaseHelpers.js` | `supabaseHelpers.js` |
| `batchProcess` | `supabaseHelpers.js` | `supabaseHelpers.js` |
| `subscribeToTable` | `supabaseHelpers.js` | `supabaseHelpers.js` |
| `withAudit` | `supabaseHelpers.js` | `supabaseHelpers.js` |

**Rule**: Never re-declare `isValidUUID` inline. Import from the canonical source.

---

## 3. Service Writing Patterns

### ID Handling
```javascript
// ✅ Guard before querying
const resolvedId = await resolveEntityId(id);
if (!resolvedId || !isValidUUID(resolvedId)) return null;
```

### Retry for Reads
```javascript
const data = await withRetry(() => supabase.from('hospitals').select('*'));
```

### Timeout for RPCs
```javascript
const result = await withTimeout(
    supabase.rpc('nearby_hospitals', { user_lat: lat, user_lng: lng }),
    8000, 'Hospital search timed out'
);
```

### Audit Critical Mutations
```javascript
return withAudit('emergency.create', 'emergency_request', async () => {
    const { data, error } = await supabase.rpc('create_emergency_v4', params);
    if (error) throw error;
    return data;
}, { payment_method: params.payment_method });
```

### Batch Operations
```javascript
const result = await batchProcess(hospitals, async (batch) => {
    const { error } = await supabase.from('hospitals').upsert(batch, { onConflict: 'place_id' });
    if (error) throw error;
}, { batchSize: 50, delayMs: 300 });
```

---

## 4. Retry & Batch Rules

### Retry Policy
| Scenario | Retry? | Why |
|---|---|---|
| `SELECT` / reads | ✅ 3x | Idempotent |
| `INSERT` / mutations | ⚠️ 2x | Only with `ON CONFLICT` |
| Atomic RPCs | ⚠️ 2x | Check if already created |
| Auth operations | ❌ No | Fail fast |

### Batch Sizing
| Context | Batch Size | Delay |
|---|---|---|
| Reads | 100-200 | 100ms |
| Writes | 25-50 | 200-500ms |
| Edge Functions | 10-25 | 500ms |

---

## 5. Realtime Rules
- **Always unsubscribe** on unmount/navigation.
- **Filter aggressively** — never subscribe to a whole table.
- **Debounce** location pings (max 1 per 3s).
- **Fallback to polling** after 3 reconnect failures.

---

## 6. Audit Levels

| Level | Logs To | Retention |
|---|---|---|
| System Audit | `admin_audit_log` | Permanent |
| User Activity | `user_activity` | 90 days |
| Financial | `wallet_ledger` | Permanent |
| Errors | Application logs | 30 days |

---

## 7. Anti-Patterns

| ❌ Don't | ✅ Do |
|---|---|
| Retry auth failures | Fail fast, show login prompt |
| `SELECT *` without `.limit()` | Always paginate |
| Subscribe to entire table | Filter by `user_id` or `id` |
| Audit synchronously in hot paths | Fire-and-forget |
| Inline UUID regex | Import from canonical source |
| Create fix migration files | Edit the pillar file directly |

---

## 8. Sync Discipline

| What | How | Auto? |
|---|---|---|
| Migrations | `scripts/sync_to_console.js` | ✅ |
| Docs | `scripts/sync_to_console.js` | ✅ |
| Types | `scripts/sync_to_console.js` | ✅ |
| Zone 1 services | Manual copy | ❌ |
| Zone 2/3 | Independent | N/A |

---

## 9. Scalability Checklist
- [ ] All queries use indexed columns (`id`, `user_id`, `display_id`, `status`)
- [ ] Geospatial queries use PostGIS spatial indexes
- [ ] `SECURITY DEFINER` bypasses RLS for internal logic
- [ ] Triggers are lightweight (no HTTP, no heavy joins)
- [ ] `wallet_ledger` is append-only (never UPDATE/DELETE)
- [ ] All reads use `withRetry`
- [ ] All mutations validate UUIDs before querying
- [ ] Subscriptions scoped to specific records
- [ ] Financial ops log to `wallet_ledger` synchronously

---
*Standardized — February 19, 2026*
