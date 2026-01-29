
import { AssistantModel, AssistantModelInput, AssistantModelOutput } from "./assistant-model.interface";
import { SYSTEM_INTENTS } from "../intent-registry";

export class MockAssistantModel implements AssistantModel {
    id = "mock-v1";
    supportsStreaming = false;
    supportsVoice = false;

    async generateResponse(input: AssistantModelInput): Promise<AssistantModelOutput> {
        const text = input.message.toLowerCase();

        // --- Migrated Regex Logic ---

        // 1. Create Brief
        if (/crear.*brief/i.test(text) || text.includes("nuevo brief")) {
            return {
                text: "Entendido, puedo ayudarte a crear un brief.",
                confidence: 0.9,
                suggestedAction: {
                    type: SYSTEM_INTENTS.CREATE_BRIEF,
                    payload: {
                        template_id: 'default_brief',
                        client_id: text.includes('demo') ? 'demo_client_id' : undefined
                    }
                }
            };
        }

        // 2. Create Quote
        if (text.includes("crear cotización") || text.includes("nueva cotización")) {
            return {
                text: "Claro, vamos a crear una cotización.",
                confidence: 0.95,
                suggestedAction: {
                    type: SYSTEM_INTENTS.CREATE_QUOTE,
                    payload: {
                        client_id: 'demo_client_id',
                        items: [{ description: "Servicio Web (Mock)", price: 1500 }]
                    }
                }
            };
        }

        // 3. Payment Reminder
        if (text.includes("recordar pago") || text.includes("cobrar factura")) {
            const numbers = text.match(/\d+/);
            return {
                text: "Voy a preparar el recordatorio de pago.",
                confidence: 0.9,
                suggestedAction: {
                    type: SYSTEM_INTENTS.SEND_PAYMENT_REMINDER,
                    payload: {
                        invoice_id: numbers ? numbers[0] : undefined
                    }
                }
            };
        }

        // 4. Create Flow
        if (text.includes("crear flujo") || text.includes("nueva rutina")) {
            return {
                text: "Configurando nueva rutina de automatización.",
                confidence: 0.9,
                suggestedAction: {
                    type: SYSTEM_INTENTS.CREATE_FLOW_FROM_TEMPLATE,
                    payload: {
                        template_id: 'tpl_onboarding_v1'
                    }
                }
            };
        }

        // 5. List Pending
        if (text.includes("pendientes") || text.includes("que hay por hacer")) {
            return {
                text: "Revisando tus tareas pendientes.",
                confidence: 0.9,
                suggestedAction: {
                    type: SYSTEM_INTENTS.LIST_PENDING_ACTIONS,
                    payload: {}
                }
            };
        }

        // 6. Generic/Legacy Create
        if (text.includes("crear cliente") || text.includes("nuevo prospecto") || text.includes("nuevo cliente")) {
            const name = text.replace(/crear cliente|nuevo prospecto|nuevo cliente/i, '').trim();
            return {
                text: "Procediendo a crear el cliente.",
                confidence: 0.9,
                suggestedAction: {
                    type: SYSTEM_INTENTS.CREATE_CLIENT,
                    payload: { name }
                }
            };
        }

        // Default: No Intent
        return {
            text: "No estoy seguro de qué necesitas. Intenta ser más específico.",
            confidence: 0,
            // No suggestedAction
        };
    }
}
