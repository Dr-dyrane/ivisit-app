const fs = require('fs');
const path = require('path');

function fixEncoding(filePath) {
    console.log(`Checking encoding for ${filePath}...`);
    const buffer = fs.readFileSync(filePath);

    // Check for UTF-16 LE BOM (0xFF 0xFE)
    if (buffer[0] === 0xff && buffer[1] === 0xfe) {
        console.log('Detected UTF-16 LE encoding. Converting to UTF-8...');
        const utf16Content = buffer.toString('utf16le');
        fs.writeFileSync(filePath, utf16Content, 'utf8');
        console.log('Successfully converted to UTF-8.');
    } else {
        console.log('File does not have UTF-16 LE BOM. Rewriting as UTF-8 to be safe...');
        fs.writeFileSync(filePath, buffer.toString('utf8'), 'utf8');
    }
}

const appTypesPath = 'c:\\Users\\Dyrane\\Documents\\GitHub\\ivisit-app\\types\\database.ts';
const consoleTypesPath = 'c:\\Users\\Dyrane\\Documents\\GitHub\\ivisit-console\\frontend\\src\\types\\database.ts';

if (fs.existsSync(appTypesPath)) fixEncoding(appTypesPath);
if (fs.existsSync(consoleTypesPath)) fixEncoding(consoleTypesPath);
