
const fetch = require('node-fetch');

async function checkUrl(label, url) {
    console.log(`Checking ${label}: ${url}`);
    try {
        const start = Date.now();
        const res = await fetch(url);
        const text = await res.text();
        const duration = Date.now() - start;

        console.log(`[${label}] Status: ${res.status}`);
        console.log(`[${label}] Duration: ${duration}ms`);
        console.log(`[${label}] Response (first 100 chars): ${text.substring(0, 100)}...`);

        if (text === '12345' && res.status === 200) {
            console.log(`✅ [${label}] VERIFICATION PASSED`);
        } else {
            console.log(`❌ [${label}] VERIFICATION FAILED`);
        }
    } catch (err) {
        console.log(`❌ [${label}] ERROR: ${err.message}`);
    }
    console.log('---');
}

const params = 'hub.mode=subscribe&hub.verify_token=antigravity_verification_token_2026&hub.challenge=12345';
const localUrl = `http://localhost:3000/api/webhooks/messaging?${params}`;
const tunnelUrl = `https://afraid-deer-rescue.loca.lt/api/webhooks/messaging?${params}`;

async function run() {
    await checkUrl('LOCALHOST', localUrl);
    await checkUrl('TUNNEL', tunnelUrl);
}

run();
