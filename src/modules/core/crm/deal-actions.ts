"use server"

import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from 'next/cache'
import { DealsService } from './logic/services/deals.service'

export type { CartItem, DealCart } from './logic/repositories/deals.repository'

// 1. Get or Create Cart for Lead
export async function getDealCart(leadId: string) {
    const supabase = await createClient()

    try {
        const service = new DealsService(supabase)
        const cart = await service.getOrCreateDealCart(leadId)
        return { success: true, cart: cart as any } // Cast needed to match prev return types
    } catch (error: any) {
        console.error('getDealCart Error:', error)
        return { success: false, error: error.message }
    }
}

// 2. Add Item to Cart
export async function addToCart(cartId: string, product: any, quantity: number = 1) {
    const supabase = await createClient()

    try {
        const service = new DealsService(supabase)
        await service.addToCart(cartId, product, quantity)
        revalidatePath('/platform/crm')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// 3. Remove Item
export async function removeCartItem(itemId: string) {
    const supabase = await createClient()

    try {
        const service = new DealsService(supabase)
        await service.removeCartItem(itemId)
        revalidatePath('/platform/crm')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// 4. Update Item (Quantity)
export async function updateCartItem(itemId: string, quantity: number) {
    const supabase = await createClient()

    try {
        const service = new DealsService(supabase)
        await service.updateCartItem(itemId, quantity)
        revalidatePath('/platform/crm')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// 5. Search Catalog
export async function searchCatalog(query: string = '', category?: string, page: number = 0, pageSize: number = 10) {
    // Get current organization
    const { getCurrentOrganizationId } = await import('@/modules/core/organizations/actions')
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "Unauthorized", data: [], count: 0, hasMore: false }

    try {
        const supabase = await createClient()
        const service = new DealsService(supabase)
        const result = await service.searchCatalog(orgId, query, category, page, pageSize)
        return { success: true, ...result }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// 6. Send Interactive Quote
export async function sendInteractiveQuote(cartId: string, conversationId: string) {
    try {
        // Must run with Admin permissions to route WhatsApp messages safely and bypass RLS reading connections
        const service = new DealsService(supabaseAdmin)
        await service.sendInteractiveQuote(cartId, conversationId)

        revalidatePath('/inbox')
        revalidatePath('/platform/inbox')
        return { success: true }
    } catch (e: any) {
        console.error("Send Quote Error", e)
        return { success: false, error: e.message || 'Error al enviar cotización' }
    }
}
