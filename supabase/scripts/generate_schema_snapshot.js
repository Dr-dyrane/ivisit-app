const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '../migrations');
const outputDocsDir = path.join(__dirname, '../docs');
const outputFile = path.join(outputDocsDir, 'SCHEMA_SNAPSHOT.md');

console.log('📸 Generating Schema Snapshot from Migrations...');

const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

let snapshot = `# 📸 Schema Snapshot\n\nGenerated on ${new Date().toLocaleDateString()}\n\n`;

files.forEach(file => {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const tableMatches = [...content.matchAll(/CREATE TABLE IF NOT EXISTS public\.(\w+) \(([\s\S]*?)\);/gi)];

    if (tableMatches.length > 0) {
        snapshot += `## 📄 ${file}\n\n`;
        tableMatches.forEach(match => {
            snapshot += `### Table: \`${match[1]}\`\n\n`;
            snapshot += `\`\`\`sql\n${match[0]}\n\`\`\`\n\n`;
        });
    }
});

if (!fs.existsSync(outputDocsDir)) {
    fs.mkdirSync(outputDocsDir, { recursive: true });
}

fs.writeFileSync(outputFile, snapshot);
console.log(`✅ Schema Snapshot generated at ${outputFile}`);
