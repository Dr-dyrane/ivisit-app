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

## 3. The "Staged Evolution" Workflow (Draft ➔ Fold ➔ Heal)
To maintain speed while preserving the **Golden Master** schema, follow this 3-step lifecycle:

- **Phase 1: The Draft (Speed)**: Create a temporary file: `migrations/YYYYMMDD_temp.sql`. Run `npx supabase db push`. Iterate quickly.
- **Phase 2: The Fold (Purity)**: Copy finalised SQL. Integrate it into the **Golden Master** (`20260218060000`). Delete the temp file.
- **Phase 3: The Healing (Standardization)**: Run `scripts\redeploy_baseline.bat` & `node scripts/sync_to_console.js`.

## 4. Documentation is Code
If you add a table or modify a core trigger:
- Update the `REFERENCE.md` inventory.
- Update the `ARCHITECTURE.md` if the fundamental data flow changes.

---
**Failure to follow these rules will result in a rejected PR. Quality is intentional.**
