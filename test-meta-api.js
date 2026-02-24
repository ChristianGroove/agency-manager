const fs = require('fs');

async function runTest() {
    const { MetaProvider } = require('./src/modules/core/messaging/providers/meta-provider');
    const provider = new MetaProvider('EAAP821K7ZBUwBOZCCQjJIZBA2ZCKLgT3dZBcK6eF9ZB82lR1R97aXUty032P23L0L1S53sJ0bJm2rF7Pib79mS3O71bM4R8sXZA2sWJ73ZBCP25BvO8a4L74ZAB05G90w3J2F0F3J4h2jH0t0S2ZB2F8kU3I10I2OqZC0B6E6I1U5ZCX1R4v9ZB9C7F7ZAC0U1a3ZB3S5U2FvWwA2x2l7', '273af45b-057e-4ede-8c53-25d4e2493d3f', process.env.META_VERIFY_TOKEN);

    try {
        const payload = {
            to: '573006705958',
            content: {
                type: 'interactive_buttons',
                body: 'Dyjfjfj dvh',
                buttons: [
                    { id: 'btn_6pu92', title: '✅ Acepto políticas' },
                    { id: 'btn_pta46', title: '❌ No acepto' },
                    { id: 'btn_61yyq', title: 'Ver politicas' }
                ]
            }
        };

        // We mock building the payload just like actions.ts
        const providerOptions = {
            to: payload.to,
            content: payload.content
        };

        console.log("Sending payload via MetaProvider:", JSON.stringify(providerOptions, null, 2));
        const result = await provider.sendMessage(providerOptions);
        console.log("Result:", result);
    } catch (err) {
        console.error("Test failed:", err);
    }
}

// Ensure typescript works
require('ts-node').register({
    compilerOptions: {
        module: 'commonjs'
    }
});
runTest();
