"use server"

import { outboundService } from '@/modules/features/messaging/outbound-service'
import { supabaseAdmin } from "@/modules/core/database/supabase-admin";

/**
 * Quote Response Handler
 * Handles approve/reject button clicks from Interactive Quotes
 */

interface QuoteResponseContext {
    conversationId: string
    cartId: string
    connectionId: string
    recipientPhone: string
}

const PUBLIC_QUOTE_APPROVAL_ERROR = "No se pudo aprobar la cotizacion"
const PUBLIC_QUOTE_REJECTION_ERROR = "No se pudo procesar el rechazo de la cotizacion"
const PUBLIC_REJECTION_REASON_ERROR = "No se pudo guardar la razon de rechazo"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizeQuoteHandlerError(error: unknown) {
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

function logQuoteHandlerError(label: string, error: unknown) {
    console.error(label, isDeployedRuntime() ? summarizeQuoteHandlerError(error) : error)
}

function quoteHandlerFailure(label: string, error: unknown, fallback: string) {
    logQuoteHandlerError(label, error)
    if (isDeployedRuntime()) return { success: false, error: fallback }
    if (error instanceof Error) return { success: false, error: error.message }
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        return { success: false, error: error.message }
    }
    return { success: false, error: fallback }
}

/**
 * Handle Quote Approval
 * - Update deal/cart status to "won"
 * - Send confirmation message
 * - Notify team
 */
export async function handleQuoteApproval(context: QuoteResponseContext) {


    try {
        // 1. Resolve cart tenant before applying privileged writes
        const { data: cart } = await supabaseAdmin
            .from('deal_carts')
            .select('lead_id, organization_id')
            .eq('id', context.cartId)
            .single()

        if (!cart?.organization_id) {
            throw new Error("Cart not found")
        }

        // 2. Update cart status to approved
        await supabaseAdmin
            .from('deal_carts')
            .update({ status: 'approved' })
            .eq('id', context.cartId)
            .eq('organization_id', cart.organization_id)

        // 3. Update associated lead's pipeline stage (if configured)
        if (cart?.lead_id) {
            // Find "won" stage
            const { data: stage } = await supabaseAdmin
                .from('pipeline_stages')
                .select('id')
                .eq('organization_id', cart.organization_id)
                .eq('name', 'won')
                .limit(1)
                .single()

            if (stage) {
                await supabaseAdmin
                    .from('leads')
                    .update({ stage_id: stage.id })
                    .eq('id', cart.lead_id)
                    .eq('organization_id', cart.organization_id)
            }
        }

        // 4. Send confirmation message (optional)
        // await sendConfirmationMessage(context, "¡Gracias! Tu cotización ha sido aprobada. ✅")


        return { success: true }
    } catch (error: any) {
        return quoteHandlerFailure("[QuoteHandler] Approval error:", error, PUBLIC_QUOTE_APPROVAL_ERROR)
    }
}

/**
 * Handle Quote Rejection - Phase 1
 * - Fetch rejection reasons from quote_settings
 * - Send interactive list with options
 */
export async function handleQuoteRejection(context: QuoteResponseContext) {


    try {
        // 1. Get the organization's quote settings
        const { data: conversation } = await supabaseAdmin
            .from('conversations')
            .select('id, phone, organization_id, connection_id')
            .eq('id', context.conversationId)
            .single()

        if (!conversation) {
            throw new Error("Conversation not found")
        }



        let settings = null

        // Try org-specific lookup first
        const { data: orgSettings, error: settingsError } = await supabaseAdmin
            .from('quote_settings')
            .select('actions_config')
            .eq('organization_id', conversation.organization_id)
            .single()

        settings = orgSettings

        if (settingsError && !settings) {
            logQuoteHandlerError(`[QuoteHandler] Settings fetch error:`, settingsError)
        }



        const reasons = settings?.actions_config?.reject?.reasons || [
            "Precio muy alto",
            "No es lo que busco",
            "Otro"
        ]



        if (!conversation.connection_id || (context.connectionId && context.connectionId !== conversation.connection_id)) {
            throw new Error('La conversación no tiene el canal de WhatsApp esperado')
        }
        if (!conversation.phone) throw new Error('La conversación no tiene destinatario')
        await outboundService.sendMessage(conversation.connection_id, conversation.phone, {
            type: 'interactive_list',
            body: 'Por favor seleccione una razón para ayudarnos a mejorar.',
            header: '¿Por qué rechaza la cotización?',
            buttonText: 'Ver Opciones',
            sections: [{ title: 'Razones', rows: reasons.map((reason: string, idx: number) => ({
                id: `rejection_reason_${context.cartId}_${idx}`, title: reason.substring(0, 24),
            })) }],
        }, conversation.organization_id, { conversation, sender: 'System', requiredChannel: 'whatsapp' })
        return { success: true }
    } catch (error: any) {
        return quoteHandlerFailure("[QuoteHandler] Rejection error:", error, PUBLIC_QUOTE_REJECTION_ERROR)
    }
}

/**
 * Handle Rejection Reason Selected - Phase 2
 * - Store the selected reason
 * - Update cart with rejection info
 * - Optionally notify team
 */
export async function handleRejectionReasonSelected(
    cartId: string,
    reason: string,
    conversationId: string
) {


    try {
        // 1. Get conversation info for tenant scoping and messaging
        const { data: conv } = await supabaseAdmin
            .from('conversations')
            .select('id, phone, organization_id, connection_id')
            .eq('id', conversationId)
            .single()

        if (!conv?.phone) {
            console.error("[QuoteHandler] No phone found for conversation")
            return { success: false, error: "No phone found" }
        }

        // 2. Update cart with rejection reason and status
        const { data: updatedCart, error: cartError } = await supabaseAdmin
            .from('deal_carts')
            .update({
                status: 'rejected'
            })
            .eq('id', cartId)
            .eq('organization_id', conv.organization_id)
            .select('id').single()
        if (cartError || !updatedCart) throw new Error('La cotización no pertenece a esta organización')

        // 3. Get quote settings for configurable message
        let settings = null

        const { data: orgSettings } = await supabaseAdmin
            .from('quote_settings')
            .select('actions_config')
            .eq('organization_id', conv.organization_id)
            .single()

        settings = orgSettings

        const ackMessage = settings?.actions_config?.reject?.acknowledgment_message ||
            `Gracias por su respuesta. Hemos registrado: "${reason}". Un asesor se comunicará pronto.`

        if (!conv.connection_id) throw new Error('La conversación no tiene un canal vinculado')
        await outboundService.sendMessage(conv.connection_id, conv.phone, {
            type: 'text', text: ackMessage.replace('${reason}', reason),
        }, conv.organization_id, { conversation: conv, sender: 'System', requiredChannel: 'whatsapp' })
        return { success: true }
    } catch (error: any) {
        return quoteHandlerFailure("[QuoteHandler] Rejection reason error:", error, PUBLIC_REJECTION_REASON_ERROR)
    }
}
