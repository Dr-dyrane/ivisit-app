# Legacy Intent Manifesto

## 🏯 Purpose
This archive preserves the **Intent** and **Logic Patterns** of the system's previous "Costly Implementation" phase. We are not using the code for production, but we keep it here to ensure we don't lose the business rules, seed data, and trigger logic we worked hard to define.

## 📂 Reference Catalog
The following files are stored in `supabase/docs/archive/legacy-references/`:

### 1. The Monoliths
- `20260218060000_consolidated_schema.sql`: The primary reference for the original 100+ table schema. Use this to lookup old table relationships and field names.
- `LEGACY_PUSH_LOG_REFERENCE.log`: The raw Supabase CLI push log. Contains every SQL command actually sent to the server during the Ground Zero phase.

### 2. Logic Engines (Triggers & RPCs)
- `20260219012623_display_id_triggers.sql`: Original implementation of Display ID stamping.
- `20260219012714_rls_policies.sql`: Original complex RLS implementation.
- `20260219012737_emergency_functions.sql`: Original multi-step Emergency lifecycle functions (v1-v3).

### 3. Data Seed Intent
- `HOSPITAL_SEED_INTENT.sql`: Snapshot of the rich hospital data we seeding (City General, St. Mary's, etc).
- `NEWS_SEED_INTENT.sql`: Snapshot of the news data used for the health dashboard.

## ⚠️ Usage Rule
Do **NOT** copy-paste directly from these files. The current system uses **Modular UUID-Native** architecture. These files are maps, NOT the destination.

---
*Locked for Reference Only*
