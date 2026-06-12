"use server"

import { createClient } from '@/modules/core/database/supabase-server'
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { revalidatePath } from 'next/cache'
import { DealService as DealsService } from '../deal-service'
export type { CartItem, DealCart } from '../../types'

const PUBLIC_DEAL_ERROR = "No se pudo completar la accion de deals CRM"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizeDealError(error: unknown) {
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

function dealActionFailure(label: string, error: unknown): { success: false; error: string } {
    if (isDeployedRuntime()) {
        console.error(label, summarizeDealError(error))
        return { success: false, error: PUBLIC_DEAL_ERROR }
    }

    console.error(label, error)
    if (error instanceof Error) return { success: false, error: error.message }
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        return { success: false, error: error.message }
    }
    return { success: false, error: PUBLIC_DEAL_ERROR }
}

// 1. Get or Create Cart for Lead
export async function getDealCart(leadId: string) {
    const supabase = await createClient()

    try {
        const service = new DealsService(supabase)
        const cart = await service.getOrCreateDealCart(leadId)
        return { success: true as const, cart: cart as any } // Cast needed to match prev return types
    } catch (error: any) {
        return dealActionFailure('getDealCart Error:', error)
    }
}

// 2. Add Item to Cart
export async function addToCart(cartId: string, product: any, quantity: number = 1) {
    const supabase = await createClient()

    try {
        const service = new DealsService(supabase)
        await service.addToCart(cartId, product, quantity)
        revalidatePath('/platform/crm')
        return { success: true as const }
    } catch (error: any) {
        return dealActionFailure('addToCart Error:', error)
    }
}

// 3. Remove Item
export async function removeCartItem(itemId: string) {
    const supabase = await createClient()

    try {
        const service = new DealsService(supabase)
        await service.removeCartItem(itemId)
        revalidatePath('/platform/crm')
        return { success: true as const }
    } catch (error: any) {
        return dealActionFailure('removeCartItem Error:', error)
    }
}

// 4. Update Item (Quantity)
export async function updateCartItem(itemId: string, quantity: number) {
    const supabase = await createClient()

    try {
        const service = new DealsService(supabase)
        await service.updateCartItem(itemId, quantity)
        revalidatePath('/platform/crm')
        return { success: true as const }
    } catch (error: any) {
        return dealActionFailure('updateCartItem Error:', error)
    }
}

// 5. Search Catalog
export async function searchCatalog(query: string = '', category?: string, page: number = 0, pageSize: number = 10) {
    // Get current organization
    const { getCurrentOrganizationId } = await import('@/modules/core/organizations/organization-actions')
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return { success: false, error: "Unauthorized", data: [], count: 0, hasMore: false }

    try {
        const supabase = await createClient()
        const service = new DealsService(supabase)
        const result = await service.searchCatalog(orgId, query, category, page, pageSize)
        return { success: true as const, ...result }
    } catch (error: any) {
        return dealActionFailure('searchCatalog Error:', error)
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
        return { success: true as const }
    } catch (e: any) {
        return dealActionFailure("Send Quote Error", e)
    }
}

