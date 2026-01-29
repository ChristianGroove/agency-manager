
const http = require('http');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 8080;
// NUCLEAR OPTION: Hardcoded to bypass environment injection issues
const API_SECRET = 'pixy_secret_hardcoded_fix_99';
const VERSION = '1.1.0-bridge';

// Body Parser Helper
const getBody = async (req) => {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                reject(e);
            }
        });
        req.on('error', reject);
    });
};

const server = http.createServer(async (req, res) => {
    // 0. CORS (Basic)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // 1. Health Check
    if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', version: VERSION, timestamp: Date.now() }));
        return;
    }

    // 2. Command Endpoint
    if (req.url === '/command' && req.method === 'POST') {
        try {
            // A. Auth Validation
            const authHeader = req.headers['authorization'];
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                console.warn('[Security] Missing/Invalid Auth Header');
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing Bearer Token' }));
                return;
            }

            const token = authHeader.split(' ')[1];
            console.log(`[DEBUG] Received Token: ${token}`);
            let decoded;
            try {
                decoded = jwt.verify(token, API_SECRET, { audience: 'pixy-voice-runtime', issuer: 'pixy-agency-manager' });
            } catch (err) {
                console.warn('[Security] Invalid Token:', err.message);
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid Token', details: err.message }));
                return;
            }

            // B. Payload Parsing
            const command = await getBody(req);

            // C. Schema Validation (Minimal)
            if (!command.tenant_id || !command.intent) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing required fields (tenant_id, intent)' }));
                return;
            }

            // D. Processing (Stub)
            console.log(`[Command] Received: ${command.intent} | Tenant: ${command.tenant_id} | User: ${command.user_id}`);

            // Success Response
            res.writeHead(202, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'accepted',
                trace_id: `trc_${Date.now()}`,
                intent: command.intent
            }));

        } catch (e) {
            console.error('[Error] Processing command:', e);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
        }
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});

server.listen(PORT, () => {
    console.log(`Pixy Voice Gateway (${VERSION}) listening on port ${PORT}`);
    console.log(`Security: JWT Enabled (Secret length: ${API_SECRET.length})`);
});
