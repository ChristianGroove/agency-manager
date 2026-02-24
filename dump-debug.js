const fs = require('fs');

async function run() {
    try {
        const logContent = fs.readFileSync('debug.log', 'utf8');
        const lines = logContent.split('\n');

        // Find recent relevant logs for MetaProvider
        const results = lines.filter(line => line.includes('2026-02-24') && (line.includes('[MetaProvider] Sending Payload') || line.includes('[MetaProvider] API Response') || line.includes('[ButtonsNode]')));

        fs.writeFileSync('test-debug.txt', results.slice(-50).join('\n'));
    } catch (e) {
        fs.writeFileSync('test-debug.txt', e.toString());
    }
}

run();
