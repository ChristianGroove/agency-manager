
const fetch = require('node-fetch');

async function getNgrokUrl() {
    try {
        const res = await fetch('http://127.0.0.1:4040/api/tunnels');
        const data = await res.json();
        const tunnel = data.tunnels.find(t => t.proto === 'https');
        if (tunnel) {
            console.log(`NGROK_URL=${tunnel.public_url}`);
            return tunnel.public_url;
        } else {
            console.log('NO_TUNNEL_FOUND');
        }
    } catch (err) {
        console.log(`ERROR: ${err.message}`);
    }
}

async function checkUrl(url) {
    console.log(`Checking NGROK: ${url}`);
    const params = 'hub.mode=subscribe&hub.verify_token=antigravity_verification_token_2026&hub.challenge=12345';
    const checkUrl = `${url}/api/webhooks/messaging?${params}`;

    try {
        const res = await fetch(checkUrl);
        const text = await res.text();
        console.log(`[NGROK] Status: ${res.status}`);
        console.log(`[NGROK] Response: ${text.substring(0, 100)}`);

        if (text === '12345' && res.status === 200) {
            console.log(`✅ VERIFICATION PASSED`);
        } else {
            console.log(`❌ VERIFICATION FAILED`);
        }
    } catch (err) {
        console.log(`❌ ERROR: ${err.message}`);
    }
}

getNgrokUrl().then(url => {
    if (url) checkUrl(url);
});
