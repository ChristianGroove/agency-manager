'use server'

/**
 * ==============================================================================
 * MULTI-CHANNEL ACTION HUB SERVER ACTIONS
 * File: src/modules/features/catalog/action-hub-actions.ts
 * Multi-Channel Storefront Engine: WhatsApp Checkout, Lead/Quote CRM, Wompi & Bookings
 * 100% Supports Single Item and Multi-Item Consolidated Cart Lines
 * ==============================================================================
 */

import { createClient } from '@/modules/core/database/supabase-server'
import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions'
import {
  StorefrontActionPayload,
  StorefrontCartItem,
  StorefrontCustomerProfile,
  CatalogVariant,
} from '@/types/catalog'
import {
  storefrontActionPayloadSchema,
  StorefrontActionPayloadInput,
} from './schemas/catalog.schema'
import crypto from 'crypto'

// ------------------------------------------------------------------------------
// RESULT & PAYLOAD INTERFACES
// ------------------------------------------------------------------------------

export interface WhatsAppCheckoutResult {
  success: boolean
  uri: string
  message: string
  leadId?: string
  error?: string
}

export interface StorefrontQuoteResult {
  success: boolean
  leadId?: string
  quoteId?: string
  quoteNumber?: string
  quoteUrl?: string
  publicUrl?: string
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

export interface ConsolidatedCartCheckoutInput {
  organizationId?: string | null
  portalToken?: string | null
  sourcePortalToken?: string
  items: StorefrontCartItem[]
  customerInfo?: StorefrontCustomerProfile | {
    name: string
    phone: string
    email?: string
    company_name?: string
    companyName?: string
    address?: string
    delivery_address?: string
    deliveryAddress?: string
    delivery_method?: 'pickup' | 'delivery'
    deliveryMethod?: 'pickup' | 'delivery'
    notes?: string
  }
  deliveryMethod?: 'pickup' | 'delivery'
  delivery_method?: 'pickup' | 'delivery'
  currency?: string
  totalAmount?: number
  deepLinkUrl?: string
}

// ------------------------------------------------------------------------------
// INTERNAL NORMALIZED STRUCTURES
// ------------------------------------------------------------------------------

interface NormalizedOrderLine {
  catalogItemId: string
  name: string
  variantId?: string | null
  variantTitle?: string | null
  selectedAddons?: Array<{
    groupId?: string
    optionId?: string
    name: string
    priceDelta: number
    quantity?: number
    skuSuffix?: string | null
  }>
  unitPrice: number
  totalPrice: number
  quantity: number
  sku?: string | null
  deepLinkUrl?: string
}

interface NormalizedOrderContext {
  orgId: string | null
  orgName: string
  items: NormalizedOrderLine[]
  customerInfo?: {
    name: string
    phone: string
    email?: string
    company_name?: string
    address?: string
    notes?: string
  }
  deliveryMethod: 'pickup' | 'delivery'
  currency: string
  totalAmount: number
  totalCount: number
  deepLinkUrl: string
}

// ------------------------------------------------------------------------------
// HELPER FUNCTIONS
// ------------------------------------------------------------------------------

async function resolveOrganizationId(
  payload:
    | StorefrontActionPayloadInput
    | StorefrontActionPayload
    | ConsolidatedCartCheckoutInput
    | { organizationId?: string | null; portalToken?: string | null; sourcePortalToken?: string; items?: any[]; itemId?: string }
    | any
): Promise<string | null> {
  if (payload?.organizationId) {
    return payload.organizationId
  }
  if (payload?.organization_id) {
    return payload.organization_id
  }
  if (Array.isArray(payload?.items) && payload.items[0]?.organization_id) {
    return payload.items[0].organization_id
  }
  if (Array.isArray(payload?.items) && payload.items[0]?.organizationId) {
    return payload.items[0].organizationId
  }
  if (payload?.itemId) {
    const { data: item } = await supabaseAdmin
      .from('service_catalog')
      .select('organization_id')
      .eq('id', payload.itemId)
      .maybeSingle()
    if (item?.organization_id) return item.organization_id
  }

  const token = (payload as any)?.portalToken || (payload as any)?.sourcePortalToken
  if (token) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)

    // 1. Try finding lead
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

