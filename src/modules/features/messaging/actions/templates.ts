"use server"

import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { revalidatePath } from "next/cache"

// Meta Structure Types
export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION'
export type TemplateStatus = 'APPROVED' | 'REJECTED' | 'PENDING' | 'PAUSED' | 'DISABLED'

export interface TemplateButton {
    type: 'QUICK_REPLY' | 'PHONE_NUMBER' | 'URL'
    text: string
    url?: string // For URL buttons
    phone_number?: string // For Phone buttons
}

export interface TemplateComponent {
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS' | 'UI_METADATA'
    format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'JSON'
    text?: string
    buttons?: TemplateButton[]
    example?: {
        header_handle?: string[]
        header_url?: string[]
        body_text?: string[][]
    }
    pixy_media_url?: string
}

export interface MessageTemplate {
    id: string
    organization_id: string
    channel_id: string | null
    name: string
    category: TemplateCategory
    language: string
    components: TemplateComponent[]
    status: TemplateStatus
    meta_id?: string
    created_at: string
    content: string
}

/**
 * Get templates for the current organization, optionally filtered by channel
 */
export async function getTemplates(channelId?: string): Promise<MessageTemplate[]> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Organization context required")

    const supabase = await createClient()
    let query = supabase
        .from('messaging_templates')
        .select('*')
        .eq('organization_id', orgId)

    if (channelId) {
        query = query.eq('channel_id', channelId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data || []) as MessageTemplate[]
}

export async function createTemplate(input: {
    name: string
    category: TemplateCategory
    language: string
    components: TemplateComponent[]
    channel_id?: string
}) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Organization context required")

    const supabase = await createClient()
    const { data, error } = await supabase
        .from("messaging_templates")
        .insert({
            organization_id: orgId,
            name: input.name,
            category: input.category,
            language: input.language,
            components: input.components,
            status: 'PENDING',
            channel_id: input.channel_id || null,
            content: extractBodyText(input.components) // Legacy fallback for snippets
        })
        .select()
        .single()

    if (error) throw new Error(error.message)
    revalidatePath("/crm/settings/templates")
    return data
}

export async function updateTemplate(id: string, input: Partial<MessageTemplate>) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Organization context required")

    const supabase = await createClient()

    // If components update, update legacy content preview too
    const updates: any = { ...input }
    if (input.components) {
        updates.content = extractBodyText(input.components)
    }

    const { error } = await supabase
        .from("messaging_templates")
        .update(updates)
        .eq("id", id)
        .eq("organization_id", orgId)

    if (error) throw new Error(error.message)
    revalidatePath("/crm/settings/templates")
}

export async function deleteTemplate(id: string) {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Organization context required")

    const supabase = await createClient()
    const { error } = await supabase
        .from("messaging_templates")
        .delete()
        .eq("id", id)
        .eq("organization_id", orgId)

    if (error) throw new Error(error.message)
    revalidatePath("/crm/settings/templates")
}

// Helper to extract plain text for legacy list view
function extractBodyText(components: TemplateComponent[]): string {
    const body = components.find(c => c.type === 'BODY')
    return body?.text || "Sin contenido de texto"
}

// â”€â”€â”€ META GRAPH API INTEGRATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const META_API_VERSION = 'v24.0'
const META_GRAPH_URL = 'https://graph.facebook.com'

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function sanitizeTemplateActionLogDetails(details: Record<string, unknown> = {}) {
    const sensitiveKeys = new Set([
        'accessToken',
        'channelId',
        'connectionId',
        'metadataAssetId',
        'metadataWabaId',
        'orgId',
        'phoneNumberId',
        'templateId',
        'templateName',
        'url',
        'wabaId',
    ])

    return Object.fromEntries(
        Object.entries(details).map(([key, value]) => {
            if (key === 'templateNames' && Array.isArray(value)) {
                return ['templateNamesCount', value.length]
            }

            if (sensitiveKeys.has(key)) {
                return [`${key}Present`, Boolean(value)]
            }

            return [key, value]
        })
    )
}

