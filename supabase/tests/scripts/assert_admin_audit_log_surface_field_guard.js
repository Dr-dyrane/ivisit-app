#!/usr/bin/env node

const { runSurfaceGuard } = require('./assert_table_surface_field_guard_core');

runSurfaceGuard({
  tableName: 'admin_audit_log',
  reportFileName: 'admin_audit_log_surface_field_guard_report.json',
  logPrefix: 'admin-audit-log-surface-field-guard',
  requiredRelationships: ['admin_audit_log_admin_id_fkey'],
  allowedReferencers: ['src/types/database.ts', 'src/services/adminService.js'],
  allowedMutationOwners: ['src/services/adminService.js'],
});
