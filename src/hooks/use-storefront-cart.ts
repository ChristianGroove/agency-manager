'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  CatalogVariant,
  StorefrontCartItem,
  StorefrontCartState,
  StorefrontCustomerProfile,
} from '@/types/catalog'

export interface ExtendedStorefrontCartState extends StorefrontCartState {
  // Multi-organization isolated storage mapping
  itemsByOrg: Record<string, StorefrontCartItem[]>
  setOrgId: (orgId: string) => void
  setOrganizationId: (orgId: string) => void
  setPortalToken: (token: string | null) => void
  setDeliveryMode: (mode: 'pickup' | 'delivery') => void
  setCustomerProfile: (profile: Partial<StorefrontCustomerProfile>) => void
  openDrawer: () => void
  closeDrawer: () => void
  toggleDrawer: () => void
  getItemCount: () => number
  hasOutOfStockItems: () => boolean
}

/**
 * Calculates normalized line pricing:
 * unit_price = base_price + variant_delta + sum(addon_prices)
 * final_price = unit_price * quantity
 */
export function calculateLinePricing(
  basePrice: number,
  variant?: CatalogVariant | StorefrontCartItem['selected_variant'] | null,
  addons?: StorefrontCartItem['selected_addons'] | StorefrontCartItem['selectedAddons'] | null,
  quantity: number = 1
): { unitPrice: number; finalPrice: number } {
  const base = Math.max(0, Number(basePrice || 0))
  let variantDelta = 0

  if (variant) {
    const v: any = variant
    if (v.price_override !== undefined && v.price_override !== null && v.price_override >= 0) {
      variantDelta = Number(v.price_override) - base
    } else if (v.price_type === 'fixed' || v.price_modifier_type === 'fixed' || v.price_type === 'absolute') {
      variantDelta = Number(v.price_modifier || 0) - base
    } else if (v.price_type === 'percentage' || v.price_modifier_type === 'percentage' || v.price_type === 'offset_percentage') {
      variantDelta = (base * Number(v.price_modifier || 0)) / 100
    } else {
      variantDelta = Number(v.price_modifier || 0)
    }
  }

  const effectiveVariantPrice = Math.max(0, base + variantDelta)

  const addonsTotal = (addons || []).reduce((acc, a: any) => {
    const delta = Number(a.priceDelta ?? a.price ?? a.price_delta ?? 0)
    const qty = Number(a.quantity ?? 1)
    return acc + delta * qty
  }, 0)

  const unitPrice = Math.max(0, effectiveVariantPrice + addonsTotal)
  const safeQty = Math.max(1, quantity)
  const finalPrice = Math.max(0, unitPrice * safeQty)

  return { unitPrice, finalPrice }
}

/**
 * Computes a unique signature for deduplicating identical product configurations
 */
function getCartItemSignature(
  itemId: string,
  variantId?: string | null,
  addons?: Array<{ id?: string; optionId?: string; quantity?: number; priceDelta?: number; price?: number }> | null
): string {
  const normItemId = String(itemId || '')
  const normVarId = String(variantId || 'base')
  const sortedAddons = (addons || [])
    .map((a) => `${a.optionId || a.id || ''}:${a.quantity || 1}`)
    .sort()
    .join('|')
  return `${normItemId}__${normVarId}__${sortedAddons}`
}

