---
description: how to update the database schema using the Staged Evolution workflow
---

# 🗄️ Database Update Workflow

Follow these steps EXACTLY when modifying the database schema to prevent desync and visual debt.

## 1. Create a Draft
- Create a temporary migration file: `supabase/migrations/<TIMESTAMP>_temp_patch.sql`.
- Add your surgical changes (new tables, functions, or column tweaks).
- Run `npx supabase db push` to test against the live remote database.

## 2. Verify in UI
- Ensure the application or console recognizes the change.
- Perform any necessary frontend type updates using `node scripts/sync_to_console.js`.

## 3. Fold into Golden Master
- Once verified, COPY the SQL from your temp patch.
- OPEN the Golden Master: `supabase/migrations/20260218060000_consolidated_schema.sql`.
- INTEGRATE the SQL into its logical place (or append to the final block).
- DELETE the temporary `.sql` file.

## 4. Heal the System
- Run `scripts\redeploy_baseline.bat`. This resets the remote migration history to point exclusively to the Golden Master.
- Run `node scripts/sync_to_console.js` to ensure the console and types are perfectly aligned.

## 5. Commit
- Commit the updated Golden Master and documentation.
- **NEVER** commit temporary patch files to Git.
