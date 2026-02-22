# Contributing to iVisit.

Migration workflow, service patterns, and scalability rules for both codebases.

---

## 1. Migration Hygiene

### Rules
- **Always update the core pillar file** — never create fix migrations.
- **Delete redundant migrations** after integrating fixes.
- **Run tests** before and after schema changes.
- **Sync to console** after any migration change via `node supabase/scripts/sync_to_console.js`.
- **Repair Remote History** — After deleting local fix migrations, use `npx supabase migration repair --status reverted <timestamp>` to untrack them from the remote database history without affecting data.

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

### **Rule: Silent Guarding (UX Rule)**
Frontend services for restricted modules (Analytics, Activity, Admin, Finance) **MUST** include a client-side role check (Guard) to return empty/neutral states instantly if the user lacks the required role.
- **Why**: Prevents `400 Bad Request` log spam in the browser console.
- **Pattern**: `if (user?.role === 'patient') return [];`

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

## 10. Testing & Fix Strategy

### **Testing Framework**
- **Task-based validation** with clear objectives
- **JavaScript test runner** with error handling
- **Automated fix generation** for common issues
- **Comprehensive reporting** with JSON output

### **Fix Strategy Workflow**
1. **Create Test/Fix SQL** - When we need to validate or fix something
2. **Run the Test** - Execute the specific test/fix
3. **Verify Success** - Confirm the fix works
4. **Update Core Migration** - Integrate successful fix into core pillar
5. **Delete Test SQL** - Remove the temporary test/fix file.
6. **Repair History** - Use `migration repair --status reverted` to clean the remote migration log for the deleted files.
7. **Run Final Validation** - Confirm everything works with the consolidated core migration.

### **🔄 Test/Fix Lifecycle**
```
Test SQL → Test → Verify → Update Core Migration → Delete Test SQL → Repair History → Final Validation
     ↑           ↑          ↑                ↑              ↑                ↑                ↑
   Temporary   Temporary   Temporary        Permanent      Temporary        Internal         Permanent
```

### **Error Classification**
| Type | Impact | Action |
|---|---|---|
| **Critical** | Blocks deployment | Immediate fix required |
| **Warning** | Fix required | Schedule for next deployment |
| **Info** | Monitor only | Document and track patterns |

### **Fix Categories**
- **Schema Fixes** - Missing tables, columns, functions
- **Function Fixes** - RPC function corrections
- **Security Fixes** - RLS policy updates
- **Performance Fixes** - Index additions, query optimization

### **Testing Commands**
```bash
# Run comprehensive system test
node supabase/tests/scripts/test_runner.js comprehensive_system

# Run specific task test
node supabase/tests/scripts/test_runner.js [task_name]

# Apply fixes from error_fixes.sql
# (Manual execution or automated via test runner)
```

### **Success Criteria**
- **100% test pass rate** required for production
- **No critical errors** allowed
- **All modules deployed** and functional
- **Console sync** completed successfully

---

## 11. Cross-Pillar Dependencies & RPC Index

### **🔗 Cross-Pillar Dependencies**

#### **Payment Processing Flow**
- **Finance Pillar**: `process_wallet_payment()` 
- **Emergency Logic Pillar**: `process_cash_payment_v2()`, `approve_cash_payment()`, `decline_cash_payment()`
- **Security Pillar**: `p_is_admin()`, `p_get_current_org_id()`
- **Core RPCs Pillar**: Location services, admin functions, analytics

#### **User Management Flow**
- **Security Pillar**: `delete_user_by_admin()`, `update_profile_by_admin()`, `search_auth_users()`
- **Core RPCs Pillar**: `delete_user()`, `update_profile_by_admin()`, `search_auth_users()`

#### **Location Services**
- **Core RPCs Pillar**: `nearby_hospitals()`, `nearby_ambulances()`

### **📋 RPC Function Index**

| Function | Location | Purpose | Used By |
|---|---|---|---|
| `process_wallet_payment()` | Finance | Process wallet payments | paymentService.js |
| `process_cash_payment_v2()` | Emergency Logic | Process manual cash payments | paymentService.js |
| `approve_cash_payment()` | Emergency Logic | Approve cash payments | paymentService.js |
| `decline_cash_payment()` | Emergency Logic | Decline cash payments | paymentService.js |
| `nearby_hospitals()` | Core RPCs | Find nearby hospitals | discoveryService.js |
| `nearby_ambulances()` | Core RPCs | Find nearby ambulances | discoveryService.js |
| `p_is_admin()` | Security | Check admin permissions | profilesService.js |
| `delete_user_by_admin()` | Core RPCs | Admin delete user | console profilesService.js |
| `update_profile_by_admin()` | Core RPCs | Admin update profile | console profilesService.js |
| `search_auth_users()` | Core RPCs | Search auth users | console profilesService.js |

### **🏗️ Pillar Responsibilities**

#### **0000_infra** - Infrastructure & Utilities
- Database extensions and utility functions
- Schema management helpers

#### **0001_identity** - Identity & Profiles  
- User profile management
- Authentication and authorization
- Medical profile data

#### **0002_org_structure** - Organizations & Hospitals
- Hospital and organization management
- Doctor and staff management
- Facility data and services

#### **0003_logistics** - Logistics & Emergency
- Emergency request management
- Ambulance tracking and dispatch
- Visit and routing logic

#### **0004_finance** - Financial Services
- Wallet management (patient, organization)
- Payment processing (wallet, cash, insurance)
- Transaction history and billing

#### **0005_ops_content** - Operations & Content
- Notifications and messaging
- Support ticket management
- Content management system

#### **0006_analytics** - Analytics & Reporting
- User activity tracking
- Search analytics and trends
- Performance metrics and reporting

#### **0007_security** - Security & Access Control
- Row Level Security (RLS) policies
- User permissions and roles
- Authentication security helpers

### **The RBAC Consolidation Rule**
Avoid hardcoding role strings (e.g., `IF role IN ('admin', 'viewer')...`) inside individual RPCs.
- **Do**: Create a centralized helper in `0007_security.sql` (e.g., `public.p_is_console_allowed()`).
- **Why**: Ensures authorization logic is DRY and evolves without multi-file refactoring.

#### **0008_emergency_logic** - Emergency Business Logic
- Emergency cost calculation
- Resource allocation and assignment
- Emergency workflow automation

#### **0009_automations** - Data Synchronization
- Cross-table triggers and hooks
- Data consistency enforcement
- Automated workflows and business rules

#### **0100_core_rpcs** - External API Gateway
- Location-based discovery services
- Administrative management functions
- Analytics and reporting APIs
- External system integrations

---

*Standardized — February 19, 2026*
