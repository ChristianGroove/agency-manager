'use server'

/**
 * ==============================================================================
 * MULTI-CHANNEL ACTION HUB SERVER ACTIONS
 * File: src/modules/features/catalog/action-hub-actions.ts
 * Multi-Channel Storefront Engine: WhatsApp Checkout, Lead/Quote CRM, Wompi & Bookings
 * ==============================================================================
 */

import { createClient } from '@/modules/core/database/supabase-server'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions'
import { StorefrontActionPayload } from '@/types/catalog'
import {
  storefrontActionPayloadSchema,
  StorefrontActionPayloadInput,
} from './schemas/catalog.schema'
import crypto from 'crypto'

export interface WhatsAppCheckoutResult {
  success: boolean
  uri: string
  message: string
  error?: string
}

export interface StorefrontQuoteResult {
  success: boolean
  leadId?: string
  quoteId?: string
  quoteNumber?: string
  error?: string
}

export interface WompiCheckoutSessionResult {
  success: boolean
  reference?: string
  amountInCents?: number
  currency?: string
  signature?: string
  publicKey?: string
  checkoutUrl?: string
  error?: string
}

export interface AppointmentBookingLinkResult {
  success: boolean
  bookingUrl: string
  error?: string
}

// ------------------------------------------------------------------------------
// Helper: Resolve Target Organization ID
// ------------------------------------------------------------------------------

async function resolveOrganizationId(
  payload: StorefrontActionPayloadInput | StorefrontActionPayload
): Promise<string | null> {
  if (payload.organizationId) {
    return payload.organizationId
  }

  const token = payload.portalToken || payload.sourcePortalToken
  if (token) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)

    // Try finding lead
    let leadQuery = supabaseAdmin.from('leads').select('organization_id')
    if (isUuid) {
      leadQuery = leadQuery.or(
        `portal_short_token.eq.${token},portal_token.eq.${token}`
      )
    } else {
      leadQuery = leadQuery.eq('portal_short_token', token)
    }
    const { data: lead } = await leadQuery.maybeSingle()
    if (lead?.organization_id) return lead.organization_id

    // Try finding organization
    let orgQuery = supabaseAdmin.from('organizations').select('id')
    if (isUuid) {
      orgQuery = orgQuery.or(`id.eq.${token},slug.eq.${token}`)
    } else {
      orgQuery = orgQuery.eq('slug', token)
    }
    const { data: org } = await orgQuery.maybeSingle()
    if (org?.id) return org.id
  }

  const currentOrg = await getCurrentOrganizationId()
  return currentOrg ?? null
}

function cleanPhoneNumber(rawPhone: string): string {
  let cleaned = rawPhone.replace(/[^\d+]/g, '')
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1)
  }
  // Default to Colombia country code (57) if 10 digits without country code
  if (cleaned.length === 10 && !cleaned.startsWith('57')) {
    cleaned = `57${cleaned}`
  }
  return cleaned
}

/**
 * 1. Generate Formatted WhatsApp Checkout URI
 */
