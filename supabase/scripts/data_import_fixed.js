const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

// Table mapping for backup files
const tableMappings = {
  'backup_profiles_2026-02-19.json': 'profiles',
  'backup_organizations_2026-02-19.json': 'organizations',
  'backup_hospitals_2026-02-19.json': 'hospitals',
  'backup_doctors_2026-02-19.json': 'doctors',
  'backup_ambulances_2026-02-19.json': 'ambulances',
  'backup_emergency_requests_2026-02-19.json': 'emergency_requests',
  'backup_visits_2026-02-19.json': 'visits',
  'backup_patient_wallets_2026-02-19.json': 'patient_wallets',
  'backup_organization_wallets_2026-02-19.json': 'organization_wallets',
  'backup_payments_2026-02-19.json': 'payments',
  'backup_notifications_2026-02-19.json': 'notifications',
  'backup_payment_methods_2026-02-19.json': 'payment_methods',
  'backup_insurance_policies_2026-02-19.json': 'insurance_policies',
  'backup_preferences_2026-02-19.json': 'preferences',
  'backup_medical_profiles_2026-02-19.json': 'medical_profiles'
};

async function importDataFromBackup() {
  console.log('🔄 Starting Data Import from Backup Files...\n');

  const results = {
    successful: [],
    failed: [],
    totalRecords: 0
  };

  // Get all backup files
  const backupFiles = Object.keys(tableMappings);
  
  for (const filename of backupFiles) {
    const tableName = tableMappings[filename];
    const filePath = path.join(__dirname, filename);
    
    console.log(`📁 Processing ${filename} -> ${tableName}`);
    
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filename}`);
        continue;
      }

      // Read backup file
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(fileContent);
      
      if (!Array.isArray(data) || data.length === 0) {
        console.log(`📭 No data to import in ${filename}`);
        continue;
      }

      console.log(`📊 Found ${data.length} records to import`);

      // Clean data for new schema
      const cleanedData = data.map(record => {
        // Remove old id if it's not a UUID
        if (record.id && typeof record.id === 'string' && !record.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          const { id, ...rest } = record;
          return rest;
        }
        
        // Handle geometry fields for emergency_requests
        if (tableName === 'emergency_requests' && record.patient_location) {
          if (typeof record.patient_location === 'object' && record.patient_location.lat && record.patient_location.lng) {
            record.patient_location = `POINT(${record.patient_location.lng} ${record.patient_location.lat})`;
          }
        }
        
        // Remove display_id to let triggers generate new ones
        const { display_id, ...rest } = record;
        return rest;
      });

      // Import data in batches to avoid timeouts
      const batchSize = 100;
      let importedCount = 0;
      
      for (let i = 0; i < cleanedData.length; i += batchSize) {
        const batch = cleanedData.slice(i, i + batchSize);
        
        try {
          const { data: insertedData, error } = await supabase
            .from(tableName)
            .insert(batch)
            .select('id, display_id');
          
          if (error) {
            console.error(`❌ Batch import error for ${tableName}:`, error.message);
            results.failed.push({ table: tableName, error: error.message });
            break;
          }
          
          importedCount += batch.length;
          console.log(`✅ Imported batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(cleanedData.length/batchSize)} (${importedCount}/${cleanedData.length})`);
          
        } catch (batchError) {
          console.error(`❌ Batch error for ${tableName}:`, batchError.message);
          results.failed.push({ table: tableName, error: batchError.message });
          break;
        }
      }

      if (importedCount > 0) {
        results.successful.push({ table: tableName, records: importedCount });
        results.totalRecords += importedCount;
        console.log(`🎉 Successfully imported ${importedCount} records into ${tableName}\n`);
      }

    } catch (error) {
      console.error(`❌ Failed to process ${filename}:`, error.message);
      results.failed.push({ table: tableName, error: error.message });
    }
  }

  // Summary
  console.log('🎯 Data Import Summary:');
  console.log(`✅ Successful tables: ${results.successful.length}`);
  console.log(`❌ Failed tables: ${results.failed.length}`);
  console.log(`📊 Total records imported: ${results.totalRecords}`);
  
  if (results.successful.length > 0) {
    console.log('\n✅ Successfully imported:');
    results.successful.forEach(({ table, records }) => {
      console.log(`  - ${table}: ${records} records`);
    });
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed to import:');
    results.failed.forEach(({ table, error }) => {
      console.log(`  - ${table}: ${error}`);
    });
  }

  return results;
}

async function verifyImport() {
  console.log('\n🔍 Verifying Import Results...\n');
  
  const verificationTables = [
    'profiles', 'organizations', 'hospitals', 'doctors', 
    'ambulances', 'emergency_requests', 'visits', 
    'patient_wallets', 'payments', 'id_mappings'
  ];

  const verificationResults = {};

  for (const tableName of verificationTables) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ Verification failed for ${tableName}: ${error.message}`);
        verificationResults[tableName] = { error: error.message, count: 0 };
      } else {
        console.log(`✅ ${tableName}: ${count} records`);
        verificationResults[tableName] = { count: count || 0 };
      }
    } catch (error) {
      console.log(`❌ Verification error for ${tableName}: ${error.message}`);
      verificationResults[tableName] = { error: error.message, count: 0 };
    }
  }

  // Check display ID mapping
  try {
    const { data: mappings, error: mappingError } = await supabase
      .from('id_mappings')
      .select('entity_type, count')
      .then(({ data }) => {
        const counts = {};
        data?.forEach(item => {
          counts[item.entity_type] = (counts[item.entity_type] || 0) + 1;
        });
        return { data: counts };
      });
    
    if (mappingError) {
      console.log(`❌ Display ID mapping verification failed: ${mappingError.message}`);
    } else {
      console.log('\n🏷️  Display ID Mapping Summary:');
      Object.entries(mappings).forEach(([type, count]) => {
        console.log(`  - ${type}: ${count} mappings`);
      });
    }
  } catch (error) {
    console.log(`❌ Display ID mapping error: ${error.message}`);
  }

  return verificationResults;
}

// Run the import and verification
async function runImportProcess() {
  try {
    const importResults = await importDataFromBackup();
    const verificationResults = await verifyImport();
    
    console.log('\n🎉 Import process completed!');
    
    if (importResults.failed.length === 0) {
      console.log('✅ All data imported successfully!');
    } else {
      console.log(`⚠️  ${importResults.failed.length} tables had issues during import`);
    }
    
    process.exit(importResults.failed.length > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Import process failed:', error);
    process.exit(1);
  }
}

runImportProcess();
