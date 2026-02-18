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

## 3. Workflow for Schema Changes
1. **Local Dev**: Modify the SQL inside the Baseline file.
2. **Local Test**: `npx supabase db reset` to ensure the baseline builds from scratch without errors.
3. **Remote Redeploy**: 
   ```bash
   npx supabase migration repair --status reverted 20260218060000
   npx supabase db push
   ```
4. **Sync**: Run `node scripts/sync_to_console.js` to align the console team instantly.

## 4. Documentation is Code
If you add a table or modify a core trigger:
- Update the `REFERENCE.md` inventory.
- Update the `ARCHITECTURE.md` if the fundamental data flow changes.

---
**Failure to follow these rules will result in a rejected PR. Quality is intentional.**
