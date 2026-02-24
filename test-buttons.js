const fs = require('fs');
const { sendOutboundMessage } = require('./src/modules/core/messaging/actions');

// We need to bypass Next.js context for a raw test. 
// We will test the MetaProvider directly to see the exact error.
const { MetaProvider } = require('./src/modules/core/messaging/providers/meta-provider');

async function run() {
    const provider = new MetaProvider('', '273af45b-057e-4ede-8c53-25d4e2493d3f', ''); // Just need it to resolve token

    const options = {
        to: '573006705958', // User phone
        content: {
            type: 'interactive_buttons',
            body: 'Test Buttons Payload',
            buttons: [
                { id: 'btn_1', title: 'Option 1' },
            ]
        },
        metadata: {
            channel: 'whatsapp'
        }
    };

    // Since getTokenByAssetId relies on supabaseAdmin, we run a direct HTTP fetch using the token we know is failing for text!
    // Wait, the token worked for text, but failed for bot! The user said text works.

    console.log("To test properly, we need the exact token from the DB.");
}

run();
