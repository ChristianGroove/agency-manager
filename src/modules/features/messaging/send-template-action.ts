"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions/crud"
import { revalidatePath } from "next/cache"
import { MessagingPersistence } from "./services/persistence"

const PUBLIC_SEND_TEMPLATE_ERROR = 'Template message send failed'
const PUBLIC_CONVERSATION_NOT_FOUND_ERROR = 'Conversation not found'

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || !!process.env.VERCEL_ENV
}

function publicTemplateMessageError(error: unknown, fallback = PUBLIC_SEND_TEMPLATE_ERROR) {
    if (isDeployedRuntime()) return fallback
    if (typeof error === 'string' && error) return error
    if (error instanceof Error && error.message) return error.message
    if (error && typeof error === 'object' && typeof (error as { message?: unknown }).message === 'string') {
        return (error as { message: string }).message
    }
    return fallback
}

function sanitizeTemplateLogDetails(details: Record<string, unknown> = {}) {
    const sensitiveKeys = new Set([
        'bodyParameters',
        'headerParameters',
        'messageId',
        'phoneNumberId',
        'recipientPhone',
        'to',
    ])

    return Object.fromEntries(
        Object.entries(details).map(([key, value]) => {
            if (sensitiveKeys.has(key)) {
                return [`${key}Present`, Boolean(value)]
            }

            return [key, value]
        })
    )
}

function summarizeTemplateError(error: unknown) {
    if (error instanceof Error) {
        return { name: error.name }
    }

    if (error && typeof error === 'object') {
        const graphError = 'error' in error ? (error as any).error : error
        return {
            type: graphError?.type || 'object',
            code: graphError?.code,
            subcode: graphError?.error_subcode || graphError?.subcode,
            hasMessage: typeof graphError?.message === 'string' && graphError.message.length > 0,
        }
    }

    return { type: typeof error }
}

function logTemplateInfo(label: string, details: Record<string, unknown> = {}) {
    if (!isDeployedRuntime()) {
        console.log(label, details)
        return
    }

    console.log(label, sanitizeTemplateLogDetails(details))
}

function logTemplateError(label: string, error: unknown, details: Record<string, unknown> = {}) {
    if (!isDeployedRuntime()) {
        console.error(label, error, details)
        return
    }

    console.error(label, {
        ...sanitizeTemplateLogDetails(details),
        detail: summarizeTemplateError(error),
    })
}

/**
 * Send a WhatsApp HSM Template Message via Meta Graph API v24.0
 * 
 * This action resolves the org's Meta connection, builds the template payload,
 * and sends it via POST /{phone_number_id}/messages.
 */
