
const { MetaProvider } = require('./src/modules/core/messaging/providers/meta-provider');

async function testParse() {
    console.log('Testing MetaProvider parsing...');

    // MOCK Payload from debug.log
    const payload = {
        "object": "page",
        "entry": [
            {
                "time": 1768802306357,
                "id": "109115205324966",
                "messaging": [
                    {
                        "sender": { "id": "9218320488219996" },
                        "recipient": { "id": "109115205324966" },
                        "timestamp": 1768802306046,
                        "message": {
                            "mid": "m_wFdfAigKnZ2FaKUAkgXf23e4d2liaHWX8O0Ys1twspZrpk8GYfbdf",
                            "text": "Fgnwdke" // Random text from log
                        }
                    }
                ]
            }
        ]
    };

    const provider = new MetaProvider('mock_token', 'mock_id', 'mock_verify');

    // We expect this to call getSenderProfile which needs fetch.
    // We should mock fetch or allow it to fail gracefully (which my code does).
    // Node environment fetch:
    if (!global.fetch) {
        global.fetch = async () => ({ json: async () => ({}) });
        console.log('Mocked fetch.');
    }

    const messages = await provider.parseWebhook(payload);
    console.log('Parsed Messages:', JSON.stringify(messages, null, 2));

    if (messages.length > 0) {
        console.log('SUCCESS: Provider parsed the message.');
        console.log('Metadata:', messages[0].metadata);
    } else {
        console.error('FAILURE: Provider returned empty array.');
    }
}

testParse();
