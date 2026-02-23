"use server"

import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
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
        body_text?: string[][]
    }
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

export async function getTemplates() {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return []

    const supabase = await createClient()
    const { data } = await supabase
        .from("messaging_templates")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })

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

// ─── META GRAPH API INTEGRATION ───────────────────────────────────────

const META_API_VERSION = 'v24.0'
const META_GRAPH_URL = 'https://graph.facebook.com'

/**
 * Resolves the WABA ID and Access Token for the current organization's Meta connection
 */
async function resolveMetaCredentials(orgId: string): Promise<{ wabaId: string, accessToken: string, phoneNumberId: string }> {
    const supabase = await createClient()

    // 1. Find the active Meta/WhatsApp connection
    const { data: connection, error: connError } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('organization_id', orgId)
        .in('provider_key', ['meta_whatsapp', 'whatsapp_cloud'])
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (connError || !connection) {
        console.error('[resolveMetaCredentials] No connection found:', connError?.message)
        throw new Error("No active WhatsApp connection. Configure one in Settings > Integrations.")
    }

    // 2. Decrypt credentials
    const { decryptObject } = await import('@/modules/core/integrations/encryption')
    let creds = connection.credentials as any
    if (typeof creds === 'string') {
        try { creds = JSON.parse(creds) } catch (e) { /* noop */ }
    }
    creds = decryptObject(creds)

    // 3. Extract metadata (NOT encrypted — stored as plain jsonb)
    const metadata = connection.metadata as any || {}

    console.log('[resolveMetaCredentials] Connection:', {
        id: connection.id,
        provider_key: connection.provider_key,
        hasCredentials: !!creds,
        credentialKeys: creds ? Object.keys(creds) : [],
        hasMetadata: !!metadata,
        metadataKeys: metadata ? Object.keys(metadata) : [],
        metadataWabaId: metadata?.waba_id,
        metadataAssetId: metadata?.asset_id,
    })

    // 4. Resolve access token (credentials → env var)
    const accessToken = creds?.accessToken
        || creds?.access_token
        || process.env.META_API_TOKEN
        || process.env.META_ACCESS_TOKEN

    // 5. Resolve WABA ID (credentials → metadata → env var)
    const wabaId = creds?.wabaId
        || creds?.waba_id
        || metadata?.waba_id
        || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
        || process.env.WABA_ID

    // 6. Resolve Phone Number ID (credentials → metadata → env var)
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

    console.log('[resolveMetaCredentials] Resolved:', {
        wabaId,
        phoneNumberId: phoneNumberId || 'MISSING',
        tokenLength: accessToken?.length
    })

    return { wabaId, accessToken, phoneNumberId: phoneNumberId || '' }
}

/**
 * Sync templates FROM Meta Graph API into local DB
 * GET /{WABA_ID}/message_templates
 */
export async function syncTemplatesFromMeta(): Promise<{ synced: number, errors: string[] }> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Organization context required")

    const { wabaId, accessToken } = await resolveMetaCredentials(orgId)

    const url = `${META_GRAPH_URL}/${META_API_VERSION}/${wabaId}/message_templates?fields=name,status,category,language,components&limit=100`
    console.log('[syncTemplatesFromMeta] Fetching from:', url.replace(accessToken, '***'))

    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        cache: 'no-store'
    })

    if (!response.ok) {
        const err = await response.json()
        console.error('[syncTemplatesFromMeta] Meta API Error:', err)
        throw new Error(err?.error?.message || 'Failed to fetch templates from Meta')
    }

    const result = await response.json()
    const metaTemplates = result.data || []
    console.log(`[syncTemplatesFromMeta] Got ${metaTemplates.length} templates from Meta:`,
        metaTemplates.map((t: any) => `${t.name} (${t.language}) [${t.status}]`)
    )

    const supabase = await createClient()
    let synced = 0
    const errors: string[] = []

    for (const mt of metaTemplates) {
        try {
            // Check if template already exists locally by name
            const { data: existing } = await supabase
                .from('messaging_templates')
                .select('id')
                .eq('organization_id', orgId)
                .eq('name', mt.name)
                .eq('language', mt.language)
                .maybeSingle()

            const templateData = {
                organization_id: orgId,
                name: mt.name,
                category: mt.category,
                language: mt.language,
                components: mt.components || [],
                status: mt.status,
                meta_id: mt.id,
                content: extractBodyText(mt.components || [])
            }

            if (existing) {
                await supabase
                    .from('messaging_templates')
                    .update({ status: mt.status, meta_id: mt.id, components: mt.components || [] })
                    .eq('id', existing.id)
            } else {
                await supabase
                    .from('messaging_templates')
                    .insert(templateData)
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
export async function submitTemplateToMeta(templateId: string): Promise<{ success: boolean, metaId?: string, error?: string }> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Organization context required")

    const supabase = await createClient()
    const { data: template } = await supabase
        .from('messaging_templates')
        .select('*')
        .eq('id', templateId)
        .eq('organization_id', orgId)
        .single()

    if (!template) throw new Error("Template not found")

    const { wabaId, accessToken } = await resolveMetaCredentials(orgId)

    // Build Meta-compatible components (strip UI_METADATA)
    const metaComponents = ((template as any).components || [])
        .filter((c: any) => c.type !== 'UI_METADATA')
        .map((c: any) => {
            const comp: any = { type: c.type }
            if (c.format) comp.format = c.format
            if (c.text) comp.text = c.text
            if (c.buttons) comp.buttons = c.buttons
            if (c.example) comp.example = c.example
            return comp
        })

    const payload = {
        name: template.name,
        category: template.category,
        language: template.language,
        components: metaComponents
    }

    const url = `${META_GRAPH_URL}/${META_API_VERSION}/${wabaId}/message_templates`
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })

    const result = await response.json()

    if (!response.ok) {
        const errorMsg = result?.error?.message || 'Failed to submit template to Meta'
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
export async function deleteTemplateFromMeta(templateId: string): Promise<{ success: boolean, error?: string }> {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error("Organization context required")

    const supabase = await createClient()
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
                console.error('[deleteTemplateFromMeta] Meta API error:', err)
                // Continue with local deletion even if Meta fails
            }
        } catch (e: any) {
            console.error('[deleteTemplateFromMeta] Meta deletion failed:', e.message)
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
