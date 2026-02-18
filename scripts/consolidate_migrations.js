const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
const targetFile = path.join(migrationsDir, '20260218060000_consolidated_schema.sql');

if (!fs.existsSync(migrationsDir)) {
    console.error(`Error: Directory not found ${migrationsDir}`);
    process.exit(1);
}

// Delete target if it exists to start fresh
if (fs.existsSync(targetFile)) {
    fs.unlinkSync(targetFile);
}

const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') && f !== '20260218060000_consolidated_schema.sql')
    .sort();

console.log(`Consolidating ${files.length} migration files from ${migrationsDir}...`);

const outputStream = fs.createWriteStream(targetFile, { flags: 'a' });

outputStream.write('-- ============================================================================\n');
outputStream.write('-- TRUE GROUND ZERO CONSOLIDATED SCHEMA (v1.0)\n');
outputStream.write('-- Reconstructed from Archive Migration Files\n');
outputStream.write('-- Date: 2026-02-18\n');
outputStream.write('-- ============================================================================\n\n');

files.forEach(file => {
    const filePath = path.join(migrationsDir, file);
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        outputStream.write(`\n-- ----------------------------------------------------------------------------\n`);
        outputStream.write(`-- Source: ${file}\n`);
        outputStream.write(`-- ----------------------------------------------------------------------------\n\n`);
        outputStream.write(content);
        outputStream.write('\n');
    } catch (err) {
        console.error(`Error reading ${file}: ${err.message}`);
    }
});

outputStream.end();
console.log('Consolidation Complete.');
