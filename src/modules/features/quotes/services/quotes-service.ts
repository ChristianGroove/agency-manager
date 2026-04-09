import { createClient } from "@/lib/supabase-server"
import { Quote } from "@/types"
import { normalizePhone } from "@/lib/normalize-phone"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"

/**
 * Service Layer for Quotes Module
 * 
 * This layer is responsible for direct database interactions and core business logic.
 * It is designed to be "framework-agnostic" within the project, meaning it doesn't
 * handle Next.js specific concerns like revalidation, navigation, or cookies.
 */

/**
 * Retrieves all active (non-deleted) quotes for the current organization.
 * Includes related client, lead (if any), and emitter data.
 * 
 * @returns {Promise<Quote[]>} Array of quotes, or empty array if unauthorized or on error.
 */
export async function getQuotes() {
  const supabase = await createClient()
  const orgId = await getCurrentOrganizationId()

  if (!orgId) return []

  const { data, error } = await supabase
    .from('quotes')
    .select('*, client:leads!client_id(*), lead:leads!lead_id(*), emitter:emitters(*)')
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[QuotesService.getQuotes] Error:', error)
    return []
  }

  return data as Quote[]
}

/**
 * Retrieves all "Master Contacts" (contact_type='client') for the current organization.
 * Used for dropdown selectors in the UI to ensure uniqueness and clean data.
 */
export async function getContactOptions() {
  const supabase = await createClient()
  const orgId = await getCurrentOrganizationId()

  if (!orgId) return []

  const { data, error } = await supabase
    .from('leads')
    .select('id, name, email, company_name')
    .eq('organization_id', orgId)
    .eq('contact_type', 'client')
    .is('deleted_at', null)
    .order('name')

  if (error) {
    console.error('[QuotesService.getContactOptions] Error:', error)
    return []
  }

  return data
}

/**
 * Retrieves a single quote by ID, scoped to the current organization.
 * 
 * @param {string} id - The UUID of the quote.
 * @returns {Promise<{success: boolean, data?: Quote, error?: string}>} The quote data or an error message.
 */
export async function getQuote(id: string) {
  const supabase = await createClient()
  const orgId = await getCurrentOrganizationId()

  if (!orgId) return { success: false, error: "Unauthorized" }

  const { data, error } = await supabase
    .from('quotes')
    .select('*, client:leads!client_id(*), lead:leads!lead_id(*), emitter:emitters(*)')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Quote }
}

/**
 * Creates a new quote with a generated sequence number.
 * 
 * @param {Partial<Quote>} data - The initial quote data.
 * @returns {Promise<{success: boolean, data?: Quote, error?: string}>} The newly created quote.
 */
