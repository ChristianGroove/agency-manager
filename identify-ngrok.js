
const http = require('http');

const options = {
    hostname: '127.0.0.1',
    port: 4040,
    path: '/api/tunnels',
    method: 'GET'
};

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            const tunnels = parsed.tunnels || [];
            const httpsTunnel = tunnels.find(t => t.proto === 'https');

            if (httpsTunnel) {
                console.log('✅ Active Ngrok URL:', httpsTunnel.public_url);
            } else {
                console.log('❌ No HTTPS tunnel found.');
                console.log('All tunnels:', JSON.stringify(tunnels, null, 2));
            }
        } catch (e) {
            console.error('Error parsing JSON:', e.message);
        }
    });
});

req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
});

req.end();
