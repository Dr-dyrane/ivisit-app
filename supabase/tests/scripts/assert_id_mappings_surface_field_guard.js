#!/usr/bin/env node

const { runSurfaceGuard } = require('./assert_table_surface_field_guard_core');

runSurfaceGuard({
  tableName: 'id_mappings',
  reportFileName: 'id_mappings_surface_field_guard_report.json',
  logPrefix: 'id-mappings-surface-field-guard',
  requiredRelationships: [],
  allowedReferencers: ['src/types/database.ts'],
  allowedMutationOwners: [],
});
