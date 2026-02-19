---
description: how to update the database schema using the Staged Evolution workflow
---

# Database Schema Update Workflow (Staged Evolution)

## Key Principle: NEVER modify existing migration files after they've been pushed. Always create NEW files.

## Steps

### 1. Create a new migration file
// turbo
```bash
# From the ivisit-app root
# Name format: YYYYMMDDHHMMSS_description.sql
# Timestamp must be AFTER the last migration file
```
Create a new `.sql` file in `supabase/migrations/` with a timestamp later than all existing files.

### 2. Write idempotent SQL
All statements must be safe to re-run:
- `CREATE TABLE IF NOT EXISTS` for new tables
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` for new columns
- `CREATE OR REPLACE FUNCTION` for functions
- `DROP TRIGGER IF EXISTS` before `CREATE TRIGGER`
- `CREATE INDEX IF NOT EXISTS` for indexes
- `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` for constraints

### 3. Push to remote (NO DATA LOSS)
// turbo
```bash
npx supabase db push --linked
```
This only applies NEW migration files. Existing data is preserved.
Answer `Y` when prompted.

### 4. Sync to ivisit-console
// turbo
```bash
Copy-Item "supabase\migrations\<filename>.sql" "c:\Users\Dyrane\Documents\GitHub\ivisit-console\frontend\supabase\migrations\<filename>.sql" -Force
```

### 5. Update TypeScript types (optional)
// turbo
```bash
npx supabase gen types typescript --linked > supabase/database.ts
```

## When to use `db reset --linked` (RARE)
Only use reset when:
- Migration files have been REORDERED or RENAMED
- You need to fix a SYNTAX ERROR in a migration that was already applied
- You're doing a full Ground Zero rebuild

**WARNING:** `db reset --linked` destroys ALL data. There is no backup mechanism.

## Commands Reference
| Command | Data Safe? | Use Case |
|---|---|---|
| `npx supabase db push --linked` | ✅ YES | Apply new migrations incrementally |
| `npx supabase db reset --linked` | ❌ NO | Full rebuild from scratch |
| `npx supabase gen types typescript --linked` | ✅ YES | Regenerate TypeScript types |