export async function generateWhatsAppCheckoutUriAction(
  payload: StorefrontActionPayload,
  phone?: string
): Promise<WhatsAppCheckoutResult> {
  try {
    const orgId = await resolveOrganizationId(payload)

    // Resolve destination WhatsApp phone number
    let destinationPhone = phone?.trim()

    if (!destinationPhone && orgId) {
      const { data: settings } = await supabaseAdmin
        .from('organization_settings')
        .select('portal_theme_config, whatsapp_notifications_phone')
        .eq('organization_id', orgId)
        .maybeSingle()

      const themeConfig = settings?.portal_theme_config as any
      destinationPhone =
        themeConfig?.social_links?.whatsapp ||
        settings?.whatsapp_notifications_phone ||
        ''
    }

    if (!destinationPhone) {
      destinationPhone = payload.customerInfo?.phone || '573000000000'
    }

    const cleanPhone = cleanPhoneNumber(destinationPhone)

    // Fetch item details if needed for title
    let itemName = payload.itemId
    if (orgId) {
      const { data: item } = await supabaseAdmin
        .from('service_catalog')
        .select('name')
        .eq('id', payload.itemId)
        .maybeSingle()
      if (item?.name) itemName = item.name
    }

    const variantText = payload.selectedVariant?.title
      ? `\n🎛️ *Variante:* ${payload.selectedVariant.title}`
      : ''

    let addonsText = ''
    if (payload.selectedAddons && payload.selectedAddons.length > 0) {
      addonsText =
        '\n➕ *Adicionales:*\n' +
        payload.selectedAddons
          .map(
            (a) =>
              `  • ${a.name} (+$${Number(a.priceDelta || 0).toLocaleString('es-CO')})`
          )
          .join('\n')
    }

    const formattedTotal = Number(
      payload.calculatedTotalPrice || 0
    ).toLocaleString('es-CO')

    let customerText = ''
    if (payload.customerInfo?.name) {
      customerText = `\n\n👤 *Datos del Cliente:*\n• Nombre: ${payload.customerInfo.name}`
      if (payload.customerInfo.phone) {
        customerText += `\n• Teléfono: ${payload.customerInfo.phone}`
      }
      if (payload.customerInfo.email) {
        customerText += `\n• Email: ${payload.customerInfo.email}`
      }
      if (payload.customerInfo.address) {
        customerText += `\n• Dirección: ${payload.customerInfo.address}`
      }
      if (payload.customerInfo.notes) {
        customerText += `\n• Notas: ${payload.customerInfo.notes}`
      }
    }

    const message = `🛒 *NUEVO PEDIDO DESDE CATÁLOGO*
------------------------------------
📦 *Producto:* ${itemName}${variantText}${addonsText}
🔢 *Cantidad:* ${payload.quantity || 1}
💰 *Total Estimado:* $${formattedTotal} ${payload.currency || 'COP'}${customerText}

🔗 *Enlace del producto:*
${payload.deepLinkUrl}
------------------------------------
_Generado automáticamente desde Pixy Storefront_`

    const encodedMessage = encodeURIComponent(message)
    const uri = `https://wa.me/${cleanPhone}?text=${encodedMessage}`

    return {
      success: true,
      uri,
      message,
    }
  } catch (err: any) {
    console.error('generateWhatsAppCheckoutUriAction error:', err)
    return {
      success: false,
      uri: '',
      message: '',
      error: err.message || 'Error al generar enlace de WhatsApp',
    }
  }
}

/**
 * 2. Create CRM Lead and Draft Quote for Storefront Quote Requests
 */
