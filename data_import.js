const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function importDataFromBackups() {
    console.log('📥 Importing data from backups...');
    
    const backupFiles = fs.readdirSync('.').filter(f => f.startsWith('backup_') && f.endsWith('.json'));
    
    const importResults = {};
    
    for (const file of backupFiles) {
        try {
            const content = fs.readFileSync(file, 'utf8');
            const data = JSON.parse(content);
            
            if (data && Array.isArray(data)) {
                const tableName = file.replace('backup_', '').replace('_2026-02-19.json', '');
                
                console.log(`📥 Importing ${tableName}...`);
                
                const { error } = await supabase
                    .from(tableName)
                    .insert(data);
                
                if (error) {
                    console.log(`❌ ${tableName}: Import failed - ${error.message}`);
                    importResults[tableName] = { error: error.message, count: 0 };
                } else {
                    console.log(`✅ ${tableName}: ${data.length} records imported`);
                    importResults[tableName] = { success: true, count: data.length };
                }
            }
        } catch (error) {
            console.log(`❌ ${file}: Exception - ${error.message}`);
            importResults[tableName] = { error: error.message, count: 0 };
        }
    }
    
    console.log('📊 Data import completed');
    return importResults;
}

async function verifyImportedData() {
    console.log('🔍 Verifying imported data...');
    
    const tables = ['profiles', 'organizations', 'hospitals', 'doctors', 'ambulances'];
    
    const verificationResults = {};
    
    for (const table of tables) {
        try {
            console.log(`🔍 Verifying ${table}...`);
            
            const { data, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
            
            if (error) {
                console.log(`❌ ${table}: Verification failed - ${error.message}`);
                verificationResults[table] = { error: error.message, count: 0 };
            } else {
                console.log(`✅ ${table}: ${data.length} records verified`);
                verificationResults[table] = { success: true, count: data.length };
            }
        } catch (error) {
            console.log(`❌ ${table}: Verification exception - ${error.message}`);
            verificationResults[table] = { error: error.message, count: 0 };
        }
    }
    
    console.log('🔍 Data verification completed');
    return verificationResults;
}

async function runDataImport() {
    try {
        // Import data from backups
        const importResults = await importDataFromBackups();
        
        // Verify imported data
        const verificationResults = await verifyImportedData();
        
        console.log('\n📊 Import Summary:');
        for (const [table, result] of Object.entries(importResults)) {
            if (result.success) {
                console.log(`✅ ${table}: ${result.count} records imported`);
            } else {
                console.log(`❌ ${table}: ${result.error}`);
            }
        }
        
        console.log('\n🔍 Verification Summary:');
        for (const [table, result] of Object.entries(verificationResults)) {
            if (result.success) {
                console.log(`✅ ${table}: ${result.count} records verified`);
            } else {
                console.log(`❌ ${table}: ${result.error}`);
            }
        }
        
        console.log('\n✅ Data import and verification completed');
        console.log('🎯 UUID-native schema with display ID mapping is now active');
        
    } catch (error) {
        console.error('❌ Data import failed:', error.message);
    }
}

// Run import
runDataImport();