    // 2. Try finding organization
    let orgQuery = supabaseAdmin.from('organizations').select('id')
    if (isUuid) {
      orgQuery = orgQuery.or(`id.eq.${token},slug.eq.${token}`)
    } else {
      orgQuery = orgQuery.eq('slug', token)
    }
    const { data: org } = await orgQuery.maybeSingle()
    if (org?.id) return org.id

    // 3. Try finding by custom domain
    const { data: orgSettings } = await supabaseAdmin
      .from('organization_settings')
      .select('organization_id')
      .eq('custom_domain', token)
      .maybeSingle()
    if (orgSettings?.organization_id) return orgSettings.organization_id
  }

  const currentOrg = await getCurrentOrganizationId()
  return currentOrg ?? null
}

function cleanPhoneNumber(rawPhone: string): string {
  let cleaned = (rawPhone || '').replace(/[^\d+]/g, '')
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1)
  }
  // Default to Colombia country code (57) if 10 digits without country code
  if (cleaned.length === 10 && !cleaned.startsWith('57')) {
    cleaned = `57${cleaned}`
  }
  return cleaned
}

function formatCOP(amount: number): string {
  return Number(amount || 0).toLocaleString('es-CO')
}

/**
 * Normalizes single item or multi-item cart payloads into a consistent internal model
 */
async function normalizeOrderContext(
  input: StorefrontActionPayload | ConsolidatedCartCheckoutInput | any,
  customerOverride?: any,
  optionsOverride?: any
): Promise<NormalizedOrderContext> {
  // Check if input is multi-item array or consolidated payload
  const isArray = Array.isArray(input)
  const isConsolidated = isArray || (input && Array.isArray(input.items))

  let orgId = await resolveOrganizationId(
    isArray ? (optionsOverride || {}) : input
  )

  // Fetch organization name for store header
  let orgName = 'Nuestra Tienda'
  if (orgId) {
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .maybeSingle()
    if (org?.name) orgName = org.name
  }

  const rawCustomer =
    customerOverride ||
    (isConsolidated ? (input.customerInfo || input.customer_profile || input.customerProfile) : input.customerInfo)

  const customerInfo = rawCustomer?.name
    ? {
        name: String(rawCustomer.name).trim(),
        phone: String(rawCustomer.phone || '').trim(),
        email: rawCustomer.email ? String(rawCustomer.email).trim() : undefined,
        company_name: rawCustomer.company_name || rawCustomer.companyName || undefined,
        address: rawCustomer.address || rawCustomer.delivery_address || rawCustomer.deliveryAddress || undefined,
        notes: rawCustomer.notes || undefined,
      }
    : undefined

  const deliveryMethod: 'pickup' | 'delivery' =
    optionsOverride?.deliveryMethod ||
    optionsOverride?.delivery_method ||
    input?.deliveryMethod ||
    input?.delivery_method ||
    rawCustomer?.delivery_method ||
    rawCustomer?.deliveryMethod ||
    'delivery'

  const currency = optionsOverride?.currency || input?.currency || 'COP'
  const normalizedLines: NormalizedOrderLine[] = []

  if (isConsolidated) {
    const rawItems: StorefrontCartItem[] = isArray ? input : (input.items || [])
    for (const item of rawItems) {
      const lineItemId = String(item.catalog_item_id || item.itemId || item.id || '')
      const variant = item.selected_variant || item.selectedVariant
      const variantTitle = variant?.title || variant?.name || null

      const addons = (item.selected_addons || item.selectedAddons || []).map((a: any) => ({
        groupId: a.groupId || a.group_id,
        optionId: a.optionId || a.option_id || a.id,
        name: a.name,
        priceDelta: Number(a.priceDelta ?? a.price ?? a.price_delta ?? 0),
        quantity: Number(a.quantity || 1),
        skuSuffix: a.skuSuffix || a.sku_suffix || null,
      }))

      const qty = Math.max(1, Number(item.quantity || 1))
      const unitPrice = Number(item.unit_price ?? item.unitPrice ?? (item.final_price ? item.final_price / qty : 0))
      const totalPrice = Number(item.final_price ?? item.totalPrice ?? (unitPrice * qty))

      normalizedLines.push({
        catalogItemId: lineItemId,
        name: item.name || 'Producto',
        variantId: item.variantId || variant?.id || null,
        variantTitle,
        selectedAddons: addons,
        unitPrice,
        totalPrice,
        quantity: qty,
        sku: item.sku || variant?.sku || null,
        deepLinkUrl: item.deepLinkUrl,
      })
    }
  } else {
    // Single item payload
    let itemName = input.itemId || 'Producto'
    if (orgId && input.itemId) {
      const { data: itemRow } = await supabaseAdmin
        .from('service_catalog')
        .select('name')
        .eq('id', input.itemId)
        .maybeSingle()
      if (itemRow?.name) itemName = itemRow.name
    }

    const qty = Math.max(1, Number(input.quantity || 1))
    const totalPrice = Number(input.calculatedTotalPrice || 0)
    const unitPrice = qty > 0 ? totalPrice / qty : totalPrice

    const addons = (input.selectedAddons || []).map((a: any) => ({
      groupId: a.groupId,
      optionId: a.optionId,
      name: a.name,
      priceDelta: Number(a.priceDelta || 0),
      quantity: Number(a.quantity || 1),
      skuSuffix: a.skuSuffix || null,
    }))

    normalizedLines.push({
      catalogItemId: input.itemId,
      name: itemName,
      variantId: input.variantId || input.selectedVariant?.id || null,
      variantTitle: input.selectedVariant?.title || null,
      selectedAddons: addons,
      unitPrice,
      totalPrice,
      quantity: qty,
      sku: input.selectedVariant?.sku || null,
      deepLinkUrl: input.deepLinkUrl,
    })
  }

  const totalCount = normalizedLines.reduce((sum, l) => sum + l.quantity, 0)
  const totalAmount =
    optionsOverride?.totalAmount ??
    input?.totalAmount ??
    normalizedLines.reduce((sum, l) => sum + l.totalPrice, 0)

  const deepLinkUrl =
    optionsOverride?.deepLinkUrl ||
    input?.deepLinkUrl ||
    normalizedLines[0]?.deepLinkUrl ||
    '/portal'

  return {
    orgId,
    orgName,
    items: normalizedLines,
    customerInfo,
    deliveryMethod,
    currency,
    totalAmount,
    totalCount,
    deepLinkUrl,
  }
}

