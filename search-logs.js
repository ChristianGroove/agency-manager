
const fs = require('fs');
const path = require('path');

const debugLogPath = path.join(process.cwd(), 'debug.log');
const content = fs.readFileSync(debugLogPath, 'utf8');

console.log('Searching for "reading \'trim\'" or "[WebhookManager] ❌" errors...');
const lines = content.split('\n');
lines.forEach(line => {
    if (line.includes('WebhookManager') || line.includes('trim') || line.includes('undefined')) {
         console.log(line);
    }
});