export const useStorefrontCart = create<ExtendedStorefrontCartState>()(
  persist(
    (set, get) => ({
      organization_id: '',
      organizationId: '',
      portalToken: null,
      items: [],
      itemsByOrg: {},
      delivery_method: 'delivery',
      deliveryMethod: 'delivery',
      customer_profile: {
        name: '',
        phone: '',
        address: '',
        notes: '',
        email: '',
        company_name: '',
        delivery_address: '',
        delivery_method: 'delivery',
      },
      customerProfile: {
        name: '',
        phone: '',
        address: '',
        notes: '',
        email: '',
        company_name: '',
        delivery_address: '',
        delivery_method: 'delivery',
      },
      is_drawer_open: false,
      isOpen: false,

      // Multi-Organization Tenant Switching
      setOrgId: (orgId: string) => {
        const currentOrgId = get().organization_id
        if (currentOrgId === orgId) return

        const currentItems = get().items
        const currentItemsByOrg = { ...get().itemsByOrg }

        // Save current cart under previous orgId
        if (currentOrgId) {
          currentItemsByOrg[currentOrgId] = currentItems
        }

        // Restore cart for target orgId
        const targetItems = currentItemsByOrg[orgId] || []

        set({
          organization_id: orgId,
          organizationId: orgId,
          items: targetItems,
          itemsByOrg: currentItemsByOrg,
        })
      },

      setOrganizationId: (orgId: string) => {
        get().setOrgId(orgId)
      },

      setPortalToken: (token: string | null) => set({ portalToken: token }),

      // Drawer Open / Close Controls
      setDrawerOpen: (open: boolean) =>
        set({ is_drawer_open: open, isOpen: open }),
      openDrawer: () => set({ is_drawer_open: true, isOpen: true }),
      closeDrawer: () => set({ is_drawer_open: false, isOpen: false }),
      toggleDrawer: () =>
        set((state) => ({
          is_drawer_open: !state.is_drawer_open,
          isOpen: !state.is_drawer_open,
        })),

      // Delivery Method
      setDeliveryMethod: (method: 'pickup' | 'delivery') => {
        set((state) => ({
          delivery_method: method,
          deliveryMethod: method,
          customer_profile: {
            ...state.customer_profile,
            delivery_method: method,
          },
          customerProfile: {
            ...state.customerProfile,
            delivery_method: method,
          },
        }))
      },

      setDeliveryMode: (mode: 'pickup' | 'delivery') => {
        get().setDeliveryMethod(mode)
      },

      // Customer Profile
      updateCustomerProfile: (profile) => {
        set((state) => {
          const updatedProfile = {
            ...state.customer_profile,
            ...profile,
          }
          return {
            customer_profile: updatedProfile,
            customerProfile: updatedProfile,
          }
        })
      },

      setCustomerProfile: (profile) => {
        get().updateCustomerProfile(profile)
      },

      // Cart Mutations: Add Item with Line Pricing & Stock Boundary Awareness
      addItem: (incomingItem: any) => {
        const state = get()
        const orgId = incomingItem.organization_id || incomingItem.organizationId || state.organization_id || 'default'

        const catalogItemId = String(incomingItem.catalog_item_id || incomingItem.itemId || incomingItem.id || '')
        const variant = incomingItem.selected_variant || incomingItem.selectedVariant || null
        const variantId = variant?.id || incomingItem.variantId || null

        const rawAddons = incomingItem.selected_addons || incomingItem.selectedAddons || []
        const normalizedAddons = rawAddons.map((a: any) => ({
          id: String(a.id || a.optionId || ''),
          name: String(a.name || ''),
          price: Number(a.price ?? a.priceDelta ?? a.price_delta ?? 0),
          priceDelta: Number(a.priceDelta ?? a.price ?? a.price_delta ?? 0),
          groupId: a.groupId ? String(a.groupId) : undefined,
          optionId: a.optionId ? String(a.optionId) : (a.id ? String(a.id) : undefined),
          quantity: Number(a.quantity || 1),
          skuSuffix: a.skuSuffix || null,
        }))

        const basePrice = Number(incomingItem.base_price ?? incomingItem.basePrice ?? 0)
        const incomingQty = Math.max(1, Number(incomingItem.quantity || 1))

        // Inventory Stock Boundary Check
        const trackInventory = Boolean(
          variant?.track_inventory ??
          variant?.track_stock ??
          incomingItem.track_inventory ??
          incomingItem.trackInventory ??
          false
        )

        const allowBackorders = Boolean(
          variant?.allow_backorders ??
          incomingItem.allow_backorders ??
          incomingItem.allowBackorders ??
          false
        )

        const rawStock =
          variant?.stock_quantity ??
          variant?.inventory_quantity ??
          incomingItem.stock_quantity ??
          incomingItem.inventory_quantity ??
          null

        const stockQuantity = rawStock !== null ? Number(rawStock) : null
        const isOutOfStock = trackInventory && !allowBackorders && stockQuantity !== null && stockQuantity <= 0

        // If strict out of stock, reject adding
        if (isOutOfStock) {
          return
        }

        const maxStock = trackInventory && !allowBackorders && stockQuantity !== null
          ? Math.max(0, stockQuantity)
          : null

        const itemSignature = getCartItemSignature(catalogItemId, variantId, normalizedAddons)
        const currentItems = [...state.items]

        const existingIndex = currentItems.findIndex((item) => {
          const itemVarId = item.selected_variant?.id || item.variantId || null
          const itemAddons = item.selected_addons || item.selectedAddons || []
          const sig = getCartItemSignature(item.catalog_item_id || item.itemId || '', itemVarId, itemAddons)
          return sig === itemSignature
        })

        if (existingIndex > -1) {
          const existing = currentItems[existingIndex]
          let targetQty = existing.quantity + incomingQty
          if (maxStock !== null) {
            targetQty = Math.min(targetQty, maxStock)
          }

          const { unitPrice, finalPrice } = calculateLinePricing(
            basePrice,
            variant,
            normalizedAddons,
            targetQty
          )

          currentItems[existingIndex] = {
            ...existing,
            quantity: targetQty,
            unit_price: unitPrice,
            unitPrice: unitPrice,
            final_price: finalPrice,
            totalPrice: finalPrice,
            stock_quantity: stockQuantity,
            stockQuantity: stockQuantity,
            track_inventory: trackInventory,
            trackInventory: trackInventory,
            allow_backorders: allowBackorders,
            allowBackorders: allowBackorders,
          }
        } else {
          let targetQty = incomingQty
          if (maxStock !== null) {
            targetQty = Math.min(targetQty, maxStock)
          }

          const { unitPrice, finalPrice } = calculateLinePricing(
            basePrice,
            variant,
            normalizedAddons,
            targetQty
          )

          const newLineItem: StorefrontCartItem = {
            id: incomingItem.id && !currentItems.some((i) => i.id === incomingItem.id)
              ? incomingItem.id
              : `${catalogItemId}-${variantId || 'base'}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            catalog_item_id: catalogItemId,
            itemId: catalogItemId,
            name: incomingItem.name || 'Producto',
            category: incomingItem.category || '',
            classification: incomingItem.classification,
            thumbnail_url: incomingItem.thumbnail_url || incomingItem.imageUrl || incomingItem.image_url || null,
            imageUrl: incomingItem.thumbnail_url || incomingItem.imageUrl || incomingItem.image_url || null,
            base_price: basePrice,
            basePrice: basePrice,
            unit_price: unitPrice,
            unitPrice: unitPrice,
            final_price: finalPrice,
            totalPrice: finalPrice,
            quantity: targetQty,
            variantId: variantId,
            selected_variant: variant
              ? {
                  id: variant.id,
                  name: variant.title || variant.name || 'Variante',
                  title: variant.title || variant.name || 'Variante',
                  sku: variant.sku || null,
                  barcode: variant.barcode || null,
                  price_override: variant.price_override ?? null,
                  price_modifier: variant.price_modifier ?? 0,
                  price_type: variant.price_type || variant.price_modifier_type,
                  attributes: variant.attributes || {},
                }
              : null,
            selectedVariant: variant || null,
            selected_addons: normalizedAddons,
            selectedAddons: normalizedAddons,
            custom_notes: incomingItem.custom_notes || incomingItem.notes || '',
            track_inventory: trackInventory,
            trackInventory: trackInventory,
            stock_quantity: stockQuantity,
            stockQuantity: stockQuantity,
            inventory_quantity: stockQuantity,
            allow_backorders: allowBackorders,
            allowBackorders: allowBackorders,
            low_stock_threshold: incomingItem.low_stock_threshold ?? incomingItem.lowStockThreshold ?? 5,
            sku: variant?.sku || incomingItem.sku || null,
            isOutOfStock: false,
            deepLinkUrl: incomingItem.deepLinkUrl || incomingItem.deep_link_url || '',
          }

          currentItems.push(newLineItem)
        }

        const currentItemsByOrg = {
          ...state.itemsByOrg,
          [orgId]: currentItems,
        }

        set({
          organization_id: state.organization_id || orgId,
          organizationId: state.organization_id || orgId,
          items: currentItems,
          itemsByOrg: currentItemsByOrg,
        })
      },

      // Remove Line Item
      removeItem: (lineId: string) => {
        const state = get()
        const updated = state.items.filter((i) => i.id !== lineId)
        const orgId = state.organization_id || 'default'

        set({
          items: updated,
          itemsByOrg: {
            ...state.itemsByOrg,
            [orgId]: updated,
          },
        })
      },

      // Update Quantity with clamping to stock
      updateQuantity: (lineId: string, requestedQuantity: number) => {
        const state = get()
        const orgId = state.organization_id || 'default'

        if (requestedQuantity <= 0) {
          get().removeItem(lineId)
          return
        }

        const updated = state.items.map((item) => {
          if (item.id !== lineId) return item

          const trackInventory = Boolean(item.track_inventory ?? item.trackInventory)
          const allowBackorders = Boolean(item.allow_backorders ?? item.allowBackorders)
          const stock = item.stock_quantity ?? item.inventory_quantity ?? null

          let clampedQty = Math.max(1, requestedQuantity)
          if (trackInventory && !allowBackorders && stock !== null) {
            const maxStock = Math.max(0, Number(stock))
            clampedQty = Math.min(clampedQty, maxStock > 0 ? maxStock : 1)
          }

          const { unitPrice, finalPrice } = calculateLinePricing(
            item.base_price,
            item.selected_variant || item.selectedVariant,
            item.selected_addons || item.selectedAddons,
            clampedQty
          )

          return {
            ...item,
            quantity: clampedQty,
            unit_price: unitPrice,
            unitPrice: unitPrice,
            final_price: finalPrice,
            totalPrice: finalPrice,
          }
        })

        set({
          items: updated,
          itemsByOrg: {
            ...state.itemsByOrg,
            [orgId]: updated,
          },
        })
      },

      // Clear Cart
      clearCart: () => {
        const state = get()
        const orgId = state.organization_id || 'default'

        set({
          items: [],
          itemsByOrg: {
            ...state.itemsByOrg,
            [orgId]: [],
          },
        })
      },

      // Getters & Computed Metrics
      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + (item.quantity || 0), 0)
      },

      getItemCount: () => {
        return get().getTotalItems()
      },

      getSubtotal: () => {
        return get().items.reduce(
          (sum, item) => sum + (item.final_price ?? (item.unit_price * item.quantity)),
          0
        )
      },

      getTotal: () => {
        return get().getSubtotal()
      },

      hasOutOfStockItems: () => {
        return get().items.some((item) => {
          const track = Boolean(item.track_inventory ?? item.trackInventory)
          const backorders = Boolean(item.allow_backorders ?? item.allowBackorders)
          const stock = item.stock_quantity ?? item.inventory_quantity ?? null
          return track && !backorders && stock !== null && stock <= 0
        })
      },
    }),
    {
      name: 'storefront-cart-storage',
      partialize: (state) => ({
        organization_id: state.organization_id,
        items: state.items,
        itemsByOrg: state.itemsByOrg,
        delivery_method: state.delivery_method,
        customer_profile: state.customer_profile,
      }),
    }
  )
)