/**
 * Finds or inserts a lead record in public.leads
 */
async function findOrUpsertLead(
  orgId: string,
  customer?: {
    name: string
    phone: string
    email?: string
    company_name?: string
    address?: string
    notes?: string
  },
  metadataPayload?: Record<string, any>
): Promise<string | undefined> {
  if (!customer?.name || !customer?.phone || !orgId) return undefined

  try {
    const cleanPhone = customer.phone.trim()
    const cleanEmail = customer.email?.trim() || null

    let query = supabaseAdmin
      .from('leads')
      .select('id, metadata')
      .eq('organization_id', orgId)

    if (cleanEmail) {
      query = query.or(`phone.eq.${cleanPhone},email.eq.${cleanEmail}`)
    } else {
      query = query.eq('phone', cleanPhone)
    }

    const { data: existingLead } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingLead) {
      const mergedMetadata = {
        ...(typeof existingLead.metadata === 'object' && existingLead.metadata !== null
          ? existingLead.metadata
          : {}),
        ...(metadataPayload || {}),
        last_interaction_at: new Date().toISOString(),
      }

      await supabaseAdmin
        .from('leads')
        .update({
          name: customer.name,
          company_name: customer.company_name || null,
          address: customer.address || null,
          notes: customer.notes || null,
          metadata: mergedMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingLead.id)

      return existingLead.id
    } else {
      // Resolve organization owner / member if user_id is required
      let ownerUserId: string | null = null
      try {
        const { data: member } = await supabaseAdmin
          .from('organization_members')
          .select('user_id')
          .eq('organization_id', orgId)
          .limit(1)
          .maybeSingle()
        if (member?.user_id) {
          ownerUserId = member.user_id
        }
      } catch (_) {}

      const insertPayload: any = {
        organization_id: orgId,
        name: customer.name,
        phone: cleanPhone,
        email: cleanEmail,
        company_name: customer.company_name || null,
        address: customer.address || null,
        notes: customer.notes || null,
        status: 'open',
        contact_type: 'lead',
        source: 'storefront_catalog',
        metadata: {
          ...(metadataPayload || {}),
          created_via: 'storefront_action_hub',
          created_at: new Date().toISOString(),
        },
      }

      if (ownerUserId) {
        insertPayload.user_id = ownerUserId
      }

      const { data: newLead, error: insertError } = await supabaseAdmin
        .from('leads')
        .insert(insertPayload)
        .select('id')
        .single()

      if (!insertError && newLead?.id) {
        return newLead.id
      }
    }
  } catch (err) {
    console.warn('findOrUpsertLead notice:', err)
  }
  return undefined
}

