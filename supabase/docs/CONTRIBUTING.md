# 🛠️ Database Contribution Rules (The Apple Standard)

To maintain a clean, resilient, and performant database, all developers must adhere to these non-negotiable rules.

---

## 1. The Living Baseline (One File Policy)
We do **not** create a trail of tiny migration files. We maintain a single, canonical schema file.

- **Current Baseline**: `supabase/migrations/20260218060000_consolidated_schema.sql`
- **Correction over Proliferation**: If you need to fix a typo, add a column, or update a trigger, modify the **Baseline file** directly.
- **Milestones**: New migration files are only permitted for major infrastructure shifts (e.g., v2.0), subject to Senior Review.

## 2. Absolute UUID Compliance
The "UUID = TEXT" era is over. 
- All Primary Keys and Foreign Keys **must** use the `UUID` type.
- Human-readable IDs (e.g., `AMB-123456`) must live in separate `display_id` or `request_id` columns of type `TEXT`.
- **Never** perform implicit casts in your SQL functions. Use explicit types.

## 3. The "Staged Evolution" Workflow (Floating Fixes)
To maintain the **Golden Master** schema while solving complex production bugs (like RLS recursion), follow the "Floating Fix" pattern:

- **Phase 1: Diagnosis**: Use inspection tools (e.g., `inspect_profile_policies()`) to see the actual live state on remote. 
- **Phase 2: Floating Fixes**: Create standalone migration files (e.g., `20260218110000_kill_recursion.sql`). **DO NOT** fold into the baseline immediately.
- **Phase 3: Verification**: Create a test script in `docs/archive/test-scripts/` and run it against remote.
- **Phase 4: Documentation**: Record results in `docs/archive/task-verifications/`.
- **Phase 5: Consolidation**: Once 3-4 floating fixes are confirmed stable over time, fold them into the **Golden Master** (`20260218060000`) and heal the migration history.

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

---
**Standard**: All IDs are **UUID native**. Mapping to Display IDs (REQ-XXXX) is handled by triggers.
**Quality is intentional. Every fix is verified before it is baseline.**
