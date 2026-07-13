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
const sharedFunctionNames = ['check-user', 'invite-user'];

// Types path
const appTypesFile = path.join(appDir, 'supabase', 'database.ts');
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

const consoleFiles = fs.readdirSync(consoleMigrationsDir)
    .filter(f => f.endsWith('.sql') && !fs.statSync(path.join(consoleMigrationsDir, f)).isDirectory());

consoleFiles.forEach(file => {
    fs.unlinkSync(path.join(consoleMigrationsDir, file));
});

const activeAppFiles = fs.readdirSync(appMigrationsDir)
    .filter(f => f.endsWith('.sql') && !fs.statSync(path.join(appMigrationsDir, f)).isDirectory());

activeAppFiles.forEach(file => {
    console.log(`  Copying ${file}...`);
    fs.copyFileSync(path.join(appMigrationsDir, file), path.join(consoleMigrationsDir, file));
});

// 2b. Sync Console-owned shared Edge receivers without pruning unrelated functions.
console.log('Syncing shared Console Edge Functions...');
sharedFunctionNames.forEach((functionName) => {
    const sourceDir = path.join(appSupabaseDir, 'functions', functionName);
    const targetDir = path.join(consoleSupabaseDir, 'functions', functionName);
    if (!fs.existsSync(sourceDir)) {
        throw new Error(`Missing canonical Edge Function: ${sourceDir}`);
    }
    console.log(`  Copying function ${functionName}...`);
    fs.rmSync(targetDir, { recursive: true, force: true });
    fs.cpSync(sourceDir, targetDir, { recursive: true });
});
fs.copyFileSync(
    path.join(appSupabaseDir, 'functions', 'README.md'),
    path.join(consoleSupabaseDir, 'functions', 'README.md')
);

// 3. Sync Scripts (with README)
console.log('Syncing Scripts...');
const appScriptsDir = path.join(appSupabaseDir, 'scripts');
const consoleScriptsDir = path.join(consoleSupabaseDir, 'scripts');

if (fs.existsSync(appScriptsDir)) {
    if (!fs.existsSync(consoleScriptsDir)) {
        fs.mkdirSync(consoleScriptsDir, { recursive: true });
    }

    // Overwrite canonical shared scripts without pruning Console-owned utilities.
    const activeScriptFiles = fs.readdirSync(appScriptsDir)
        .filter(f => f.endsWith('.js') || f.endsWith('.sql') || f === 'README.md');
    activeScriptFiles.forEach(file => {
        console.log(`  Copying script ${file}...`);
        fs.copyFileSync(path.join(appScriptsDir, file), path.join(consoleScriptsDir, file));
    });
}

// 4. Sync Types
console.log('Syncing Types...');
if (fs.existsSync(appTypesFile)) {
    const destDir = path.dirname(consoleTypesFile);
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(appTypesFile, consoleTypesFile);
    console.log('  Types updated.');
} else {
    console.warn(`  WARNING: Source types file not found at ${appTypesFile}. Run 'npx supabase gen types typescript --linked > supabase/database.ts' first.`);
}

console.log('--- Sync Complete (Clean Slate) ---');