/**
 * Validates stock availability for all order items against database
 */
async function validateStockForItems(
  orgId: string,
  items: NormalizedOrderLine[]
): Promise<{ valid: boolean; error?: string }> {
  try {
    for (const item of items) {
      if (item.variantId) {
        const { data: variant } = await supabaseAdmin
          .from('service_catalog_variants')
          .select('id, name, inventory_quantity, stock_quantity, track_inventory, track_stock, allow_backorders')
          .eq('id', item.variantId)
          .maybeSingle()

        const { data: parent } = await supabaseAdmin
          .from('service_catalog')
          .select('name, track_inventory, track_stock, allow_backorders, inventory_quantity, stock_quantity')
          .eq('id', item.catalogItemId)
          .maybeSingle()

        const track = Boolean(
          variant?.track_inventory ??
          variant?.track_stock ??
          parent?.track_inventory ??
          parent?.track_stock ??
          false
        )
        const allowBackorders = Boolean(
          variant?.allow_backorders ?? parent?.allow_backorders ?? false
        )
        const stock = Number(
          variant?.inventory_quantity ??
          variant?.stock_quantity ??
          parent?.inventory_quantity ??
          parent?.stock_quantity ??
          0
        )

        if (track && !allowBackorders && stock < item.quantity) {
          const varName = variant?.name || item.variantTitle || 'Variante'
          return {
            valid: false,
            error: `Stock insuficiente para "${parent?.name || item.name} (${varName})". Disponibles: ${stock}, Solicitadas: ${item.quantity}.`,
          }
        }
      } else {
        const { data: catItem } = await supabaseAdmin
          .from('service_catalog')
          .select('name, track_inventory, track_stock, allow_backorders, inventory_quantity, stock_quantity')
          .eq('id', item.catalogItemId)
          .maybeSingle()

        if (catItem) {
          const track = Boolean(catItem.track_inventory ?? catItem.track_stock ?? false)
          const allowBackorders = Boolean(catItem.allow_backorders ?? false)
          const stock = Number(catItem.inventory_quantity ?? catItem.stock_quantity ?? 0)

          if (track && !allowBackorders && stock < item.quantity) {
            return {
              valid: false,
              error: `Stock insuficiente para "${catItem.name}". Disponibles: ${stock}, Solicitadas: ${item.quantity}.`,
            }
          }
        }
      }
    }
    return { valid: true }
  } catch (err: any) {
    console.error('validateStockForItems error:', err)
    return { valid: false, error: err.message || 'Error al validar disponibilidad de inventario' }
  }
}

/**
 * Builds structured, readable Colombian WhatsApp message format
 */