export async function createStorefrontLeadAndQuoteAction(
  payload: StorefrontActionPayload
): Promise<StorefrontQuoteResult> {
  try {
    const validated = storefrontActionPayloadSchema.parse(payload)
    const orgId = await resolveOrganizationId(validated)
    if (!orgId) throw new Error('No se pudo identificar la organización')

    const customer = validated.customerInfo
    if (!customer?.name || !customer?.phone) {
      throw new Error('Nombre y teléfono del cliente son requeridos')
    }

    // 1. Fetch Item Name
    const { data: item } = await supabaseAdmin
      .from('service_catalog')
      .select('id, name, base_price')
      .eq('id', validated.itemId)
      .maybeSingle()

    const itemName = item?.name || 'Producto / Servicio de Catálogo'

    // 2. Find or Create Lead
    let leadId: string | undefined

    const { data: existingLead } = await supabaseAdmin
      .from('leads')
      .select('id')
      .eq('organization_id', orgId)
      .or(`phone.eq.${customer.phone}${customer.email ? `,email.eq.${customer.email}` : ''}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingLead) {
      leadId = existingLead.id
      // Update details if provided
      await supabaseAdmin
        .from('leads')
        .update({
          name: customer.name,
          company_name: customer.company_name || null,
          notes: customer.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)
    } else {
      const { data: newLead, error: leadError } = await supabaseAdmin
        .from('leads')
        .insert({
          organization_id: orgId,
          user_id: orgId, // fallback to orgId if no direct user
          name: customer.name,
          phone: customer.phone,
          email: customer.email || null,
          company_name: customer.company_name || null,
          notes: customer.notes || null,
          status: 'open',
          contact_type: 'lead',
          source: 'storefront_catalog',
          metadata: {
            deep_link_url: validated.deepLinkUrl,
            last_item_inquired: itemName,
          },
        })
        .select('id')
        .single()

      if (leadError) throw leadError
      leadId = newLead.id
    }

    // 3. Create Draft Quote in quotes table
    const quoteNumber = `COT-${Date.now().toString().slice(-6)}`
    const unitPrice =
      (validated.quantity || 1) > 0
        ? validated.calculatedTotalPrice / (validated.quantity || 1)
        : validated.calculatedTotalPrice

    const quoteItems = [
      {
        description: `${itemName}${
          validated.selectedVariant?.title ? ` - ${validated.selectedVariant.title}` : ''
        }${
          validated.selectedAddons?.length
            ? ` (+ ${validated.selectedAddons.map((a) => a.name).join(', ')})`
            : ''
        }`,
        quantity: validated.quantity || 1,
        price: unitPrice,
        catalog_item_id: validated.itemId,
        variant_id: validated.variantId || undefined,
        variant_title: validated.selectedVariant?.title || undefined,
        selected_addons: validated.selectedAddons || [],
      },
    ]

    const { data: newQuote, error: quoteError } = await supabaseAdmin
      .from('quotes')
      .insert({
        organization_id: orgId,
        lead_id: leadId,
        number: quoteNumber,
        title: `Cotización: ${itemName}`,
        date: new Date().toISOString().split('T')[0],
        status: 'draft',
        total: validated.calculatedTotalPrice,
        items: quoteItems,
      })
      .select('id, number')
      .single()

    if (quoteError) throw quoteError

    return {
      success: true,
      leadId,
      quoteId: newQuote.id,
      quoteNumber: newQuote.number,
    }
  } catch (err: any) {
    console.error('createStorefrontLeadAndQuoteAction error:', err)
    return {
      success: false,
      error: err.message || 'Error al registrar solicitud de cotización',
    }
  }
}

/**
 * 3. Initialize Wompi Checkout Session & Integrity Signature
 */
export async function createWompiCheckoutSessionAction(
  payload: StorefrontActionPayload
): Promise<WompiCheckoutSessionResult> {
  try {
    const validated = storefrontActionPayloadSchema.parse(payload)
    const orgId = await resolveOrganizationId(validated)
    if (!orgId) throw new Error('No se pudo identificar la organización')

    const amountInCents = Math.round(validated.calculatedTotalPrice * 100)
    const currency = validated.currency || 'COP'
    const reference = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`

    const integritySecret =
      process.env.WOMPI_INTEGRITY_SECRET || 'test_integrity_secret'
    const publicKey =
      process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY ||
      process.env.WOMPI_PUBLIC_KEY ||
      'pub_test_dummy'

    // Compute SHA-256 integrity signature: reference + amountInCents + currency + integritySecret
    const rawSignatureString = `${reference}${amountInCents}${currency}${integritySecret}`
    const signature = crypto
      .createHash('sha256')
      .update(rawSignatureString)
      .digest('hex')

    const redirectUrl = validated.deepLinkUrl

    const checkoutUrl = `https://checkout.wompi.co/p/?public-key=${encodeURIComponent(
      publicKey
    )}&currency=${currency}&amount-in-cents=${amountInCents}&reference=${encodeURIComponent(
      reference
    )}&signature:integrity=${signature}&redirect-url=${encodeURIComponent(redirectUrl)}`

    return {
      success: true,
      reference,
      amountInCents,
      currency,
      signature,
      publicKey,
      checkoutUrl,
    }
  } catch (err: any) {
    console.error('createWompiCheckoutSessionAction error:', err)
    return {
      success: false,
      error: err.message || 'Error al generar sesión de pago Wompi',
    }
  }
}

/**
 * 4. Generate Appointment Booking Deep Link
 */
export async function generateAppointmentBookingLinkAction(
  payload: StorefrontActionPayload
): Promise<AppointmentBookingLinkResult> {
  try {
    const baseUrl = payload.deepLinkUrl || '/portal'
    const separator = baseUrl.includes('?') ? '&' : '?'

    const params = new URLSearchParams()
    params.set('action', 'book')
    params.set('item', payload.itemId)

    if (payload.variantId) {
      params.set('variant', payload.variantId)
    }

    if (payload.appointmentDetails?.date) {
      params.set('date', payload.appointmentDetails.date)
    }

    if (payload.appointmentDetails?.timeSlot) {
      params.set('slot', payload.appointmentDetails.timeSlot)
    }

    if (payload.customerInfo?.name) {
      params.set('name', payload.customerInfo.name)
    }

    if (payload.customerInfo?.phone) {
      params.set('phone', payload.customerInfo.phone)
    }

    const bookingUrl = `${baseUrl}${separator}${params.toString()}`

    return {
      success: true,
      bookingUrl,
    }
  } catch (err: any) {
    console.error('generateAppointmentBookingLinkAction error:', err)
    return {
      success: false,
      bookingUrl: payload.deepLinkUrl || '',
      error: err.message || 'Error al generar enlace de cita',
    }
  }
}
