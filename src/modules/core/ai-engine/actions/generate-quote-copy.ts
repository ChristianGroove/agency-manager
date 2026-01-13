"use server"

import { AIEngine } from "../service"
import { QuoteSettings } from "@/modules/core/crm/quote-settings"

export async function generateQuoteCopy(
    settings: QuoteSettings,
    field: 'header' | 'footer',
    tone: string = "Professional"
): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
        const contextPrompt = `
        You are an expert copywriter for business documents.
        
        CONTEXT:
        - Industry/Vertical: ${settings.vertical}
        - Action Buttons: Approve="${settings.approve_label}", Reject="${settings.reject_label}"
        - Organization ID: ${settings.organization_id}
        
        TASK:
        Generate a single, short, professional ${field} text for a Price Quote / Proposal.
        
        REQUIREMENTS:
        - Tone: ${tone}
        - Length: ${field === 'header' ? '3-6 words' : '10-15 words'}
        - Language: Spanish (Latin America)
        - The text must be relevant to the industry context.
        - Do NOT include quotes ("") in the output.
        
        EXAMPLES (Header):
        - "Propuesta Comercial - [Empresa]"
        - "Resumen de su Pedido 🍕"
        - "Confirmación de Cita Médica"
        
        EXAMPLES (Footer):
        - "Gracias por su confianza. Dudas al WhatsApp."
        - "Este documento es válido por 15 días hábiles."
        
        OUTPUT:
        Only the text string.
        `

        const response = await AIEngine.executeTask({
            organizationId: settings.organization_id,
            taskType: "quote.generate_copy_v1",
            payload: {
                prompt: contextPrompt
            },
            bypassCache: true
        })

        // Since we are using an ad-hoc task type that might not be registered in the strict registry,
        // we might fail if AIEngine enforces registry.
        // However, looking at AIEngine implementation, it calls `getTaskDefinition(taskType)`.
        // If "gen_quote_copy" is not registered, it will throw.
        // WE MUST REGISTER THIS TASK FIRST. 
        // OR use a generic "completion" task if available.
        // Let's optimize: We will use a registered task "text.completion_v1" if it exists, or register one.
        // For now, let's assume we need to add the task definition. 
        // Wait, I cannot edit AIEngine core extensively without checking `tasks/registry.ts`.
        // Let's check `src/modules/core/ai-engine/tasks/registry.ts` first.

        return { success: true, text: response.data?.text || response.data || "" }

    } catch (error: any) {
        console.error("Error generating copy:", error)
        return { success: false, error: error.message }
    }
}
