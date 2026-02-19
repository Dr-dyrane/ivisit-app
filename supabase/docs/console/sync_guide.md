# Console Sync Guide

This guide outlines the process for synchronizing local schema changes to the Supabase console and maintaining consistency between environments.

## 🎯 **Overview**

The console sync process ensures that:
- Local schema changes are reflected in the Supabase console
- API reference documentation stays current
- Schema snapshots are up to date
- All environments remain consistent

## 🔄 **Sync Process**

### **When to Sync**
- **After schema changes**: Any migration updates
- **After function additions**: New RPC functions
- **After policy changes**: RLS policy modifications
- **After major fixes**: Critical error resolutions
- **Before deployment**: Production deployment preparation

### **Sync Checklist**
- [ ] All migrations deployed successfully
- [ ] Comprehensive tests pass (100% success rate)
- [ ] No critical errors in validation
- [ ] Console documentation updated
- [ ] API reference refreshed
- [ ] Schema snapshot updated

## 📋 **Step-by-Step Sync**

### **Step 1: Validate Local Changes**
```bash
# Run comprehensive test suite
node supabase/tests/scripts/test_runner.js comprehensive_system

# Verify migration status
npx supabase migration list

# Check for any errors
cat supabase/tests/validation/error_log.json
```

### **Step 2: Deploy Migrations**
```bash
# Deploy all pending migrations
npx supabase db push

# Include all changes if needed
npx supabase db push --include-all

# Repair migration history if needed
npx supabase migration repair --status reverted [migration_id]
```

### **Step 3: Update Console Documentation**

#### **API Reference Update**
```bash
# Generate new API reference
node supabase/scripts/generate_api_reference.js

# Update console documentation
cp supabase/docs/api_reference.json supabase/docs/console/api_reference.json
```

#### **Schema Snapshot Update**
```bash
# Generate current schema snapshot
npx supabase db diff --schema public > supabase/docs/console/schema_snapshot.json

# Or use automated script
node supabase/scripts/generate_schema_snapshot.js
```

### **Step 4: Validate Console Sync**
```bash
# Test console API endpoints
curl -X POST "https://your-project.supabase.co/functions/v1/discover-hospitals" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"lat": 40.7128, "lng": -74.0060, "radius": 10}'

# Verify schema in console
# Check Supabase dashboard > Database > Tables
```

### **Step 5: Final Validation**
```bash
# Run final comprehensive test
node supabase/tests/scripts/test_runner.js comprehensive_system

# Verify 100% success rate
# Check for any remaining errors
```

## 📊 **Console Documentation Files**

### **api_reference.json**
Contains complete API reference for all available functions:
```json
{
  "version": "1.0.0",
  "generated": "2026-02-19T12:00:00Z",
  "functions": {
    "nearby_hospitals": {
      "description": "Find nearby hospitals based on location",
      "parameters": {
        "lat": {"type": "number", "required": true},
        "lng": {"type": "number", "required": true},
        "radius_km": {"type": "number", "default": 10}
      },
      "returns": {
        "type": "array",
        "items": {
          "id": "uuid",
          "name": "string",
          "display_id": "string",
          "location": "geometry",
          "distance_km": "number"
        }
      }
    }
  }
}
```

### **schema_snapshot.json**
Contains current database schema structure:
```json
{
  "version": "1.0.0",
  "generated": "2026-02-19T12:00:00Z",
  "tables": {
    "profiles": {
      "columns": {
        "id": {"type": "uuid", "primary_key": true},
        "display_id": {"type": "text", "unique": true},
        "email": {"type": "text"},
        "created_at": {"type": "timestamptz"},
        "updated_at": {"type": "timestamptz"}
      }
    }
  }
}
```

## 🛠️ **Automation Scripts**

### **generate_api_reference.js**
```javascript
// Script to generate API reference from function definitions
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function generateAPIReference() {
  const supabase = createClient(/* config */);
  
  // Get all function definitions
  const functions = await supabase.rpc('get_all_functions');
  
  // Generate API reference structure
  const apiReference = {
    version: "1.0.0",
    generated: new Date().toISOString(),
    functions: functions
  };
  
  // Write to file
  fs.writeFileSync(
    'supabase/docs/console/api_reference.json',
    JSON.stringify(apiReference, null, 2)
  );
}
```

### **generate_schema_snapshot.js**
```javascript
// Script to generate schema snapshot
const fs = require('fs');
const { execSync } = require('child_process');

async function generateSchemaSnapshot() {
  // Get current schema
  const schema = execSync('npx supabase db diff --schema public', { encoding: 'utf8' });
  
  // Parse and structure schema
  const schemaSnapshot = {
    version: "1.0.0",
    generated: new Date().toISOString(),
    tables: parseSchema(schema)
  };
  
  // Write to file
  fs.writeFileSync(
    'supabase/docs/console/schema_snapshot.json',
    JSON.stringify(schemaSnapshot, null, 2)
  );
}
```

## 🔧 **Troubleshooting**

### **Common Issues**

#### **Migration Conflicts**
```
Error: Remote migration versions not found in local migrations directory
Solution: npx supabase migration repair --status reverted [migration_id]
```

#### **Schema Cache Issues**
```
Error: Could not find function in schema cache
Solution: npx supabase db push --include-all
```

#### **Function Not Accessible**
```
Error: Function exists but not callable
Solution: Check function permissions, verify SECURITY DEFINER
```

### **Debug Commands**
```bash
# Check migration status
npx supabase migration list

# View migration history
npx supabase migration history

# Check schema differences
npx supabase db diff

# Test specific function
npx supabase db shell
SELECT proname FROM pg_proc WHERE proname = 'function_name';
```

## 📋 **Best Practices**

### **Before Sync**
1. **Run comprehensive tests** - Ensure 100% pass rate
2. **Review changes** - Verify all intended changes
3. **Backup current state** - Save current console docs
4. **Document changes** - Update change logs

### **During Sync**
1. **Deploy migrations first** - Schema changes before documentation
2. **Update console docs** - Keep documentation current
3. **Validate incrementally** - Test after each major step
4. **Monitor for errors** - Watch for sync issues

### **After Sync**
1. **Run final validation** - Confirm everything works
2. **Update change logs** - Document what was synced
3. **Archive old versions** - Keep history of changes
4. **Notify team** - Inform of successful sync

## 🎯 **Success Criteria**

### **Successful Sync**
- [ ] All migrations deployed without errors
- [ ] API reference updated with latest functions
- [ ] Schema snapshot reflects current structure
- [ ] Comprehensive tests pass (100% success rate)
- [ ] No schema cache errors
- [ ] Console shows correct schema

### **Failed Sync**
- [ ] Migration errors detected
- [ ] Tests failing after sync
- [ ] Console documentation outdated
- [ ] Schema inconsistencies between environments
- [ ] Functions not accessible in console

---

**Following this guide ensures consistent synchronization between local development and the Supabase console, maintaining reliable documentation and schema integrity.**
