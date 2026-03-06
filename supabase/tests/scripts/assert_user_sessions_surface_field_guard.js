#!/usr/bin/env node

const { runSurfaceGuard } = require('./assert_table_surface_field_guard_core');

runSurfaceGuard({
  tableName: 'user_sessions',
  reportFileName: 'user_sessions_surface_field_guard_report.json',
  logPrefix: 'user-sessions-surface-field-guard',
  requiredRelationships: ['user_sessions_user_id_fkey'],
  allowedReferencers: ['src/types/database.ts', 'src/services/adminService.js'],
  allowedMutationOwners: [],
});