function summarizeTemplateActionError(error: unknown) {
    if (error instanceof Error) {
        return { name: error.name }
    }

    if (error && typeof error === 'object') {
        const graphError = 'error' in error ? (error as { error?: Record<string, unknown> }).error : error as Record<string, unknown>

        return {
            type: graphError?.type,
            code: graphError?.code,
            subcode: graphError?.error_subcode || graphError?.subcode,
            hasMessage: typeof graphError?.message === 'string' && graphError.message.length > 0,
        }
    }

    return { type: typeof error }
}

function logTemplateActionInfo(label: string, details: Record<string, unknown> = {}) {
    if (!isDeployedRuntime()) {
        console.log(label, details)
        return
    }

    console.log(label, sanitizeTemplateActionLogDetails(details))
}

function logTemplateActionError(label: string, error: unknown, details: Record<string, unknown> = {}) {
    if (!isDeployedRuntime()) {
        if (Object.keys(details).length > 0) console.error(label, error, details)
        else console.error(label, error)
        return
    }

    console.error(label, {
        ...sanitizeTemplateActionLogDetails(details),
        detail: summarizeTemplateActionError(error),
    })
}

/**
 * Resolves the WABA ID and Access Token for a specific connection or the primary one
 */
async function resolveMetaCredentials(orgId: string, channelId?: string): Promise<{ wabaId: string, accessToken: string, phoneNumberId: string, connectionId: string }> {
    const supabase = await createClient()

    // 1. Find the active Meta/WhatsApp connection
    let query = supabase
        .from('integration_connections')
        .select('*')
        .eq('organization_id', orgId)
        .in('provider_key', ['meta_whatsapp', 'whatsapp_cloud'])
        .eq('status', 'active')

    if (channelId) {
        query = query.eq('id', channelId)
    } else {
        // Default to the one marked as primary (if any) or the most recent
        query = query.order('created_at', { ascending: false })
    }

    const { data: connection, error: connError } = await query.limit(1).maybeSingle()

    if (connError || !connection) {
        logTemplateActionError('[resolveMetaCredentials] No connection found:', connError, { orgId, channelId })
        throw new Error("No active WhatsApp connection. Configure one in Settings > Integrations.")
    }

    // 2. Decrypt credentials
    const { decryptObject } = await import('@/modules/infrastructure/integrations/encryption')
    let creds = connection.credentials as any
    if (typeof creds === 'string') {
        try { creds = JSON.parse(creds) } catch (e) { /* noop */ }
    }
    creds = decryptObject(creds)

    // 3. Extract metadata (NOT encrypted â€” stored as plain jsonb)
    const metadata = connection.metadata as any || {}

    logTemplateActionInfo('[resolveMetaCredentials] Connection', {
        connectionId: connection.id,
        providerKey: connection.provider_key,
        hasCredentials: !!creds,
        credentialKeys: creds ? Object.keys(creds) : [],
        hasMetadata: !!metadata,
        metadataKeys: metadata ? Object.keys(metadata) : [],
        metadataWabaId: metadata?.waba_id,
        metadataAssetId: metadata?.asset_id,
    })

    // 4. Resolve access token (credentials â†’ env var)
    const accessToken = creds?.accessToken
        || creds?.access_token
        || process.env.META_API_TOKEN
        || process.env.META_ACCESS_TOKEN

    // 5. Resolve WABA ID (credentials â†’ metadata â†’ env var)
    const wabaId = creds?.wabaId
        || creds?.waba_id
        || metadata?.waba_id
        || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
        || process.env.WABA_ID

    // 6. Resolve Phone Number ID (credentials â†’ metadata â†’ env var)
    const phoneNumberId = creds?.phoneNumberId
        || creds?.phone_number_id
        || metadata?.asset_id
        || process.env.META_PHONE_NUMBER_ID

    if (!accessToken) {
        throw new Error("Missing Meta access token. Check connection credentials.")
    }
    if (!wabaId) {
        throw new Error(`Missing WABA ID. Available metadata: ${JSON.stringify(Object.keys(metadata))}. Please re-connect WhatsApp.`)
    }

    return {
        wabaId,
        accessToken,
        phoneNumberId: phoneNumberId || '',
        connectionId: connection.id
    }
}

