const fs = require('fs');
const path = require('path');

// Paths (Corrected for Windows/Absolute)
const appDir = 'c:\\Users\\Dyrane\\Documents\\GitHub\\ivisit-app';
const consoleDir = 'c:\\Users\\Dyrane\\Documents\\GitHub\\ivisit-console';

// Target the FRONTEND supabase folder in Console
const appSupabaseDir = path.join(appDir, 'supabase');
const consoleSupabaseDir = path.join(consoleDir, 'frontend', 'supabase');

const appMigrationsDir = path.join(appSupabaseDir, 'migrations');
const consoleMigrationsDir = path.join(consoleSupabaseDir, 'migrations');

// Types path
const appTypesFile = path.join(appDir, 'types', 'database.ts');
const consoleTypesFile = path.join(consoleDir, 'frontend', 'src', 'types', 'database.ts');

console.log('--- Syncing Console (Frontend) Schema & Documentation (PRUNED) ---');

// 0. Ensure target supabase dir exists
if (!fs.existsSync(consoleSupabaseDir)) {
    fs.mkdirSync(consoleSupabaseDir, { recursive: true });
}

// 1. Sync Documentation (README and docs/ folder)
console.log('Syncing Documentation...');

// Copy root README.md
if (fs.existsSync(path.join(appSupabaseDir, 'README.md'))) {
    fs.copyFileSync(
        path.join(appSupabaseDir, 'README.md'),
        path.join(consoleSupabaseDir, 'README.md')
    );
}

// Sync docs/ subfolder
const appDocsDir = path.join(appSupabaseDir, 'docs');
const consoleDocsDir = path.join(consoleSupabaseDir, 'docs');

if (fs.existsSync(appDocsDir)) {
    console.log('  Pruning Console Docs Root (Syncing Archive Hierarchy)...');

    // Safety: Prune only files in the root of console/supabase/docs 
    // to reconcile files that moved to archive/
    if (fs.existsSync(consoleDocsDir)) {
        const consoleDocFiles = fs.readdirSync(consoleDocsDir)
            .filter(f => f.endsWith('.md') && !fs.statSync(path.join(consoleDocsDir, f)).isDirectory());

        consoleDocFiles.forEach(file => {
            fs.unlinkSync(path.join(consoleDocsDir, file));
        });
    }

    console.log('  Syncing docs/ subfolder...');
    fs.cpSync(appDocsDir, consoleDocsDir, { recursive: true });
}

// 2. Sync Migrations (Clean Overwrite)
console.log('Syncing Migrations...');
if (!fs.existsSync(consoleMigrationsDir)) {
    fs.mkdirSync(consoleMigrationsDir, { recursive: true });
}

// DELETE existing migration files in console to ensure 1:1 sync
const consoleFiles = fs.readdirSync(consoleMigrationsDir)
    .filter(f => f.endsWith('.sql') && !fs.statSync(path.join(consoleMigrationsDir, f)).isDirectory());

consoleFiles.forEach(file => {
    fs.unlinkSync(path.join(consoleMigrationsDir, file));
});

// Get Active App Migrations
const activeAppFiles = fs.readdirSync(appMigrationsDir)
    .filter(f => f.endsWith('.sql') && !fs.statSync(path.join(appMigrationsDir, f)).isDirectory());

// Copy Active App Files
activeAppFiles.forEach(file => {
    console.log(`  Copying ${file}...`);
    fs.copyFileSync(path.join(appMigrationsDir, file), path.join(consoleMigrationsDir, file));
});

// NOTE: supabase/functions/ are NOT synced to preserve independence.

// 3. Sync Types
console.log('Syncing Types...');
if (fs.existsSync(appTypesFile)) {
    const destDir = path.dirname(consoleTypesFile);
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(appTypesFile, consoleTypesFile);
    console.log('  Types updated.');
} else {
    console.error(`  ERROR: Source types file not found: ${appTypesFile}`);
}

console.log('--- Sync Complete (Clean Slate) ---');
