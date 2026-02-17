# Pre-Dispatch Fix Backup — 2026-02-17 12:16 PM PST

## What This Backup Contains

Files backed up before applying the dispatch fix migration:

1. `20260126200000_enhanced_driver_automation.sql` — Original auto_assign_driver trigger
2. `20260217091000_rpc_v3.sql` — create_emergency_v3 RPC
3. `20260217093000_stabilization_and_notifications.sql` — Notification trigger + process_payment_with_ledger
4. `20260217103000_enhanced_notification_system.sql` — Enhanced notify_emergency_events

## Functions Being Modified

| Function | Action | Rollback |
|:---|:---|:---|
| `auto_assign_driver()` | Rewritten — uses COALESCE(profile_id, driver_id), removes provider_type filter, fires on INSERT+UPDATE with status guard | Restore from `20260126200000_enhanced_driver_automation.sql` |
| `notify_emergency_events()` | Patched — uses hospital_name instead of patient_location | Restore from `20260217103000_enhanced_notification_system.sql` |
| `create_emergency_v3()` | Patched — sets estimated_arrival, fixes payment_id linkage | Restore from `20260217091000_rpc_v3.sql` |

## Frontend Files Modified (not backed up — use git)

- `contexts/EmergencyContext.jsx` — WKB hex parsing in parsePoint()
- `ivisit-console/frontend/src/components/pages/Overview.jsx` — Status filter fix

## To Rollback

```sql
-- Run the original migration files in this backup folder
-- OR git revert the migration commit
```
