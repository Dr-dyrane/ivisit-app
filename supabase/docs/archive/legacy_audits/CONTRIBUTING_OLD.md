# 🛠️ Database Contribution Rules (The Apple Standard)

To maintain a clean, resilient, and performant database, all developers must adhere to these non-negotiable rules.

---

## 1. The Living Blueprint (The 12 Core Pillars)
We do **not** tolerate migration bloating (hundreds of tiny files). We maintain a modular set of 12 (currently 11) core migration files that represent the system's architecture.

- **Current Architecture**: 
  - `0000_infra` (Extensions, Enums)
  - `0001_identity` (Profiles, RBAC)
  - `0002_org_structure` (Orgs, Hospitals, Doctors)
  - `0003_logistics` (Visits, Fleet)
  - `0004_finance` (Wallets, Ledger)
  - `0005_ops_content` (Support, News)
  - `0006_analytics` (History, Trends)
  - `0007_security` (RLS Policies)
  - `0008_emergency_logic` (Dispatches)
  - `0009_automations` (Triggers)
  - `0100_core_rpcs` (API Functions)
- **Correction over Proliferation**: If you need to fix logic, add a column, or update a trigger, modify the **relevant Pillar file** directly.
- **New Tables**: Only create a new migration file when adding a new feature/table that **literally does not fit** into any of the existing 12 categories.

## 2. Absolute UUID Compliance
The "UUID = TEXT" era is over. 
- All Primary Keys and Foreign Keys **must** use the `UUID` type.
- Human-readable IDs (e.g., `AMB-123456`) are **Display IDs** and must live in separate `display_id` columns.
- **Never** perform implicit casts in your SQL/RPC functions. Use explicit Types.

## 3. The "Staged Evolution" Workflow
To maintain a clean schema while shipping fast, follow this cycle:

1. **Fix In-Place**: Identify the pillar file relevant to your change.
2. **Apply Local**: Apply the fix SQL directly to your local database or the core file.
3. **Verify with Test Scripts**: Use scripts in `docs/archive/test-scripts/` to confirm the logic works (RLS, Triggers, etc.).
4. **Confirm UI**: Verify the change resolves the frontend issue (e.g., no more UUID syntax errors).
5. **Commit SQL Codes**: Once confirmed, the SQL code is permanently added/updated in the main Pillar migration file.

## 4. The "Nuclear De-Recursion" Standard
When fixing RLS Infinite Recursion:
- **Rule**: Never use `SELECT FROM table_name` directly in a policy.
- **Pattern**: Use a `SECURITY DEFINER` helper function:
  ```sql
  CREATE OR REPLACE FUNCTION public.get_current_user_role() 
  RETURNS text SECURITY DEFINER AS $$ ... $$;
  ```
- **Execution**: Apply the fix in a floating file, verify with `test-recursion-fix.js`, and document the "Ghost Policies" killed.

## 5. Documentation & Verification Repo
Every major fix must leave a trail:
- **Test Script**: `docs/archive/test-scripts/test-[task-name].js`
- **Verification Report**: `docs/archive/task-verifications/[task-name]-verification.md`
- **Reference Updated**: `docs/REFERENCE.md` if schema changed.

## 5. Consolidation Guidelines

### When to Consolidate
Consolidate floating fixes when:
- **3-4 floating fixes** are confirmed stable in production
- **Major feature releases** are planned
- **Migration history** becomes complex (>10 migrations)
- **Performance issues** detected from migration chain

### Consolidation Process
1. **Verification Phase**
   ```bash
   # Test all floating fixes
   node docs/archive/test-scripts/runners/suite-runner.js
   
   # Verify error handling
   node docs/archive/test-scripts/runners/consolidation-runner.js
   ```

2. **Consolidation Phase**
   ```sql
   -- Create consolidation migration
   -- Merge verified fixes into consolidated schema
   -- Update master schema file
   ```

3. **Archival Phase**
   ```bash
   # Archive old migrations
   mkdir supabase/migrations/archive/
   mv supabase/migrations/20260218_*.sql supabase/migrations/archive/
   ```

### Consolidation Risk Management
- **Phase-based deployment**: Deploy by risk level (low → medium → high)
- **Rollback procedures**: Backup and revert capabilities
- **Testing requirements**: Comprehensive verification before consolidation
- **Documentation updates**: Update all relevant documentation

## 6. Error Management Guidelines

### Error Directory Structure
```
supabase/errors/
├── consolidation/         # Consolidation-specific errors
├── testing/              # Test execution errors
├── migration/            # Migration execution errors
├── patterns/             # Error pattern analysis
└── archive/               # Historical error logs
```

### Error Logging Standards
- **Never log errors to project root** - use `supabase/errors/`
- **Always categorize errors** - use structured classification
- **Include resolution suggestions** - provide debugging guidance
- **Archive error patterns** - maintain historical reference

### Error Classification System
- **DATABASE**: Connection, query, constraint, permission errors
- **RPC**: Function execution, parameter validation errors
- **RLS**: Row level security, policy errors
- **TRIGGER**: Trigger execution, dependency errors
- **TEST**: Assertion, validation, timeout errors
- **CONSOLIDATION**: Migration, conflict, dependency errors

---
**Standard**: All IDs are **UUID native**. Mapping to Display IDs (REQ-XXXX) is handled by triggers.
**Quality is intentional. Every fix is verified before it is baseline.**