/**
 * Sync templates FROM Meta Graph API into local DB
 * GET /{WABA_ID}/message_templates
 */
export async function syncTemplatesFromMeta(channelId?: string): Promise<{ synced: number, errors: string[] }> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Organization context required")

    const { wabaId, accessToken, connectionId } = await resolveMetaCredentials(orgId, channelId)

    const url = `${META_GRAPH_URL}/${META_API_VERSION}/${wabaId}/message_templates?fields=name,status,category,language,components&limit=100`
    logTemplateActionInfo('[syncTemplatesFromMeta] Fetching templates', { url, wabaId })

    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        cache: 'no-store'
    })

    if (!response.ok) {
        const err = await response.json()
        logTemplateActionError('[syncTemplatesFromMeta] Meta API Error:', err, { wabaId })
        throw new Error(err?.error?.message || 'Failed to fetch templates from Meta')
    }

    const result = await response.json()
    const metaTemplates = result.data || []
    logTemplateActionInfo('[syncTemplatesFromMeta] Templates fetched from Meta', {
        templateCount: metaTemplates.length,
        templateNames: metaTemplates.map((t: any) => `${t.name} (${t.language}) [${t.status}]`),
    })

    const supabase = await createClient()
    let synced = 0
    const errors: string[] = []

    for (const mt of metaTemplates) {
        try {
            const { error: upsertError } = await supabase
                .from('messaging_templates')
                .upsert({
                    organization_id: orgId,
                    channel_id: connectionId, // Link to specific connection
                    name: mt.name,
                    category: mt.category,
                    language: mt.language,
                    status: mt.status,
                    components: mt.components,
                    meta_id: mt.id,
                    content: extractBodyText(mt.components),
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'organization_id,channel_id,name,language'
                })

            if (upsertError) {
                throw new Error(upsertError.message)
            }
            synced++
        } catch (e: any) {
            errors.push(`${mt.name}: ${e.message}`)
        }
    }

    revalidatePath("/crm/settings/templates")
    return { synced, errors }
}

/**
 * Submit a template TO Meta for approval
 * POST /{WABA_ID}/message_templates
 */
export async function submitTemplateToMeta(templateId: string, channelId?: string): Promise<{ success: boolean, metaId?: string, error?: string }> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Organization context required")

    const supabase = await createClient()
    const { wabaId, accessToken } = await resolveMetaCredentials(orgId, channelId)
    const { data: template } = await supabase
        .from('messaging_templates')
        .select('*')
        .eq('id', templateId)
        .eq('organization_id', orgId)
        .single()

    if (!template) throw new Error("Template not found")

    // Build Meta-compatible components (strip UI_METADATA)
    const metaComponents = ((template as any).components || [])
        .filter((c: any) => c.type !== 'UI_METADATA')
        .map((c: any) => {
            const comp: any = { type: c.type }
            
            // Format is only allowed for HEADER components
            if (c.format && c.type === 'HEADER') comp.format = c.format
            
            if (c.text) comp.text = c.text
            if (c.buttons) comp.buttons = c.buttons
            if (c.example) comp.example = c.example
            // Meta's Cloud API does not accept header_url for media examples, and requires a Resumable Upload handle.
            // Since we don't have App ID for the handle, we omit the example for media headers to avoid Invalid Parameter errors.
            if (c.type === 'HEADER' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(c.format)) {
                if (comp.example) delete comp.example
            }
            return comp
        })

    const payload = {
        name: template.name,
        category: template.category,
        language: template.language,
        components: metaComponents
    }

    const url = `${META_GRAPH_URL}/${META_API_VERSION}/${wabaId}/message_templates`

    // === DIAGNOSTIC: Log full payload ===
    console.log('[submitTemplateToMeta] DIAGNOSTIC - URL:', url)
    console.log('[submitTemplateToMeta] DIAGNOSTIC - Full payload:', JSON.stringify(payload, null, 2))

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })

    const result = await response.json()

    // === DIAGNOSTIC: Log full Meta response ===
    console.log('[submitTemplateToMeta] DIAGNOSTIC - Meta Response Status:', response.status)
    console.log('[submitTemplateToMeta] DIAGNOSTIC - Meta Response Body:', JSON.stringify(result, null, 2))

    if (!response.ok) {
        const errorMsg = result?.error?.error_user_msg || result?.error?.error_data?.details || result?.error?.message || 'Failed to submit template to Meta'
        console.error('[submitTemplateToMeta] DIAGNOSTIC - Error details:', result?.error?.error_data)
        // Update local status
        await supabase
            .from('messaging_templates')
            .update({ status: 'REJECTED' })
            .eq('id', templateId)

        revalidatePath("/crm/settings/templates")
        return { success: false, error: errorMsg }
    }

    // Update local with Meta's ID and PENDING status
    await supabase
        .from('messaging_templates')
        .update({
            meta_id: result.id,
            status: result.status || 'PENDING'
        })
        .eq('id', templateId)

    revalidatePath("/crm/settings/templates")
    return { success: true, metaId: result.id }
}

