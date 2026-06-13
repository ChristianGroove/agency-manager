"use server"
import { MetaProvider } from "@/modules/features/messaging/providers/meta-provider"
import { MessagingPersistence } from "@/modules/features/messaging/services/persistence"
import { createClient } from "@/modules/core/database/supabase-server";

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
        const { data: cart } = await (await createClient())
            .from('deal_carts')
            .select('lead_id, organization_id')
            .eq('id', context.cartId)
            .single()

        if (!cart?.organization_id) {
            throw new Error("Cart not found")
        }

        // 2. Update cart status to approved
        await (await createClient())
            .from('deal_carts')
            .update({ status: 'approved' })
            .eq('id', context.cartId)
            .eq('organization_id', cart.organization_id)

        // 3. Update associated lead's pipeline stage (if configured)
        if (cart?.lead_id) {
            // Find "won" stage
            const { data: stage } = await (await createClient())
                .from('pipeline_stages')
                .select('id')
                .eq('organization_id', cart.organization_id)
                .eq('name', 'won')
                .limit(1)
                .single()

            if (stage) {
                await (await createClient())
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
        const { data: conversation } = await (await createClient())
            .from('conversations')
            .select('organization_id')
            .eq('id', context.conversationId)
            .single()

        if (!conversation) {
            throw new Error("Conversation not found")
        }



        let settings = null

        // Try org-specific lookup first
        const { data: orgSettings, error: settingsError } = await (await createClient())
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



        // 2. Build interactive list message
        const listMessage = {
            type: 'interactive' as const,
            interactive: {
                type: 'list',
                header: {
                    type: 'text',
                    text: '¿Por qué rechaza la cotización?'
                },
                body: {
                    text: 'Por favor seleccione una razón para ayudarnos a mejorar.'
                },
                action: {
                    button: 'Ver Opciones',
                    sections: [{
                        title: 'Razones',
                        rows: reasons.map((reason: string, idx: number) => ({
                            id: `rejection_reason_${context.cartId}_${idx}`,
                            title: reason.substring(0, 24), // WhatsApp limit
                            description: reason.length > 24 ? reason : undefined
                        }))
                    }]
                }
            }
        }

        // 3. Get connection credentials to send via Meta


        // If connectionId is missing, try to get it from conversation
        let connectionId = context.connectionId
        if (!connectionId) {
            const { data: convData } = await (await createClient())
                .from('conversations')
                .select('connection_id')
                .eq('id', context.conversationId)
                .eq('organization_id', conversation.organization_id)
                .single()
            connectionId = convData?.connection_id || ''

        }

        if (!connectionId) {
            throw new Error("No connection ID available")
        }

        let connection = null

        // Try direct lookup first
        const { data: directConn } = await (await createClient())
            .from('integration_connections')
            .select('*, credentials')
            .eq('id', connectionId)
            .eq('organization_id', conversation.organization_id)
            .single()

        connection = directConn

        // Fallback: find any active meta_whatsapp connection
        if (!connection) {

            const { data: fallbackConns, error: fallbackError } = await (await createClient())
                .from('integration_connections')
                .select('*, credentials')
                .in('provider_key', ['meta_whatsapp', 'whatsapp_cloud'])
                .eq('organization_id', conversation.organization_id)
                .eq('status', 'active')
                .limit(1)

            if (fallbackError) {
                logQuoteHandlerError(`[QuoteHandler] Fallback query error:`, fallbackError)
            }


            connection = fallbackConns?.[0] || null
        }

        if (!connection) {
            throw new Error("No active WhatsApp connection found")
        }



        // Decrypt credentials
        const { decryptObject } = await import('@/modules/infrastructure/integrations/encryption')
        let creds = connection.credentials || {}
        if (typeof creds === 'string') {
            try { creds = JSON.parse(creds) } catch (e) { }
        }
        creds = decryptObject(creds)

        const accessToken = creds.accessToken || creds.apiToken || creds.access_token || ''
        const phoneNumberId = creds.phoneNumberId || creds.phone_number_id || connection.metadata?.asset_id || connection.metadata?.phone_number_id || ''



        if (!accessToken || !phoneNumberId) {
            throw new Error("Missing WhatsApp credentials")
        }

        // 4. Send the list message
        const provider = new MetaProvider(accessToken, phoneNumberId, '')
        const result = await provider.sendMessage({
            to: context.recipientPhone,
            content: {
                type: 'interactive_list',
                body: 'Por favor seleccione una razón para ayudarnos a mejorar.',
                header: '¿Por qué rechaza la cotización?',
                buttonText: 'Ver Opciones',
                sections: [{
                    title: 'Razones',
                    rows: reasons.map((reason: string, idx: number) => ({
                        id: `rejection_reason_${context.cartId}_${idx}`,
                        title: reason.substring(0, 24)
                    }))
                }]
            }
        })

        if (!result.success) {
            throw new Error("Failed to send rejection list: " + result.error)
        }

        // 5. Save outbound message to chat
        await MessagingPersistence.saveOutboundMessage({
            conversationId: context.conversationId,
            content: {
                type: 'text',
                text: '📋 Se ha enviado un formulario para conocer el motivo del rechazo.'
            },
            messageId: result.messageId || 'unknown',
            sender: 'sent', // The original code used 'sent' as sender_id, which is weird but I'll keep the intent
            channel: 'whatsapp'
        })


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
        const { data: conv } = await (await createClient())
            .from('conversations')
            .select('phone, organization_id, connection_id')
            .eq('id', conversationId)
            .single()

        if (!conv?.phone) {
            console.error("[QuoteHandler] No phone found for conversation")
            return { success: false, error: "No phone found" }
        }

        // 2. Update cart with rejection reason and status
        await (await createClient())
            .from('deal_carts')
            .update({
                status: 'rejected'
            })
            .eq('id', cartId)
            .eq('organization_id', conv.organization_id)

        // 3. Get quote settings for configurable message
        let settings = null

        const { data: orgSettings } = await (await createClient())
            .from('quote_settings')
            .select('actions_config')
            .eq('organization_id', conv.organization_id)
            .single()

        settings = orgSettings

        const ackMessage = settings?.actions_config?.reject?.acknowledgment_message ||
            `Gracias por su respuesta. Hemos registrado: "${reason}". Un asesor se comunicará pronto.`

        // 4. Get connection to send via WhatsApp
        const { data: connections } = await (await createClient())
            .from('integration_connections')
            .select('*, credentials')
            .in('provider_key', ['meta_whatsapp', 'whatsapp_cloud'])
            .eq('organization_id', conv.organization_id)
            .eq('status', 'active')
            .limit(1)

        const connection = connections?.[0]
        if (connection) {
            const { decryptObject } = await import('@/modules/infrastructure/integrations/encryption')
            let creds = connection.credentials || {}
            if (typeof creds === 'string') {
                try { creds = JSON.parse(creds) } catch (e) { }
            }
            creds = decryptObject(creds)

            const accessToken = creds.accessToken || creds.apiToken || ''
            const phoneNumberId = creds.phoneNumberId || creds.phone_number_id || (connection as any).metadata?.asset_id || (connection as any).metadata?.phone_number_id || ''

            if (accessToken && phoneNumberId) {
                const provider = new MetaProvider(accessToken, phoneNumberId, '')
                const result = await provider.sendMessage({
                    to: conv.phone,
                    content: {
                        type: 'text',
                        text: ackMessage.replace('${reason}', reason)
                    }
                })



                // Save to inbox
                await MessagingPersistence.saveOutboundMessage({
                    conversationId,
                    content: { type: 'text', text: ackMessage.replace('${reason}', reason) },
                    messageId: result.messageId || 'ack_' + Date.now(),
                    sender: 'sent',
                    channel: 'whatsapp'
                })
            }
        }


        return { success: true }
    } catch (error: any) {
        return quoteHandlerFailure("[QuoteHandler] Rejection reason error:", error, PUBLIC_REJECTION_REASON_ERROR)
    }
}
