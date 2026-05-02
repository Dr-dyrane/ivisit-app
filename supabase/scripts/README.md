# Supabase Scripts

Operational scripts for direct database tasks, seeding, and exports.
Do not duplicate scripts — check here first.

## Scripts Index

| Script | Purpose | When to use |
|---|---|---|
| `add_test_subscriber.js` | Insert a single subscriber for testing | One-off email/trigger testing |
| `add_subscriber_batch.js` | Batch insert multiple subscribers | Adding a list of emails |
| `export_subscribers_csv.js` | Export subscriber emails to comma-separated CSV | Google Contacts / email marketing import |
| `send_test_custom_email.js` | Send a single custom email via edge function | Testing `sendCustomEmail` |
| `cleanup_demo_orphans.js` | Purge stale demo hospitals, orgs, and related data | After demo bootstrap changes |
| `sync_to_console.js` | Sync migrations, docs, and types to `ivisit-console` | After schema/docs updates |
| `audit_demo_coverage.js` | Audit demo hospital coverage by region | Demo coverage analysis |
| `dedupe_demo_hospitals.js` | Remove duplicate demo hospitals by place_id | Data hygiene |
| `backfill_hospital_media.js` | Backfill hospital media URLs | After media updates |
| `apply_live_fixes.sql` | Emergency live SQL patches | Production hotfixes only |
| `generate_schema_snapshot.js` | Generate schema snapshot markdown | Documentation |
| `generate_api_reference.js` | Generate API reference docs | Documentation |
| `data_import_fixed.js` | Import hospital data from CSV/JSON | Bulk data import |
| `seed_platform.sql` | Seed initial platform data | Fresh environment setup |

## Usage

All scripts require `.env.local` with:
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=
```

Run from repo root:
```bash
node supabase/scripts/<script-name>
```

## Sync to Console

After adding/updating scripts, sync to `ivisit-console`:
```bash
node supabase/scripts/sync_to_console.js
```