/**
 * Delete a template FROM Meta and local DB
 * DELETE /{WABA_ID}/message_templates?name={name}
 */
export async function deleteTemplateFromMeta(templateId: string, channelId?: string): Promise<{ success: boolean, error?: string }> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Organization context required")

    const supabase = await createClient()
    const { wabaId, accessToken } = await resolveMetaCredentials(orgId, channelId)
    const { data: template } = await supabase
        .from('messaging_templates')
        .select('*')
        .eq('id', templateId)
        .eq('organization_id', orgId)
        .single()

    if (!template) throw new Error("Template not found")

    // Only attempt Meta deletion if we have a meta_id (was submitted to Meta)
    if (template.meta_id) {
        try {
            const { wabaId, accessToken } = await resolveMetaCredentials(orgId)
            const url = `${META_GRAPH_URL}/${META_API_VERSION}/${wabaId}/message_templates?name=${template.name}`
            const response = await fetch(url, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })

            if (!response.ok) {
                const err = await response.json()
                logTemplateActionError('[deleteTemplateFromMeta] Meta API error:', err, {
                    templateId,
                    templateName: template.name,
                    wabaId,
                })
                // Continue with local deletion even if Meta fails
            }
        } catch (e: any) {
            logTemplateActionError('[deleteTemplateFromMeta] Meta deletion failed:', e, {
                templateId,
                templateName: template.name,
            })
        }
    }

    // Always delete locally
    const { error } = await supabase
        .from('messaging_templates')
        .delete()
        .eq('id', templateId)
        .eq('organization_id', orgId)

    if (error) throw new Error(error.message)

    revalidatePath("/crm/settings/templates")
    return { success: true }
}

/**
 * Resolves the channel_id for a given conversation.
 */
async function getChannelIdForConversation(conversationId: string): Promise<string | null> {
    const supabase = await createClient()
    const { data } = await supabase
        .from('conversations')
        .select('connection_id')
        .eq('id', conversationId)
        .single()
    return data?.connection_id || null
}

/**
 * Get templates specifically approved for the channel of a given conversation.
 */
export async function getTemplatesForConversation(conversationId: string): Promise<MessageTemplate[]> {
    const channelId = await getChannelIdForConversation(conversationId)
    if (!channelId) throw new Error("Conversation channel not found")
    return getTemplates(channelId)
}

/**
 * Sync templates for the specific WABA account associated with a given conversation.
 */
export async function syncTemplatesForConversation(conversationId: string): Promise<{ synced: number, errors: string[] }> {
    const channelId = await getChannelIdForConversation(conversationId)
    if (!channelId) throw new Error("Conversation channel not found")
    return syncTemplatesFromMeta(channelId)
}
