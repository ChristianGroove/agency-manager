"use server"

import { AIEngine } from "../service"
import { QuoteSettings } from "@/modules/features/crm/services/logic/quote-settings"

const PUBLIC_QUOTE_COPY_ERROR = "No se pudo generar el texto"

type GenerateQuoteCopyResult =
    | { success: true; text: string; error?: never }
    | { success: false; error: string; text?: never }

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizeQuoteCopyError(error: unknown) {
    if (error instanceof Error) return { name: error.name }

    if (error && typeof error === 'object') {
        return {
            code: (error as any).code,
            status: (error as any).status,
            statusCode: (error as any).statusCode,
            hasMessage: typeof (error as any).message === 'string' && (error as any).message.length > 0,
        }
    }

    return { type: typeof error }
}

function quoteCopyFailure(error: unknown): GenerateQuoteCopyResult {
    console.error("Error generating copy:", isDeployedRuntime() ? summarizeQuoteCopyError(error) : error)

    if (isDeployedRuntime()) return { success: false, error: PUBLIC_QUOTE_COPY_ERROR }
    if (error instanceof Error) return { success: false, error: error.message }
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        return { success: false, error: error.message }
    }
    return { success: false, error: PUBLIC_QUOTE_COPY_ERROR }
}

export async function generateQuoteCopy(
    settings: QuoteSettings,
    field: 'header' | 'footer',
    tone: string = "Professional"
): Promise<GenerateQuoteCopyResult> {
    try {
        const contextPrompt = `
        You are an expert copywriter for business documents.
        
        CONTEXT:
        - Industry/Vertical: ${settings.vertical}
        - Action Buttons: Approve="${settings.approve_label}", Reject="${settings.reject_label}"

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

        const text = typeof response.data?.text === 'string'
            ? response.data.text
            : typeof response.data === 'string'
                ? response.data
                : ""

        return { success: true, text }

    } catch (error: unknown) {
        return quoteCopyFailure(error)
    }
}
