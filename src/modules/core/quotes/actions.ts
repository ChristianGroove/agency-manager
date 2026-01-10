"use server"

import { createClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { Quote } from "@/types"

/**
 * Creates a new Quote using Atomic ID Generation
 * Replaces: duplicateQuote (legacy) and QuotesService.createQuote
 */
export async function createQuote(data: Partial<Quote>) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "Unauthorized" }

    try {
        // 1. Atomic ID Generation (Safe against race conditions)
        const { data: seqNum, error: seqError } = await supabase
            .rpc('get_next_sequence_value', {
                org_id: orgId,
                entity_key: 'quote'
            })

        if (seqError) throw new Error(`Failed to generate ID: ${seqError.message}`)

        const number = `COT-${seqNum.toString().padStart(5, '0')}`

        // 2. Insert Quote
        const { data: newQuote, error: insertError } = await supabase
            .from('quotes')
            .insert({
                ...data, // Spread first
                organization_id: orgId, // Enforce safety
                number: number,
                status: 'draft',
                created_at: undefined, // Let DB handle
                total: data.total || 0
            })
            .select()
            .single()

        if (insertError) throw insertError

        revalidatePath('/quotes')
        return { success: true, data: newQuote }

    } catch (error: any) {
        console.error("Create Quote Error:", error)
        return { success: false, error: error.message }
    }
}

/**
 * Updates a Quote info
 */
export async function updateQuote(id: string, updates: Partial<Quote>) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    // Safety check: Ensure quote belongs to org (RLS does this too, but good to be explicit)
    const { error } = await supabase
        .from('quotes')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', orgId!) // TS bang because middleware ensures logic mostly

    if (error) return { success: false, error: error.message }

    revalidatePath('/quotes')
    revalidatePath(`/quotes/${id}`)
    return { success: true }
}

/**
 * Duplicates an existing quote
 */
export async function duplicateQuote(originalId: string) {
    const supabase = await createClient()

    const { data: original } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', originalId)
        .single()

    if (!original) return { success: false, error: "Not found" }

    // Clean data for duplication
    const { id, created_at, number, ...rest } = original

    return await createQuote({
        ...rest,
        title: `${rest.title} (Copia)`
    })
}


/**
 * Get a single quote by ID
 */
export async function getQuote(id: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "Unauthorized" }

    const { data, error } = await supabase
        .from('quotes')
        .select('*, client:clients(*), lead:leads!lead_id(*), emitter:emitters(*)')
        .eq('id', id)
        .eq('organization_id', orgId)
        .single()

    if (error) return { success: false, error: error.message }
    return { success: true, data }
}

/**
 * Get all quotes for current organization
 */
export async function getQuotes() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    const { data, error } = await supabase
        .from('quotes')
        .select('*, client:clients(*), lead:leads!lead_id(*), emitter:emitters(*)')
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('[getQuotes] Error:', error)
        return []
    }

    return data
}

export async function deleteQuotes(ids: string[]) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) throw new Error("Unauthorized")

    // Soft delete
    const { error } = await supabase
        .from('quotes')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids)
        .eq('organization_id', orgId)

    if (error) throw error

    revalidatePath('/quotes')
    return { success: true }
}

/**
 * Creates a quote pre-filled with lead data
 * Used from CRM pipeline to create quotes for leads
 */
export async function createQuoteFromLead(leadId: string): Promise<{ success: boolean, quoteId?: string, error?: string }> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "Unauthorized" }

    try {
        // 1. Get lead data
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .eq('organization_id', orgId)
            .single()

        if (leadError || !lead) {
            return { success: false, error: 'Lead not found' }
        }

        // 2. Check if lead already has a quote
        if (lead.quote_id) {
            return { success: true, quoteId: lead.quote_id }
        }

        // 3. Create new quote with lead reference
        // Note: Only using fields that exist in the database schema
        const result = await createQuote({
            lead_id: lead.id,
            total: lead.estimated_value || 0,
            date: new Date().toISOString().split('T')[0], // Required field (YYYY-MM-DD format)
            items: [] // Required array field
        } as Partial<Quote>)

        if (!result.success) {
            return { success: false, error: result.error }
        }

        // 4. Link quote to lead
        const { error: linkError } = await supabase
            .from('leads')
            .update({
                quote_id: result.data.id,
                quote_status: 'draft'
            })
            .eq('id', leadId)

        if (linkError) {
            console.error('Error linking quote to lead:', linkError)
        }

        revalidatePath('/crm')
        return { success: true, quoteId: result.data.id }

    } catch (error: any) {
        console.error('createQuoteFromLead error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Links an existing quote to a lead
 */
export async function linkQuoteToLead(leadId: string, quoteId: string): Promise<{ success: boolean, error?: string }> {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "Unauthorized" }

    const { error } = await supabase
        .from('leads')
        .update({
            quote_id: quoteId,
            quote_status: 'linked'
        })
        .eq('id', leadId)
        .eq('organization_id', orgId)

    if (error) return { success: false, error: error.message }

    revalidatePath('/crm')
    return { success: true }
}

/**
 * Gets the quote associated with a lead
 */
export async function getQuoteForLead(leadId: string) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return null

    const { data: lead } = await supabase
        .from('leads')
        .select('quote_id')
        .eq('id', leadId)
        .single()

    if (!lead?.quote_id) return null

    const { data: quote } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', lead.quote_id)
        .single()

    return quote
}


/**
 * Fetch a quote for public display (No Auth Required)
 * CAUTION: Bypasses RLS using Admin Client. Ensure we only return necessary data.
 */
