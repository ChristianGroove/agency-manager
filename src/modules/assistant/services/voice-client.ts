
import jwt from 'jsonwebtoken';

// Configuration (Moved from hardcoded to environment variables)
const VOICE_RUNTIME_URL = process.env.VOICE_RUNTIME_URL;
const APP_SECRET = process.env.PIXY_VOICE_SECRET;

export interface VoiceCommand {
    tenant_id: string;
    space_id: string;
    user_id: string;
    intent: 'ping' | 'voice_session_start' | 'process_text' | string;
    payload: Record<string, any>;
}

export interface RuntimeResponse {
    status: 'accepted' | 'error';
    trace_id?: string;
    error?: string;
}

export class VoiceClient {

    /**
     * Signs and sends a command to the remote Voice Runtime
     */
    static async sendCommand(command: VoiceCommand): Promise<RuntimeResponse> {
        try {
            // 1. Sign Token
            if (!APP_SECRET) {
                console.error("[VoiceClient] Missing PIXY_VOICE_SECRET environment variable.");
                return { status: 'error', error: "Voice Service Configuration Error" };
            }

            const token = jwt.sign({}, APP_SECRET, {
                issuer: 'pixy-agency-manager',
                audience: 'pixy-voice-runtime',
                subject: 'pixy-core',
                expiresIn: '60s' // Short life
            });
            console.log(`[DEBUG] Generated Token: ${token}`);

            // 2. Prepare Payload
            const body = {
                ...command,
                timestamp: Date.now()
            };

            // 3. Send Request
            const response = await fetch(`${VOICE_RUNTIME_URL}/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body),
                // Timeout logic relies on fetch defaults or AbortController, keeping simple for now
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error(`[VoiceClient] Runtime Error (${response.status}): ${errText}`);
                return { status: 'error', error: `Runtime responded with ${response.status}` };
            }

            const data = await response.json();
            console.log(`[VoiceClient] Command Sent. Trace: ${data.trace_id}`);
            return { status: 'accepted', trace_id: data.trace_id };

        } catch (error: any) {
            console.error('[VoiceClient] Network Error:', error.message);
            return { status: 'error', error: error.message };
        }
    }
}