function buildWhatsAppOrderMessage(
  orgName: string,
  items: NormalizedOrderLine[],
  totalCount: number,
  totalAmount: number,
  currency: string,
  deliveryMethod: 'pickup' | 'delivery',
  customer?: {
    name: string
    phone: string
    email?: string
    company_name?: string
    address?: string
    notes?: string
  }
): string {
  const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

  const linesFormatted = items
    .map((item, idx) => {
      const prefix = items.length > 1 ? `${numberEmojis[idx] || `${idx + 1}.`} ` : ''
      const variantText = item.variantTitle
        ? `\n   🎛️ *Variante:* ${item.variantTitle}`
        : ''

      let addonsText = ''
      if (item.selectedAddons && item.selectedAddons.length > 0) {
        addonsText =
          '\n   ➕ *Adicionales:* ' +
          item.selectedAddons
            .map((a) => `${a.name} (+$${formatCOP(a.priceDelta)})`)
            .join(', ')
      }

      const deepLinkText = item.deepLinkUrl
        ? `\n   🔗 *Enlace:* ${item.deepLinkUrl}`
        : ''

      return `${prefix}*${item.name}*${variantText}${addonsText}\n   🔢 Cantidad: ${item.quantity} x $${formatCOP(item.unitPrice)} ${currency}\n   💵 Subtotal: $${formatCOP(item.totalPrice)} ${currency}${deepLinkText}`
    })
    .join('\n\n')

  const deliveryLabel =
    deliveryMethod === 'delivery' ? 'Envío a Domicilio' : 'Retiro en Tienda'

  let customerText = ''
  if (customer?.name) {
    customerText = `\n--------------------------------------------------\n👤 *Datos del Cliente:*\n• Nombre: ${customer.name}\n• WhatsApp / Teléfono: ${customer.phone}`
    if (customer.email) {
      customerText += `\n• Email: ${customer.email}`
    }
    if (customer.company_name) {
      customerText += `\n• Empresa: ${customer.company_name}`
    }
    if (deliveryMethod === 'delivery' && customer.address) {
      customerText += `\n• Dirección de Entrega: ${customer.address}`
    }
    if (customer.notes) {
      customerText += `\n• Notas: ${customer.notes}`
    }
  }

  const message = `🛒 *NUEVO PEDIDO DESDE TIENDA — ${orgName.toUpperCase()}*
--------------------------------------------------
📦 *Resumen de Productos (${totalCount} ${totalCount === 1 ? 'ítem' : 'ítems'}):*

${linesFormatted}

--------------------------------------------------
🚚 *Método de Entrega:* ${deliveryLabel}${customerText}
--------------------------------------------------
💰 *TOTAL DEL PEDIDO:* $${formatCOP(totalAmount)} ${currency}
--------------------------------------------------
_Generado automáticamente desde Pixy Storefront_`

  return message
}

// ------------------------------------------------------------------------------
// 1. WHATSAPP CHECKOUT SERVER ACTIONS
// ------------------------------------------------------------------------------

/**
 * Consolidated Multi-Item WhatsApp Checkout Generator
 */
export async function generateConsolidatedWhatsAppCheckoutAction(
  payloadOrItems: ConsolidatedCartCheckoutInput | StorefrontCartItem[],
  customerInfoParam?: StorefrontCustomerProfile | any,
  optionsParam?: {
    organizationId?: string | null
    portalToken?: string | null
    sourcePortalToken?: string
    currency?: string
    deliveryMethod?: 'pickup' | 'delivery'
    delivery_method?: 'pickup' | 'delivery'
    totalAmount?: number
    deepLinkUrl?: string
    phone?: string
  }
): Promise<WhatsAppCheckoutResult> {
  try {
    const ctx = await normalizeOrderContext(
      payloadOrItems,
      customerInfoParam,
      optionsParam
    )

    if (ctx.items.length === 0) {
      throw new Error('No hay productos en el pedido')
    }

    // Resolve destination WhatsApp phone number
    let destinationPhone =
      optionsParam?.phone?.trim() ||
      (payloadOrItems as any)?.phone?.trim()

    if (!destinationPhone && ctx.orgId) {
      const { data: settings } = await supabaseAdmin
        .from('organization_settings')
        .select('portal_theme_config, whatsapp_notifications_phone')
        .eq('organization_id', ctx.orgId)
        .maybeSingle()

      const themeConfig = settings?.portal_theme_config as any
      destinationPhone =
        themeConfig?.social_links?.whatsapp ||
        settings?.whatsapp_notifications_phone ||
        ''
    }

    if (!destinationPhone) {
      destinationPhone = ctx.customerInfo?.phone || '573000000000'
    }

    const cleanPhone = cleanPhoneNumber(destinationPhone)

    // Build formatted message
    const message = buildWhatsAppOrderMessage(
      ctx.orgName,
      ctx.items,
      ctx.totalCount,
      ctx.totalAmount,
      ctx.currency,
      ctx.deliveryMethod,
      ctx.customerInfo
    )

    // Automatically find or insert lead in public.leads
    let leadId: string | undefined
    if (ctx.orgId && ctx.customerInfo?.name && ctx.customerInfo?.phone) {
      leadId = await findOrUpsertLead(ctx.orgId, ctx.customerInfo, {
        source: 'storefront_cart',
        total_items: ctx.totalCount,
        total_amount: ctx.totalAmount,
        currency: ctx.currency,
        delivery_method: ctx.deliveryMethod,
        items_summary: ctx.items.map((i) => ({
          name: i.name,
          variant: i.variantTitle,
          quantity: i.quantity,
          price: i.unitPrice,
          subtotal: i.totalPrice,
        })),
      })
    }

    const encodedMessage = encodeURIComponent(message)
    const uri = `https://wa.me/${cleanPhone}?text=${encodedMessage}`

    return {
      success: true,
      uri,
      message,
      leadId,
    }
  } catch (err: any) {
    console.error('generateConsolidatedWhatsAppCheckoutAction error:', err)
    return {
      success: false,
      uri: '',
      message: '',
      error: err.message || 'Error al generar enlace consolidado de WhatsApp',
    }
  }
}

