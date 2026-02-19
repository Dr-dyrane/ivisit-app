const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '../migrations');
const rpcFile = path.join(migrationsDir, '20260219010000_core_rpcs.sql');
const outputDocsDir = path.join(__dirname, '../docs');
const outputFile = path.join(outputDocsDir, 'API_REFERENCE.md');

console.log('🔍 Generating API Reference from Core RPCs...');

if (!fs.existsSync(rpcFile)) {
    console.error(`❌ Migration file not found: ${rpcFile}`);
    process.exit(1);
}

const content = fs.readFileSync(rpcFile, 'utf8');
const functions = [];

// Improved regex to capture function name and parameters
const funcRegex = /CREATE OR REPLACE FUNCTION public\.(\w+)\(([\s\S]*?)\)\s*RETURNS([\s\S]*?)AS \$\$/gi;
let match;

while ((match = funcRegex.exec(content)) !== null) {
    functions.push({
        name: match[1],
        params: match[2].trim().replace(/\n/g, ' ').replace(/\s+/g, ' '),
        returns: match[3].trim().replace(/\n/g, ' ').replace(/\s+/g, ' ')
    });
}

let markdown = `# 📡 API Reference (Core RPCs)\n\nGenerated from \`20260219010000_core_rpcs.sql\` on ${new Date().toLocaleDateString()}\n\n`;
markdown += `| Function | Parameters | Returns |\n`;
markdown += `|---|---|---|\n`;

functions.forEach(f => {
    markdown += `| \`${f.name}\` | \`${f.params}\` | \`${f.returns}\` |\n`;
});

if (!fs.existsSync(outputDocsDir)) {
    fs.mkdirSync(outputDocsDir, { recursive: true });
}

fs.writeFileSync(outputFile, markdown);
console.log(`✅ API Reference generated at ${outputFile}`);
