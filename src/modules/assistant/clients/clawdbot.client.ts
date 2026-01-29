
/**
 * CLAWDBOT CLIENT
 * Low-level HTTP client for Clawdbot API.
 * 
 * In this Phase 4 (Mock Integration), this client simulates network calls.
 * In production, it would use fetch() to the real endpoint.
 */

export type ClawdbotMessage = {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export type ClawdbotResponse = {
    text: string;
    usage: { tokens: number };
}

export class ClawdbotClient {
    private apiKey: string;
    private endpoint: string;

    constructor() {
        // In real app: process.env.CLAWDBOT_API_KEY
        this.apiKey = "mock-key";
        this.endpoint = "https://api.clawdbot.com/v1/chat/completions";
    }

    async generateCompletion(messages: ClawdbotMessage[], timeoutMs = 10000): Promise<ClawdbotResponse> {
        console.log(`[ClawdbotClient] Sending ${messages.length} messages to ${this.endpoint}...`);

        // Simulate Network Latency
        await new Promise(r => setTimeout(r, 800));

        // Mock Logic: Check last user message to provide relevant mock response
        // This simulates the LLM's "intelligence" for testing purposes
        const lastMsg = messages[messages.length - 1].content.toLowerCase();

        let responseText = "Lo siento, como inteligencia artificial de negocios, no puedo procesar esa solicitud.";

        if (lastMsg.includes("crear cotización") && lastMsg.includes("web")) {
            responseText = `Entendido. Propongo crear una cotización para Desarrollo Web.
            SUGGESTED_ACTION: { "type": "create_quote", "payload": { "items": [{"description": "Desarrollo Web", "price": 0}] } }`;
        } else if (lastMsg.includes("crear brief")) {
            responseText = `Puedo ayudarte con eso. ¿Para qué cliente es el brief?
            SUGGESTED_ACTION: { "type": "create_brief", "payload": { "template_id": "standard" } }`;
        } else if (lastMsg.includes("hola")) {
            responseText = "Hola. Soy tu asistente de negocios Pixy. ¿En qué te puedo ayudar hoy?";
        }

        return {
            text: responseText,
            usage: { tokens: responseText.length / 4 }
        };
    }
}

export const clawdbotClient = new ClawdbotClient();