/**
 * Standard WhatsApp Checkout Action (Single item or Multi-item polymorphic)
 */
export async function generateWhatsAppCheckoutUriAction(
  payload: StorefrontActionPayload | ConsolidatedCartCheckoutInput | any,
  phone?: string
): Promise<WhatsAppCheckoutResult> {
  return generateConsolidatedWhatsAppCheckoutAction(
    payload,
    payload?.customerInfo,
    { phone, ...(payload?.organizationId ? { organizationId: payload.organizationId } : {}) }
  )
}

// ------------------------------------------------------------------------------
// 2. WOMPI ONLINE PAYMENT CHECKOUT SERVER ACTIONS
// ------------------------------------------------------------------------------

/**
 * Multi-Item Wompi Checkout Session Generator with Stock Verification & SHA-256 HMAC Signature
 */
export async function createMultiItemWompiCheckoutSessionAction(
  payloadOrItems: ConsolidatedCartCheckoutInput | StorefrontCartItem[],
  customerInfoParam?: StorefrontCustomerProfile | any,
  optionsParam?: {
    organizationId?: string | null
    portalToken?: string | null
    sourcePortalToken?: string
    currency?: string
    deliveryMethod?: 'pickup' | 'delivery'
    delivery_method?: 'pickup' | 'delivery'
    totalAmount?: number
    deepLinkUrl?: string
  }
): Promise<WompiCheckoutSessionResult> {
  try {
    const ctx = await normalizeOrderContext(
      payloadOrItems,
      customerInfoParam,
      optionsParam
    )

    if (!ctx.orgId) {
      throw new Error('No se pudo identificar la organización para la sesión de pago')
    }

    if (ctx.items.length === 0) {
      throw new Error('No hay productos en el carrito para procesar el pago')
    }

    // 1. Validate stock availability before creating payment session
    const stockValidation = await validateStockForItems(ctx.orgId, ctx.items)
    if (!stockValidation.valid) {
      return {
        success: false,
        error: stockValidation.error || 'Stock insuficiente para uno o más productos',
      }
    }

    // 2. Fetch organization-specific Wompi gateway configuration
    const { data: orgSettings } = await supabaseAdmin
      .from('organization_settings')
      .select('wompi_public_key, wompi_integrity_secret, wompi_currency')
      .eq('organization_id', ctx.orgId)
      .maybeSingle()

    const publicKey =
      orgSettings?.wompi_public_key ||
      process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY ||
      process.env.WOMPI_PUBLIC_KEY ||
      null

    const integritySecret =
      orgSettings?.wompi_integrity_secret ||
      process.env.WOMPI_INTEGRITY_SECRET ||
      null

    if (!publicKey || !integritySecret) {
      return {
        success: false,
        error:
          'La pasarela de pagos en línea (Wompi) no ha sido configurada aún para esta tienda. Puedes finalizar tu pedido directamente por WhatsApp o solicitar una cotización formal.',
      }
    }

    // 3. Generate unique order reference: ORD-${Date.now()}-${random5}
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
    const reference = `ORD-${Date.now()}-${randomSuffix}`

    const amountInCents = Math.round(ctx.totalAmount * 100)
    const currency = orgSettings?.wompi_currency || ctx.currency || 'COP'

    // 4. Compute SHA-256 HMAC integrity signature: reference + amountInCents + currency + integritySecret
    const rawSignatureString = `${reference}${amountInCents}${currency}${integritySecret}`
    const signature = crypto
      .createHash('sha256')
      .update(rawSignatureString)
      .digest('hex')

    // 4. Save Pending Transaction in payment_transactions table for webhook lookup
    const itemsSnapshot = ctx.items.map((i) => ({
      catalog_item_id: i.catalogItemId,
      itemId: i.catalogItemId,
      variant_id: i.variantId || null,
      variantId: i.variantId || null,
      variant_title: i.variantTitle || null,
      name: i.name,
      quantity: i.quantity,
      unit_price: i.unitPrice,
      price: i.unitPrice,
      total_price: i.totalPrice,
      total: i.totalPrice,
      selected_addons: i.selectedAddons || [],
      sku: i.sku || null,
    }))

    const { error: txInsertError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        reference,
        amount_in_cents: amountInCents,
        currency,
        organization_id: ctx.orgId,
        invoice_ids: [],
        status: 'PENDING',
        metadata: {
          source: 'storefront_catalog',
          type: 'storefront_order',
          items: itemsSnapshot,
          items_snapshot: itemsSnapshot,
          customer: ctx.customerInfo,
          delivery_method: ctx.deliveryMethod,
          delivery_address: ctx.customerInfo?.address || null,
          created_at: new Date().toISOString(),
        },
      })

    if (txInsertError) {
      console.warn('payment_transactions insert warning:', txInsertError)
    }

    // 5. Build Wompi Gateway Redirect URL with customer data
    const params = new URLSearchParams()
    params.set('public-key', publicKey)
    params.set('currency', currency)
    params.set('amount-in-cents', String(amountInCents))
    params.set('reference', reference)
    params.set('signature:integrity', signature)

    if (ctx.deepLinkUrl) {
      params.set('redirect-url', ctx.deepLinkUrl)
    }

    if (ctx.customerInfo?.name) {
      params.set('customer-data:full-name', ctx.customerInfo.name)
    }
    if (ctx.customerInfo?.phone) {
      params.set('customer-data:phone-number', cleanPhoneNumber(ctx.customerInfo.phone))
    }
    if (ctx.customerInfo?.email) {
      params.set('customer-data:email', ctx.customerInfo.email)
    }

    const checkoutUrl = `https://checkout.wompi.co/p/?${params.toString()}`

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
    console.error('createMultiItemWompiCheckoutSessionAction error:', err)
    return {
      success: false,
      error: err.message || 'Error al generar sesión de pago Wompi',
    }
  }
}

