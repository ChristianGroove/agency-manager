
const fetch = require('node-fetch');

async function checkUrl(label, url) {
    console.log(`Checking ${label}: ${url}`);
    try {
        // Use a generic user agent to simulate an external bot (like Meta)
        const opts = {
            headers: {
                'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
            }
        };

        const start = Date.now();
        const res = await fetch(url, opts);
        const text = await res.text();
        const duration = Date.now() - start;

        console.log(`[${label}] Status: ${res.status}`);
        console.log(`[${label}] Duration: ${duration}ms`);
        console.log(`[${label}] Response (first 100 chars): ${text.substring(0, 100)}...`);

        if (text === '12345' && res.status === 200) {
            console.log(`✅ [${label}] VERIFICATION PASSED`);
        } else {
            console.log(`❌ [${label}] VERIFICATION FAILED (Likely warning page or error)`);
            if (text.includes('localtunnel')) console.log("   -> Detected Localtunnel warning page");
        }
    } catch (err) {
        console.log(`❌ [${label}] ERROR: ${err.message}`);
    }
}

const params = 'hub.mode=subscribe&hub.verify_token=antigravity_verification_token_2026&hub.challenge=12345';
const tunnelUrl = `https://bumpy-berries-shine.loca.lt/api/webhooks/messaging?${params}`;

checkUrl('NEW_TUNNEL', tunnelUrl);
