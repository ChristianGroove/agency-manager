
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { VoiceClient } from '../src/modules/assistant/services/voice-client';

async function main() {
    console.log("🌉 Testing Pixy Command Bridge...");

    // Verify connection to the Voice Runtime
    // NOTE: Uses Hardcoded Secret in Client as per 'Nuclear Fix'
    console.log(`🔑 Using Configured Secret`);

    const command = {
        tenant_id: 'test-tenant-001',
        space_id: 'test-space-A',
        user_id: 'dev-user',
        intent: 'ping',
        payload: {
            message: 'Hello from local dev!'
        }
    };

    console.log("🚀 Sending Ping Command to VPS...");
    const start = Date.now();

    // Explicitly set the URL if not in env, matching the deployed VPS IP
    if (!process.env.VOICE_RUNTIME_URL) {
        process.env.VOICE_RUNTIME_URL = 'http://31.97.142.27:8080';
    }

    const result = await VoiceClient.sendCommand(command);

    const duration = Date.now() - start;

    if (result.status === 'accepted') {
        console.log(`✅ SUCCESS!`);
        console.log(`   Response Time: ${duration}ms`);
        console.log(`   Trace ID: ${result.trace_id}`);
        console.log("   The Voice Runtime accepted our signed JWT.");
    } else {
        console.error(`❌ FAILED`);
        console.error(`   Error: ${result.error}`);
    }
}

main();
