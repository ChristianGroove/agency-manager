
const http = require('http');

const data = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{
        id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
        changes: [{
            value: {
                messaging_product: 'whatsapp',
                metadata: {
                    display_phone_number: '1234567890',
                    phone_number_id: '1234567890abcdef'
                },
                contacts: [{
                    profile: {
                        name: 'NAME'
                    },
                    wa_id: 'PHONE_NUMBER'
                }],
                messages: [{
                    from: 'PHONE_NUMBER',
                    id: 'wamid.ID',
                    timestamp: 'TIMESTAMP',
                    text: {
                        body: 'MESSAGE_BODY'
                    },
                    type: 'text'
                }]
            },
            field: 'messages'
        }]
    }]
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/webhooks/messaging',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
