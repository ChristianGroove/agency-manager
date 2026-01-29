
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// --- PERSONAPLEX ADAPTER (EMBEDDED FOR PORTABILITY) ---
// In production, this imports from the external module.
// Here we embed it to make this script a standalone verification tool.

interface LimitedContext {
    space_name: string;
    space_type: 'agency';
    user_role: string;
    allowed_intents: string[];
}

class PersonaplexAdapter {
    static async interpretUserMessage(
        input: string,
        context: LimitedContext
    ): Promise<{ cleanedMessage: string, detectedIntentId?: string, payload?: any }> {
        console.log(`\n   [Personaplex] Hearing: "${input}"`);
        console.log(`   [Personaplex] Context: ${context.user_role} @ ${context.space_name}`);

        const lowerInput = input.toLowerCase();

        if (lowerInput.includes('activar flujo')) {
            const idMatch = lowerInput.match(/flujo (\w+)/);
            const flowId = idMatch ? idMatch[1] : 'unknown_flow';
            return {
                cleanedMessage: `activar el flujo ${flowId}`,
                detectedIntentId: 'activate_flow',
                payload: { flow_id: `flow_${flowId}` }
            };
        }

        if (lowerInput.includes('pausar flujo')) {
            const idMatch = lowerInput.match(/flujo (\w+)/);
            const flowId = idMatch ? idMatch[1] : 'unknown_flow';
            return {
                cleanedMessage: `pausar el flujo ${flowId}`,
                detectedIntentId: 'pause_flow',
                payload: { flow_id: `flow_${flowId}` }
            };
        }

        return { cleanedMessage: input, detectedIntentId: undefined };
    }

    static async generateResponse(systemMessage: string, requiresConfirmation: boolean): Promise<string> {
        let response = `Entendido. ${systemMessage}`;
        if (requiresConfirmation) response += " ¿Me confirmas para proceder?";
        return response;
    }
}

// --- MAIN SIMULATION SCRIPT ---

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BASE_URL = 'http://localhost:3000/api/internal/assistant/intent';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function verifyVoiceAssistant() {
    console.log("🎙️  PIXY ASSISTANT VERIFICATION TOOL");
    console.log("====================================");
    console.log("Target URL:", BASE_URL);

    // 1. Auth
    const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'tester@pixy.ai',
        password: 'password123'
    });

    if (!authData.session) {
        console.error("❌ Auth Failed. Make sure 'tester@pixy.ai' exists.");
        console.log("Run 'npx tsx scripts/seed_operational_tables.js' if needed.");
        return;
    }
    const token = authData.session.access_token;

    async function post(url: string, body: any) {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(body)
        });
        const json = await res.json();
        if (res.status >= 400) throw new Error(JSON.stringify(json));
        return json;
    }

    try {
        // SCENARIO: PAUSE FLOW
        const inputAudio = "Necesito pausar flujo 500 por favor";
        console.log(`\n🎧 USER SAYS: "${inputAudio}"`);

        // A) Interpretation
        const interpretation = await PersonaplexAdapter.interpretUserMessage(inputAudio, {
            space_name: 'Agency Demo',
            space_type: 'agency',
            user_role: 'owner',
            allowed_intents: ['activate_flow', 'pause_flow']
        });

        if (!interpretation.detectedIntentId) {
            console.error("❌ Personaplex failed to understand.");
            return;
        }

        // B) Proposal
        console.log(`\n📤 Sending Proposal: ${interpretation.detectedIntentId}`);
        const proposal = await post(BASE_URL, {
            intent_id: interpretation.detectedIntentId,
            payload: interpretation.payload
        });

        // C) Response Generation
        const response1 = await PersonaplexAdapter.generateResponse(proposal.message, proposal.requires_confirmation);
        console.log(`🤖 ASSISTANT: "${response1}"`);

        // D) Confirmation (if needed)
        if (proposal.requires_confirmation) {
            console.log(`\n🎧 USER SAYS: "Sí, confirmado"`);
            const confirmUrl = `${BASE_URL}/${proposal.intent_log_id}/confirm`;
            const confirmation = await post(confirmUrl, {});

            const response2 = await PersonaplexAdapter.generateResponse(confirmation.message, confirmation.requires_confirmation);
            console.log(`🤖 ASSISTANT: "${response2}"`);
        }

        console.log("\n✅ SUCCESS: verification complete.");

    } catch (e: any) {
        console.error("\n❌ TEST FAILED:", e.message);
    }
}

verifyVoiceAssistant();
