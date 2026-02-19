# 🏯 Ground Zero Architecture (v2026.02.18)

> **Status**: Active & Standardized
> **Identity Law**: Strict UUID-Native
> **Presentation Law**: Display ID Mapping

## 1. Internal Identity: UUID Native
The internal "Hardware" of the database operates exclusively on `UUID`. 
- **Type Safety**: No more `UUID = TEXT` errors. 
- **Performance**: Native indexing on fixed-width types.
- **Integrity**: Referential constraints are strictly enforced at the database level.

## 2. External Identity: Display ID Mapping
Users and developers interact with alphanumeric strings (e.g., `REQ-887213`).

### The Mapping Registry (`id_mappings`)
Every system entity has a persistent entry in the central registry.
- **Mapping**: `entity_id` (UUID) ↔ `display_id` (TEXT).
- **Automation**: The trigger `stamp_entity_display_id` ensures that on every `INSERT`:
  1. A random 6-digit Display ID is generated.
  2. The record is "stamped" with the ID.
  3. The association is registered in `id_mappings`.

## 3. Data Flow Standards
- **APIs**: Always return the `display_id` for UI display, but accept/track the `id` (UUID) for data mutations.
- **Console**: Uses the `id_mappings` registry to resolve user input (like searching for a Request ID) into the internal UUID.

## 4. Maintenance (Living Baseline)
We maintain a **Consolidated Baseline** (`20260218060000`). If the schema needs adjustment, the Baseline is modified directly and redeployed using the Repair Workflow.

## 5. Consolidation Strategy

### Ground Zero Consolidation Principle
The iVisit system follows a "Ground Zero" consolidation approach where:
- **Single Source of Truth**: One consolidated schema file
- **Floating Fixes**: Temporary migrations for production issues
- **Staged Evolution**: Complex changes deployed in phases
- **Nuclear De-Recursion**: RLS fixes using SECURITY DEFINER functions

### Consolidation Workflow
1. **Development**: Create floating migrations for fixes
2. **Testing**: Verify fixes with comprehensive testing
3. **Staging**: Deploy to staging environment
4. **Consolidation**: Merge stable fixes into consolidated schema
5. **Archival**: Move old migrations to archive

### Consolidation Process
1. **Verification Phase**
   ```bash
   # Test all floating fixes
   node docs/archive/test-scripts/runners/suite-runner.js
   
   # Verify error handling
   node docs/archive/test-scripts/runners/consolidation-runner.js
   ```

2. **Consolidation Phase**
   ```sql
   -- Create consolidation migration
   -- Merge verified fixes into consolidated schema
   -- Update master schema file
   ```

3. **Archival Phase**
   ```bash
   # Archive old migrations
   mkdir supabase/migrations/archive/
   mv supabase/migrations/20260218_*.sql supabase/migrations/archive/
   ```

### Error Management Architecture
- **Centralized Logging**: All errors logged to `supabase/errors/`
- **Structured Classification**: Database, Test, RPC, RLS, Trigger categories
- **Pattern Analysis**: Automated error pattern detection
- **Debugging Support**: Enhanced error readability and resolution guidance

---
*Architected for clarity, scale, and clinical precision.*