export async function createQuote(data: Partial<Quote>) {
  const supabase = await createClient()
  const orgId = await getCurrentOrganizationId()

  if (!orgId) return { success: false, error: "Unauthorized" }

  try {
    const { data: seqNum, error: seqError } = await supabase
      .rpc('get_next_sequence_value', {
        org_id: orgId,
        entity_key: 'quote'
      })

    if (seqError) throw new Error(`Failed to generate ID: ${seqError.message}`)

    const number = `COT-${seqNum.toString().padStart(5, '0')}`

    const { data: newQuote, error: insertError } = await supabase
      .from('quotes')
      .insert({
        ...data,
        organization_id: orgId,
        number: number,
        status: 'draft',
        created_at: undefined,
        total: data.total || 0
      })
      .select()
      .single()

    if (insertError) throw insertError

    return { success: true, data: newQuote as Quote }
  } catch (error: any) {
    console.error("[QuotesService.createQuote] Error:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Updates an existing quote.
 * 
 * @param {string} id - The UUID of the quote.
 * @param {Partial<Quote>} updates - The fields to update.
 * @returns {Promise<{success: boolean, error?: string}>} Result of the operation.
 */
export async function updateQuote(id: string, updates: Partial<Quote>) {
  const supabase = await createClient()
  const orgId = await getCurrentOrganizationId()

  if (!orgId) return { success: false, error: "Unauthorized" }

  const { error } = await supabase
    .from('quotes')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) return { success: false, error: error.message }

  return { success: true }
}

/**
 * Performs a soft delete on one or more quotes.
 * 
 * @param {string[]} ids - Array of quote UUIDs to delete.
 * @returns {Promise<{success: boolean, error?: string}>} Result of the operation.
 */
export async function deleteQuotes(ids: string[]) {
  const supabase = await createClient()
  const orgId = await getCurrentOrganizationId()

  if (!orgId) return { success: false, error: "Unauthorized" }

  const { error } = await supabase
    .from('quotes')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', ids)
    .eq('organization_id', orgId)

  if (error) return { success: false, error: error.message }

  return { success: true }
}

/**
 * Duplicates an existing quote, appending "(Copia)" to the title.
 * 
 * @param {string} originalId - The UUID of the quote to duplicate.
 * @returns {Promise<{success: boolean, data?: Quote, error?: string}>} The new duplicated quote.
 */
export async function duplicateQuote(originalId: string) {
  const res = await getQuote(originalId)
  if (!res.success || !res.data) return { success: false, error: res.error || "Not found" }

  const { id, created_at, number, ...rest } = res.data

  return await createQuote({
    ...rest,
    title: `${rest.title} (Copia)`
  } as Partial<Quote>)
}

/**
 * Retrieves a quote for public viewing (no auth required for the viewer).
 * Uses service role to bypass RLS, but strictly limited to the specific ID.
 * Also retrieves organization settings for branding.
 * 
 * @param {string} id - The UUID of the quote.
 * @returns {Promise<{success: boolean, data?: any, error?: string}>} Quote with branding settings.
 */
export async function getPublicQuote(id: string) {
  const { supabaseAdmin } = await import("@/lib/supabase-admin")

  try {
    const { data: quote, error } = await supabaseAdmin
      .from('quotes')
      .select(`
        *,
        client:leads!client_id (*),
        lead:leads!lead_id (*),
        emitter:emitters (*),
        organization:organizations (id, name, logo_url)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error || !quote) {
      console.error('[QuotesService.getPublicQuote] error:', error)
      return { success: false, error: "Cotización no encontrada o inválida" }
    }

    const { data: settings } = await supabaseAdmin
      .from('organization_settings')
      .select('*')
      .eq('organization_id', quote.organization_id)
      .single()

    const enhancedQuote = {
      ...quote,
      organization_settings: settings || {}
    }

    return { success: true, data: enhancedQuote }
  } catch (error: any) {
    console.error('[QuotesService.getPublicQuote] Exception:', error)
    return { success: false, error: "Error de servidor al cargar la cotización" }
  }
}

/**
 * Creates a new quote linked to a CRM lead.
 * If the lead already has a quote, it returns the existing one.
 * 
 * @param {string} leadId - The UUID of the CRM lead.
 * @returns {Promise<{success: boolean, quoteId?: string, error?: string}>} Result containing the quote ID.
 */
export async function createQuoteFromLead(leadId: string) {
  const supabase = await createClient()
  const orgId = await getCurrentOrganizationId()

  if (!orgId) return { success: false, error: "Unauthorized" }

  try {
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('organization_id', orgId)
      .single()

    if (leadError || !lead) return { success: false, error: 'Lead not found' }
    if (lead.quote_id) return { success: true, quoteId: lead.quote_id }

    const result = await createQuote({
      lead_id: lead.id,
      total: lead.estimated_value || 0,
      date: new Date().toISOString().split('T')[0],
      items: []
    } as Partial<Quote>)

    if (!result.success || !result.data) return { success: false, error: result.error }

    const { error: linkError } = await supabase
      .from('leads')
      .update({
        quote_id: result.data.id,
        quote_status: 'draft'
      })
      .eq('id', leadId)

    if (linkError) console.error('Error linking quote to lead:', linkError)

    return { success: true, quoteId: result.data.id }
  } catch (error: any) {
    console.error('[QuotesService.createQuoteFromLead] error:', error)
    return { success: false, error: error.message }
  }
}

export async function linkQuoteToLead(leadId: string, quoteId: string) {
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
  return { success: true }
}

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

  return quote as Quote
}

/**
 * Sends a quote summary and link via WhatsApp.
 * Handles the creation of conversations and leads if they don't exist.
 * 
 * @param {string} quoteId - The UUID of the quote.
 * @param {string} [targetPhone] - Optional phone override.
 * @returns {Promise<{success: boolean, message?: string, conversationId?: string, error?: string}>}
 */
export async function sendQuoteViaWhatsApp(quoteId: string, targetPhone?: string) {
  const supabase = await createClient()
  const orgId = await getCurrentOrganizationId()

  if (!orgId) return { success: false, error: "Unauthorized" }

  try {
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*, client:leads!client_id(name, phone), lead:leads!lead_id(name, phone)')
      .eq('id', quoteId)
      .eq('organization_id', orgId)
      .single()

    if (quoteError || !quote) return { success: false, error: "Cotización no encontrada" }

    const phone = targetPhone || quote.client?.phone || quote.lead?.phone
    if (!phone) return { success: false, error: "No se encontró un número de teléfono para enviar" }

    const name = quote.client?.name || quote.lead?.name || "Cliente"
    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://pixy-crm.vercel.app"
    const publicLink = `${origin}/quote/${quote.id}`

    const { sendMessage } = await import("@/modules/features/messaging/messaging-actions")

    let leadId = quote.lead_id
    if (!leadId && quote.client_id) {
      const normalizedLookup = normalizePhone(phone)
      const { data: leadByPhone } = await supabase.from('leads').select('id').eq('phone', normalizedLookup).eq('organization_id', orgId).single()
      if (leadByPhone) leadId = leadByPhone.id
    }

    const cleanPhone = (p: string) => p.replace(/\D/g, '')
    const rawPhone = cleanPhone(phone)

    let conversationId: string | undefined
    const { data: candidates } = await supabase
      .from('conversations')
      .select('id, phone')
      .eq('organization_id', orgId)
      .neq('state', 'archived')
      .ilike('phone', `%${rawPhone}%`)
      .order('updated_at', { ascending: false })
      .limit(5)

    if (candidates && candidates.length > 0) {
      const sorted = candidates.sort((a, b) => b.phone.length - a.phone.length)
      const match = sorted.find(c => {
        const cClean = cleanPhone(c.phone)
        return cClean.endsWith(rawPhone) || rawPhone.endsWith(cClean)
      })
      if (match) conversationId = match.id
    }

    if (!conversationId) {
      const finalPhone = normalizePhone(phone)
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

    const message = `Hola ${name}, te comparto tu cotización #${quote.number} por valor de $${quote.total.toLocaleString()}. Puedes verla aquí: ${publicLink}`
    const result = await sendMessage(conversationId, {
      type: 'text',
      text: message
    }, 'System')

    if (result.success) {
      return { success: true, message: "Enviado correctamente", conversationId }
    } else {
      return { success: false, error: "Fallo el envío del mensaje" }
    }
  } catch (error: any) {
    console.error("[QuotesService.sendQuoteViaWhatsApp] Error:", error)
    return { success: false, error: error.message }
  }
}

