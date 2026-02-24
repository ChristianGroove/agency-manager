const fetch = require('node-fetch');

async function run() {
    const payload = {
        object: 'whatsapp_business_account',
        entry: [{
            id: '109283742',
            changes: [{
                value: {
                    messaging_product: 'whatsapp',
                    metadata: { display_phone_number: '573132646452', phone_number_id: '885034150900914' },
                    contacts: [{ profile: { name: 'Demo User' }, wa_id: '573006705958' }],
                    messages: [{
                        from: '573006705958',
                        id: `wamid.test_${Date.now()}`,
                        timestamp: Math.floor(Date.now() / 1000).toString(),
                        type: 'text',
                        text: { body: 'Test webhook' }
                    }]
                },
                field: 'messages'
            }]
        }]
    };

    try {
        const res = await fetch('http://localhost:3000/api/webhooks/whatsapp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Hub-Signature-256': 'skip' // bypass validation for local test if permitted
            },
            body: JSON.stringify(payload)
        });

        console.log("Hook Result:", res.status, await res.text());

        // Let's sleep for 5 seconds to let the background Automation Engine run
        await new Promise(r => setTimeout(r, 5000));

    } catch (err) {
        console.error("Test failed", err);
    }
}

run();