/**
 * Standard Wompi Checkout Session Action (Single item or Multi-item polymorphic)
 */
export async function createWompiCheckoutSessionAction(
  payload: StorefrontActionPayload | ConsolidatedCartCheckoutInput | any
): Promise<WompiCheckoutSessionResult> {
  return createMultiItemWompiCheckoutSessionAction(payload)
}

/**
 * Backward compatibility alias for Consolidated Wompi Session
 */
export const createConsolidatedWompiSessionAction = createMultiItemWompiCheckoutSessionAction

// ------------------------------------------------------------------------------
// 3. 1-CLICK CRM LEAD & FORMAL QUOTE SERVER ACTIONS
// ------------------------------------------------------------------------------

/**
 * Multi-Item Storefront CRM Lead & Formal Quote Creation
 */
export async function createMultiItemStorefrontQuoteAction(
  payloadOrItems: ConsolidatedCartCheckoutInput | StorefrontCartItem[],
  customerInfoParam?: StorefrontCustomerProfile | any,
  optionsParam?: {
    organizationId?: string | null
    portalToken?: string | null
    sourcePortalToken?: string
    currency?: string
    deliveryMethod?: 'pickup' | 'delivery'
    delivery_method?: 'pickup' | 'delivery'
    totalAmount?: number
    deepLinkUrl?: string
  }
): Promise<StorefrontQuoteResult> {
  try {
    const ctx = await normalizeOrderContext(
      payloadOrItems,
      customerInfoParam,
      optionsParam
    )

    if (!ctx.orgId) {
      throw new Error('No se pudo identificar la organización para la cotización')
    }

    const customer = ctx.customerInfo
    if (!customer?.name || !customer?.phone) {
      throw new Error('Nombre y teléfono del cliente son requeridos para solicitar cotización')
    }

    if (ctx.items.length === 0) {
      throw new Error('No hay productos seleccionados para cotizar')
    }

    // 1. Find or Upsert Lead in public.leads
    const leadId = await findOrUpsertLead(ctx.orgId, customer, {
      source: 'storefront_quote_request',
      total_items: ctx.totalCount,
      total_amount: ctx.totalAmount,
      currency: ctx.currency,
      inquired_products: ctx.items.map((i) => i.name),
    })

    if (!leadId) {
      throw new Error('No se pudo registrar o actualizar el contacto del cliente')
    }

    // 2. Generate Formal Quote Number: COT-${Date.now().toString().slice(-6)}
    const quoteNumber = `COT-${Date.now().toString().slice(-6)}`

    // 3. Construct QuoteItem objects array
    const quoteItems = ctx.items.map((item) => ({
      description: `${item.name}${
        item.variantTitle ? ` - ${item.variantTitle}` : ''
      }${
        item.selectedAddons && item.selectedAddons.length > 0
          ? ` (+ ${item.selectedAddons.map((a) => a.name).join(', ')})`
          : ''
      }`,
      quantity: item.quantity,
      price: item.unitPrice,
      catalog_item_id: item.catalogItemId,
      variant_id: item.variantId || undefined,
      variant_title: item.variantTitle || undefined,
      selected_addons: item.selectedAddons || [],
      sku: item.sku || undefined,
    }))

    const quoteTitle =
      ctx.items.length === 1
        ? `Cotización: ${ctx.items[0].name}`
        : `Cotización: ${ctx.items.length} productos de catálogo`

    // 4. Insert formal Quote into public.quotes
    // Respects quotes_entity_check constraint: quotes link to either client_id OR lead_id
    const { data: newQuote, error: quoteError } = await supabaseAdmin
      .from('quotes')
      .insert({
        organization_id: ctx.orgId,
        lead_id: leadId,
        client_id: null,
        number: quoteNumber,
        date: new Date().toISOString().split('T')[0],
        status: 'draft',
        total: ctx.totalAmount,
        items: quoteItems,
      })
      .select('id, number')
      .single()

    if (quoteError) {
      console.error('Error creating quote record:', quoteError)
      throw quoteError
    }

    const publicUrl = `/quote/${newQuote.id}`

    return {
      success: true,
      leadId,
      quoteId: newQuote.id,
      quoteNumber: newQuote.number,
      quoteUrl: publicUrl,
      publicUrl,
    }
  } catch (err: any) {
    console.error('createMultiItemStorefrontQuoteAction error:', err)
    return {
      success: false,
      error: err.message || 'Error al registrar solicitud de cotización',
    }
  }
}

