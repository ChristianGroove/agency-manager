"use server"

import { supabaseAdmin } from "@/lib/supabase-admin"
import { MetaProvider } from "@/modules/core/messaging/providers/meta-provider"
import { inboxService } from "@/modules/core/messaging/inbox-service"

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

/**
 * Handle Quote Approval
 * - Update deal/cart status to "won"
 * - Send confirmation message
 * - Notify team
 */
export async function handleQuoteApproval(context: QuoteResponseContext) {


    try {
        // 1. Update cart status to approved
        await supabaseAdmin
            .from('deal_carts')
            .update({ status: 'approved' })
            .eq('id', context.cartId)

        // 2. Update associated lead's pipeline stage (if configured)
        const { data: cart } = await supabaseAdmin
            .from('deal_carts')
            .select('lead_id')
            .eq('id', context.cartId)
            .single()

        if (cart?.lead_id) {
            // Find "won" stage
            const { data: stage } = await supabaseAdmin
                .from('pipeline_stages')
                .select('id')
                .eq('name', 'won')
                .limit(1)
                .single()

            if (stage) {
                await supabaseAdmin
                    .from('leads')
                    .update({ stage_id: stage.id })
                    .eq('id', cart.lead_id)
            }
        }

        // 3. Send confirmation message (optional)
        // await sendConfirmationMessage(context, "¡Gracias! Tu cotización ha sido aprobada. ✅")


        return { success: true }
    } catch (error: any) {
        console.error("[QuoteHandler] Approval error:", error.message)
        return { success: false, error: error.message }
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
            .select('organization_id')
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

        // Fallback: get any available quote_settings if org-specific not found
        if (!settings) {

            const { data: fallbackSettings } = await supabaseAdmin
                .from('quote_settings')
                .select('actions_config')
                .limit(1)
                .single()

            settings = fallbackSettings
        }

        if (settingsError && !settings) {
            console.error(`[QuoteHandler] Settings fetch error:`, settingsError.message)
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
            const { data: convData } = await supabaseAdmin
                .from('conversations')
                .select('connection_id')
                .eq('id', context.conversationId)
                .single()
            connectionId = convData?.connection_id || ''

        }

        if (!connectionId) {
            throw new Error("No connection ID available")
        }

        let connection = null

        // Try direct lookup first
        const { data: directConn } = await supabaseAdmin
            .from('integration_connections')
            .select('credentials')
            .eq('id', connectionId)
            .single()

        connection = directConn

        // Fallback: find any active meta_whatsapp connection
        if (!connection) {

            const { data: fallbackConns, error: fallbackError } = await supabaseAdmin
                .from('integration_connections')
                .select('credentials')
                .eq('provider_key', 'meta_whatsapp')
                .eq('status', 'active')
                .limit(1)

            if (fallbackError) {
                console.error(`[QuoteHandler] Fallback query error:`, fallbackError.message)
            }


            connection = fallbackConns?.[0] || null
        }

        if (!connection) {
            throw new Error("No active WhatsApp connection found")
        }



        // Decrypt credentials
        const { decryptCredentials } = await import('@/modules/core/integrations/encryption')
        let creds = connection.credentials || {}
        if (typeof creds === 'string') {
            try { creds = JSON.parse(creds) } catch (e) { }
        }
        creds = decryptCredentials(creds)

        const accessToken = creds.accessToken || creds.apiToken || creds.access_token || ''
        const phoneNumberId = creds.phoneNumberId || creds.phone_number_id || ''



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
        await inboxService.saveOutboundMessage(
            context.conversationId,
            {
                type: 'text',
                text: '📋 Se ha enviado un formulario para conocer el motivo del rechazo.'
            },
            result.messageId || 'unknown',
            'sent'
        )


        return { success: true }
    } catch (error: any) {
        console.error("[QuoteHandler] Rejection error:", error.message)
        return { success: false, error: error.message }
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
        // 1. Update cart with rejection reason and status
        await supabaseAdmin
            .from('deal_carts')
            .update({
                status: 'rejected'
            })
            .eq('id', cartId)

        // 2. Get conversation info for sending message
        const { data: conv } = await supabaseAdmin
            .from('conversations')
            .select('phone, organization_id, connection_id')
            .eq('id', conversationId)
            .single()

        if (!conv?.phone) {
            console.error("[QuoteHandler] No phone found for conversation")
            return { success: false, error: "No phone found" }
        }

        // 3. Get quote settings for configurable message
        let settings = null

        const { data: orgSettings } = await supabaseAdmin
            .from('quote_settings')
            .select('actions_config')
            .eq('organization_id', conv.organization_id)
            .single()

        settings = orgSettings

        // Fallback: get any available quote_settings
        if (!settings) {
            const { data: fallbackSettings } = await supabaseAdmin
                .from('quote_settings')
                .select('actions_config')
                .limit(1)
                .single()
            settings = fallbackSettings
        }

        const ackMessage = settings?.actions_config?.reject?.acknowledgment_message ||
            `Gracias por su respuesta. Hemos registrado: "${reason}". Un asesor se comunicará pronto.`

        // 4. Get connection to send via WhatsApp
        const { data: connections } = await supabaseAdmin
            .from('integration_connections')
            .select('credentials')
            .eq('provider_key', 'meta_whatsapp')
            .eq('status', 'active')
            .limit(1)

        const connection = connections?.[0]
        if (connection) {
            const { decryptCredentials } = await import('@/modules/core/integrations/encryption')
            let creds = connection.credentials || {}
            if (typeof creds === 'string') {
                try { creds = JSON.parse(creds) } catch (e) { }
            }
            creds = decryptCredentials(creds)

            const accessToken = creds.accessToken || creds.apiToken || ''
            const phoneNumberId = creds.phoneNumberId || creds.phone_number_id || ''

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
                await inboxService.saveOutboundMessage(
                    conversationId,
                    { type: 'text', text: ackMessage.replace('${reason}', reason) },
                    result.messageId || 'ack_' + Date.now(),
                    'sent'
                )
            }
        }


        return { success: true }
    } catch (error: any) {
        console.error("[QuoteHandler] Rejection reason error:", error.message)
        return { success: false, error: error.message }
    }
}
