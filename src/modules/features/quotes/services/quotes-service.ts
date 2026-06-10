import { createClient } from "@/modules/core/database/supabase-server"
import { Quote } from "@/types"
import { normalizePhone } from "@/modules/infrastructure/utils/normalize-phone"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"

const PUBLIC_QUOTE_LOAD_ERROR = "No se pudo cargar la cotizacion"
const PUBLIC_QUOTE_CREATE_ERROR = "No se pudo crear la cotizacion"
const PUBLIC_QUOTE_UPDATE_ERROR = "No se pudo actualizar la cotizacion"
const PUBLIC_QUOTE_DELETE_ERROR = "No se pudo eliminar la cotizacion"
const PUBLIC_QUOTE_LINK_ERROR = "No se pudo vincular la cotizacion"
const PUBLIC_QUOTE_SEND_ERROR = "No se pudo enviar la cotizacion"

type QuoteFailure = { success: false; error: string }
type QuoteResult<T extends object = Record<never, never>> = ({ success: true; error?: never } & T) | QuoteFailure

function isDeployedRuntime() {
  return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizeQuoteError(error: unknown) {
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

function logQuoteError(label: string, error: unknown) {
  console.error(label, isDeployedRuntime() ? summarizeQuoteError(error) : error)
}

function getQuoteErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return fallback
}

function quoteFailure(label: string, error: unknown, publicMessage: string): QuoteFailure {
  logQuoteError(label, error)
  return { success: false, error: isDeployedRuntime() ? publicMessage : getQuoteErrorMessage(error, publicMessage) }
}

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
    logQuoteError('[QuotesService.getQuotes] Error:', error)
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
    logQuoteError('[QuotesService.getContactOptions] Error:', error)
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
export async function getQuote(id: string): Promise<QuoteResult<{ data: Quote }>> {
  const supabase = await createClient()
  const orgId = await getCurrentOrganizationId()

  if (!orgId) return { success: false, error: "Unauthorized" }

  const { data, error } = await supabase
    .from('quotes')
    .select('*, client:leads!client_id(*), lead:leads!lead_id(*), emitter:emitters(*)')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()

  if (error) return quoteFailure('[QuotesService.getQuote] Error:', error, PUBLIC_QUOTE_LOAD_ERROR)
  return { success: true, data: data as Quote }
}

/**
 * Creates a new quote with a generated sequence number.
 * 
 * @param {Partial<Quote>} data - The initial quote data.
 * @returns {Promise<{success: boolean, data?: Quote, error?: string}>} The newly created quote.
 */
export async function createQuote(data: Partial<Quote>): Promise<QuoteResult<{ data: Quote }>> {
  const supabase = await createClient()
  const orgId = await getCurrentOrganizationId()

  if (!orgId) return { success: false, error: "Unauthorized" }

  try {
    const { data: seqNum, error: seqError } = await supabase
      .rpc('get_next_sequence_value', {
        org_id: orgId,
        entity_key: 'quote'
      })

    if (seqError) throw seqError

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
    return quoteFailure("[QuotesService.createQuote] Error:", error, PUBLIC_QUOTE_CREATE_ERROR)
  }
}

/**
 * Updates an existing quote.
 * 
 * @param {string} id - The UUID of the quote.
 * @param {Partial<Quote>} updates - The fields to update.
 * @returns {Promise<{success: boolean, error?: string}>} Result of the operation.
 */
export async function updateQuote(id: string, updates: Partial<Quote>): Promise<QuoteResult> {
  const supabase = await createClient()
  const orgId = await getCurrentOrganizationId()

  if (!orgId) return { success: false, error: "Unauthorized" }

  const { error } = await supabase
    .from('quotes')
    .update(updates)
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) return quoteFailure("[QuotesService.updateQuote] Error:", error, PUBLIC_QUOTE_UPDATE_ERROR)

  return { success: true }
}

/**
 * Performs a soft delete on one or more quotes.
 * 
 * @param {string[]} ids - Array of quote UUIDs to delete.
 * @returns {Promise<{success: boolean, error?: string}>} Result of the operation.
 */
export async function deleteQuotes(ids: string[]): Promise<QuoteResult> {
  const supabase = await createClient()
  const orgId = await getCurrentOrganizationId()

  if (!orgId) return { success: false, error: "Unauthorized" }

  const { error } = await supabase
    .from('quotes')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', ids)
    .eq('organization_id', orgId)

  if (error) return quoteFailure("[QuotesService.deleteQuotes] Error:", error, PUBLIC_QUOTE_DELETE_ERROR)

  return { success: true }
}

/**
 * Duplicates an existing quote, appending "(Copia)" to the title.
 * 
 * @param {string} originalId - The UUID of the quote to duplicate.
 * @returns {Promise<{success: boolean, data?: Quote, error?: string}>} The new duplicated quote.
 */
export async function duplicateQuote(originalId: string): Promise<QuoteResult<{ data: Quote }>> {
  const res = await getQuote(originalId)
  if (!res.success) return { success: false, error: res.error }

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
export async function getPublicQuote(id: string): Promise<QuoteResult<{ data: any }>> {
  const { supabaseAdmin } = await import("@/modules/core/database/supabase-admin")

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
      logQuoteError('[QuotesService.getPublicQuote] error:', error)
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
    logQuoteError('[QuotesService.getPublicQuote] Exception:', error)
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
export async function createQuoteFromLead(leadId: string): Promise<QuoteResult<{ quoteId: string }>> {
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

    if (!result.success) return { success: false, error: result.error }

    const { error: linkError } = await supabase
      .from('leads')
      .update({
        quote_id: result.data.id,
        quote_status: 'draft'
      })
      .eq('id', leadId)
      .eq('organization_id', orgId)

    if (linkError) logQuoteError('Error linking quote to lead:', linkError)

    return { success: true, quoteId: result.data.id }
  } catch (error: any) {
    return quoteFailure('[QuotesService.createQuoteFromLead] error:', error, PUBLIC_QUOTE_CREATE_ERROR)
  }
}

export async function linkQuoteToLead(leadId: string, quoteId: string): Promise<QuoteResult> {
  const supabase = await createClient()
  const orgId = await getCurrentOrganizationId()

  if (!orgId) return { success: false, error: "Unauthorized" }

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('id')
    .eq('id', quoteId)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .single()

  if (quoteError || !quote) {
    return quoteFailure("[QuotesService.linkQuoteToLead] Quote lookup error:", quoteError, PUBLIC_QUOTE_LINK_ERROR)
  }

  const { error } = await supabase
    .from('leads')
    .update({
      quote_id: quoteId,
      quote_status: 'linked'
    })
    .eq('id', leadId)
    .eq('organization_id', orgId)

  if (error) return quoteFailure("[QuotesService.linkQuoteToLead] Error:", error, PUBLIC_QUOTE_LINK_ERROR)
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
    .eq('organization_id', orgId)
    .single()

  if (!lead?.quote_id) return null

  const { data: quote } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', lead.quote_id)
    .eq('organization_id', orgId)
    .is('deleted_at', null)
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
export async function sendQuoteViaWhatsApp(quoteId: string, targetPhone?: string): Promise<QuoteResult<{ message: string, conversationId: string }>> {
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
    return quoteFailure("[QuotesService.sendQuoteViaWhatsApp] Error:", error, PUBLIC_QUOTE_SEND_ERROR)
  }
}