/**
 * Standard Storefront Lead & Quote Action (Single item or Multi-item polymorphic)
 */
export async function createStorefrontLeadAndQuoteAction(
  payload: StorefrontActionPayload | ConsolidatedCartCheckoutInput | any
): Promise<StorefrontQuoteResult> {
  return createMultiItemStorefrontQuoteAction(payload)
}

/**
 * Backward compatibility alias for Cart Quote Action
 */
export const createStorefrontCartQuoteAction = createMultiItemStorefrontQuoteAction

// ------------------------------------------------------------------------------
// 4. APPOINTMENT BOOKING DEEP LINK SERVER ACTION
// ------------------------------------------------------------------------------

/**
 * Generates an Appointment Booking Deep Link for Service Items
 */
export async function generateAppointmentBookingLinkAction(
  payload: StorefrontActionPayload | {
    itemId: string
    variantId?: string | null
    deepLinkUrl?: string
    appointmentDetails?: { date?: string; timeSlot?: string; staffId?: string }
    customerInfo?: { name?: string; phone?: string; email?: string; notes?: string }
  }
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

    if (payload.appointmentDetails?.staffId) {
      params.set('staff', payload.appointmentDetails.staffId)
    }

    if (payload.customerInfo?.name) {
      params.set('name', payload.customerInfo.name)
    }

    if (payload.customerInfo?.phone) {
      params.set('phone', payload.customerInfo.phone)
    }

    if ((payload.customerInfo as any)?.email) {
      params.set('email', (payload.customerInfo as any).email)
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
