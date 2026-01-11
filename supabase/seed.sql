-- Seed data entrypoint for Supabase CLI
--
-- This file is referenced by supabase/config.toml:
--   [db.seed]
--   sql_paths = ["./seed.sql"]
--
-- It should be safe to re-run. Use idempotent inserts where possible.

-- Load richer public demo data.
\ir ./migrations/20260110000000_seed_rich_public_data.sql
