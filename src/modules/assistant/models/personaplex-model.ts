
// src/modules/assistant/models/personaplex-model.ts

import { AssistantModel, AssistantModelInput, AssistantModelOutput } from "./assistant-model.interface";
import { rateLimiter } from "./rate-limiter"; // Reusing rate limiter for now
import { SYSTEM_INTENTS } from "../intent-registry";

import { VoiceClient } from "../services/voice-client"; // Import Bridge

export class PersonaplexAssistantModel implements AssistantModel {
    id = "personaplex-v1";
    supportsStreaming = true;
    supportsVoice = true;

    private SYSTEM_PROMPT = `...`; // omitted

    async generateResponse(input: AssistantModelInput): Promise<AssistantModelOutput> {
        // 1. Rate Limit Check
        if (!rateLimiter.checkLimit(input.space_id)) {
            return { text: "Límite de voz diario alcanzado.", confidence: 0 };
        }

        // 2. BRIDGE INTEGRATION: Send to VPS Runtime
        // We fire-and-forget this for now to test the pipe, or await if we want strictness.
        try {
            console.log(`[Personaplex] 🌉 Bridging to VPS: "${input.message}"`);
            await VoiceClient.sendCommand({
                tenant_id: input.organization_id || 'unknown',
                space_id: input.space_id,
                user_id: 'user-current', // In real app, pass actual ID
                intent: 'process_text', // As per contract
                payload: {
                    text: input.message,
                    mode: 'voice'
                }
            });
        } catch (e) {
            console.error(`[Personaplex] ⚠️ Bridge Error:`, e);
            // Non-blocking error for now
        }

        // 3. Mock Personaplex Processing (Hybrid Mode)
        console.log(`[Personaplex] Local Processing Voice Input: "${input.message}"`);

        const text = input.message.toLowerCase();
        let responseText = "No entendí, ¿puedes repetir?";
        let suggestedAction = undefined;

        // Mock Intelligence Logic (Voice Optimized Reponses)
        if (text.includes("crear brief")) {
            responseText = "Listo. ¿Para qué cliente iniciamos el brief?";
            suggestedAction = { type: SYSTEM_INTENTS.CREATE_BRIEF, payload: {} }; // Partial
        } else if (text.includes("cliente demo")) {
            responseText = "Entendido, Cliente Demo. Generando draft. ¿Confirmas?";
            suggestedAction = { type: SYSTEM_INTENTS.CREATE_BRIEF, payload: { client_id: 'demo', template_id: 'std' } };
        } else if (text.includes("sí") || text.includes("dale")) {
            responseText = "Hecho. Briefing creado.";
            // Confirmation logic handled by Engine mostly
        }

        return {
            text: responseText,
            confidence: 0.95,
            suggestedAction: suggestedAction
        };
    }
}
