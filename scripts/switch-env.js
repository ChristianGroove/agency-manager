const fs = require('fs');
const path = require('path');

const target = process.argv[2]; // 'prod' or 'sandbox'

const envFiles = {
    prod: '.env.production',
    sandbox: '.env.sandbox'
};

const sourceFile = envFiles[target];
const destFile = '.env.local';

if (!sourceFile) {
    console.error('❌ Error: Use "prod" or "sandbox" as argument.');
    process.exit(1);
}

const sourcePath = path.join(process.cwd(), sourceFile);
const destPath = path.join(process.cwd(), destFile);

if (!fs.existsSync(sourcePath)) {
    console.error(`❌ Error: Source file ${sourceFile} not found.`);
    process.exit(1);
}

try {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`\n✅ ENV SWITCHED TO: ${target.toUpperCase()}`);
    console.log(`📄 ${sourceFile} -> ${destFile}\n`);
    console.log('💡 RESTART your dev server (npm run dev) to apply changes.\n');
} catch (err) {
    console.error('❌ Failed to switch environment:', err.message);
}