export async function getPublicQuote(id: string) {
    const { supabaseAdmin } = await import("@/lib/supabase-admin")

    try {
        // 1. Fetch Quote
        const { data: quote, error } = await supabaseAdmin
            .from('quotes')
            .select(`
                *,
                client:clients (*),
                lead:leads (*),
                emitter:emitters (*),
                organization:organizations (id, name, logo_url)
            `)
            .eq('id', id)
            .is('deleted_at', null)
            .single()

        if (error || !quote) {
            console.error('getPublicQuote error:', error)
            return { success: false, error: "Cotización no encontrada o inválida" }
        }

        // 2. Fetch Branding / Settings
        // We perform a separate fetch to get settings for this organization
        const { data: settings } = await supabaseAdmin
            .from('organization_settings')
            .select('*')
            .eq('organization_id', quote.organization_id)
            .single()

        // 3. Inject Settings into Quote object safely for the template
        // We cast to any to attach the extra property not in Type DTO but used by public page
        const enhancedQuote = {
            ...quote,
            organization_settings: settings || {}
        }

        return { success: true, data: enhancedQuote }

    } catch (error: any) {
        console.error('getPublicQuote Exception:', error)
        return { success: false, error: "Error de servidor al cargar la cotización" }
    }
}

/**
 * Send a quote via WhatsApp using Connected Channels
 */
export async function sendQuoteViaWhatsApp(quoteId: string, targetPhone?: string) {
    const supabase = await createClient() // Use User Client for permission check
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "Unauthorized" }

    try {
        // 1. Fetch Quote Details
        const { data: quote, error: quoteError } = await supabase
            .from('quotes')
            .select('*, client:clients(name, phone), lead:leads!lead_id(name, phone)')
            .eq('id', quoteId)
            .eq('organization_id', orgId)
            .single()

        if (quoteError || !quote) return { success: false, error: "Cotización no encontrada" }

        // 2. Determine Recipient Phone
        const phone = targetPhone || quote.client?.phone || quote.lead?.phone
        if (!phone) return { success: false, error: "No se encontró un número de teléfono para enviar" }

        // 3. Determine Name
        const name = quote.client?.name || quote.lead?.name || "Cliente"

        // 4. Generate Public Link
        // We assume the app is hosted at the same origin defined in env or fallback
        // Since we are in Server Action, we can construct relative or use Base URL
        const origin = process.env.NEXT_PUBLIC_APP_URL || "https://pixy-crm.vercel.app" // Fallback or strict
        const publicLink = `${origin}/quote/${quote.id}`

        // 5. Ensure Conversation Exists (using Messaging Actions)
        const { sendMessage } = await import("@/modules/core/messaging/actions")

        // Resolve Lead ID
        let leadId = quote.lead_id
        if (!leadId && quote.client_id) {
            const { data: leadByPhone } = await supabase.from('leads').select('id').eq('phone', phone).eq('organization_id', orgId).single()
            if (leadByPhone) leadId = leadByPhone.id
        }

        const cleanPhone = (p: string) => p.replace(/\D/g, '')
        const rawPhone = cleanPhone(phone)

        let conversationId: string | undefined

        // Robust Client-Side Search (No RPC dependency)
        // 1. Fetch potential candidates using loose matching
        const { data: candidates } = await supabase
            .from('conversations')
            .select('id, phone')
            .eq('organization_id', orgId)
            .neq('state', 'archived')
            .ilike('phone', `%${rawPhone}%`) // Get anything containing the digits
            .order('updated_at', { ascending: false })
            .limit(5)

        // 2. Exact logic in JS to handle suffix/prefix
        if (candidates && candidates.length > 0) {
            // Prioritize matches that are LONGER (likely have country code) to avoid picking the short "broken" duplicate
            // We sort efficiently JS side
            const sorted = candidates.sort((a, b) => b.phone.length - a.phone.length)

            // Find best match: check if candidate ends with rawPhone OR rawPhone ends with candidate (unlikely but safe)
            const match = sorted.find(c => {
                const cClean = cleanPhone(c.phone)
                return cClean.endsWith(rawPhone) || rawPhone.endsWith(cClean)
            })
            if (match) conversationId = match.id
        }

        if (conversationId) {
            // Found existing!
        } else {
            // Create New: Prefer 57 prefix if 10 digits
            const finalPhone = (rawPhone.length === 10) ? `57${rawPhone}` : rawPhone

            // Create Lead if needed
            if (!leadId) {
                const { data: newLead } = await supabase.from('leads').insert({
                    organization_id: orgId,
                    phone: finalPhone,
                    name: name,
                    status: 'new'
                }).select().single()
                if (newLead) leadId = newLead.id
            }

            if (!leadId) return { success: false, error: "No se pudo crear el contacto para el envío" }

            const { data: newConv, error: createError } = await supabase.from('conversations').insert({
                organization_id: orgId,
                lead_id: leadId,
                channel: 'whatsapp',
                phone: finalPhone,
                status: 'open',
                state: 'active',
                unread_count: 0
            }).select().single()

            if (createError) throw createError
            conversationId = newConv.id
        }


        if (!conversationId) return { success: false, error: "Error preparando la conversación" }

        // 6. Send/Template Logic
        const message = `Hola ${name}, te comparto tu cotización #${quote.number} por valor de $${quote.total.toLocaleString()}. Puedes verla aquí: ${publicLink}`

        const result = await sendMessage(conversationId, JSON.stringify({
            type: 'text',
            text: message
        }))

        if (result.success) {
            return { success: true, message: "Enviado correctamente", conversationId }
        } else {
            return { success: false, error: "Fallo el envío del mensaje" }
        }

    } catch (error: any) {
        console.error("sendQuoteViaWhatsApp Error:", error)
        return { success: false, error: error.message }
    }
}