export async function sendTemplateMessage(input: {
    conversationId: string
    templateName: string
    templateLanguage: string
    bodyParameters: string[]       // Values for {{1}}, {{2}}, etc.
    headerParameters?: string[]    // Header variable values (if any)
}) {
    const supabase = await createClient()

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "Unauthorized" }

    // 2. Fetch Conversation with Lead phone
    const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select(`*, leads ( phone, name )`)
        .eq('id', input.conversationId)
        .eq('organization_id', orgId)
        .single()

    if (convError || !conversation) {
        throw new Error(publicTemplateMessageError(
            convError || `Conversation not found: ${input.conversationId}`,
            PUBLIC_CONVERSATION_NOT_FOUND_ERROR
        ))
    }

    const recipientPhone = conversation.leads?.phone || (conversation as any).phone
    if (!recipientPhone) return { success: false, error: "Contact has no phone number" }

    // 3. Resolve Meta Connection (same pattern as sendMessage)
    let connection = null
    if ((conversation as any).connection_id) {
        const { data: boundConn } = await supabase
            .from('integration_connections')
            .select('*')
            .eq('id', (conversation as any).connection_id)
            .eq('organization_id', orgId)
            .eq('status', 'active')
            .single()
        connection = boundConn
    }
    if (!connection) {
        const { data: defaultConn } = await supabase
            .from('integration_connections')
            .select('*')
            .eq('organization_id', orgId)
            .in('provider_key', ['meta_whatsapp', 'whatsapp_cloud'])
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
        connection = defaultConn
    }
    if (!connection) {
        return { success: false, error: "No active WhatsApp connection. Configure one in Settings > Integrations." }
    }

    // 4. Extract credentials
    const { decryptObject } = await import('@/modules/infrastructure/integrations/encryption')
    let creds = connection.credentials as any
    if (typeof creds === 'string') {
        try { creds = JSON.parse(creds) } catch (e) { /* noop */ }
    }
    creds = decryptObject(creds)

    const phoneNumberId = creds?.phoneNumberId || creds?.phone_number_id ||
        (connection as any).metadata?.asset_id
    const accessToken = creds?.accessToken || creds?.access_token

    if (!phoneNumberId || !accessToken) {
        // Fallback to env vars for mock/dev
        const envToken = process.env.META_API_TOKEN
        const envPhoneId = process.env.META_PHONE_NUMBER_ID
        if (!envToken || !envPhoneId) {
            return { success: false, error: "Missing Meta credentials. Please re-configure the channel." }
        }
    }

    const finalToken = accessToken || process.env.META_API_TOKEN!
    const finalPhoneId = phoneNumberId || process.env.META_PHONE_NUMBER_ID!

    // 5. Build HSM Template Payload (Graph API v24.0)
    const templateComponents: any[] = []

    // Header parameters (if any)
    if (input.headerParameters && input.headerParameters.length > 0) {
        templateComponents.push({
            type: "header",
            parameters: input.headerParameters.map(val => ({
                type: "text",
                text: val
            }))
        })
    }

    // Body parameters
    if (input.bodyParameters && input.bodyParameters.length > 0) {
        templateComponents.push({
            type: "body",
            parameters: input.bodyParameters.map(val => ({
                type: "text",
                text: val
            }))
        })
    }

    const metaPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientPhone.replace(/[^0-9]/g, ''),
        type: "template",
        template: {
            name: input.templateName,
            language: { code: input.templateLanguage },
            components: templateComponents
        }
    }

    logTemplateInfo('[sendTemplateMessage] Sending HSM:', {
        bodyParameterCount: input.bodyParameters?.length || 0,
        headerParameterCount: input.headerParameters?.length || 0,
        phoneNumberId: finalPhoneId,
        recipientPhone,
        templateLanguage: input.templateLanguage,
        templateName: input.templateName,
    })

    // 6. POST to Meta Graph API
    const { assertUsageAllowed } = await import("@/modules/infrastructure/usage/usage-limiter")
    await assertUsageAllowed({ organizationId: orgId, engine: 'messaging' })

    const apiUrl = `https://graph.facebook.com/v24.0/${finalPhoneId}/messages`
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${finalToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(metaPayload)
    })

    const result = await response.json()

    if (!response.ok) {
        logTemplateError('[sendTemplateMessage] Meta API Error:', result, {
            phoneNumberId: finalPhoneId,
            recipientPhone,
            templateLanguage: input.templateLanguage,
            templateName: input.templateName,
        })
        const errorMsg = result?.error?.message || result?.error?.error_user_msg || 'Failed to send template'
        return { success: false, error: publicTemplateMessageError(errorMsg) }
    }

    const messageId = result?.messages?.[0]?.id || `tmpl_${Date.now()}`
    logTemplateInfo('[sendTemplateMessage] Success:', {
        messageId,
        templateLanguage: input.templateLanguage,
        templateName: input.templateName,
    })

    // 7. Build preview text for DB storage
    let previewText = `ðŸ“‹ Plantilla: ${input.templateName}`
    if (input.bodyParameters.length > 0) {
        previewText += ` (${input.bodyParameters.join(', ')})`
    }

    // 8. Save to messages table
    const messageContent = {
        type: 'template',
        templateName: input.templateName,
        templateLanguage: input.templateLanguage,
        bodyParameters: input.bodyParameters,
        headerParameters: input.headerParameters,
        text: previewText
    }

    await MessagingPersistence.saveOutboundMessage({
        conversationId: input.conversationId,
        content: messageContent,
        sender: user.email || 'Agent',
        messageId: messageId,
        organizationId: orgId,
        channel: 'whatsapp'
    })

    revalidatePath('/inbox')
    return { success: true, messageId }
}

