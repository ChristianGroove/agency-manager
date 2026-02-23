
const https = require('https');

const url = 'https://graph.facebook.com/v21.0';

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`BODY: ${data}`);
    });
}).on('error', (e) => {
    console.error(`GOT ERROR: ${e.message}`);
});
