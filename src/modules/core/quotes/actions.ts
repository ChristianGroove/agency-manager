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
 * Get all quotes for current organization
 */
export async function getQuotes() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    if (!orgId) return []

    const { data, error } = await supabase
        .from('quotes')
        .select('*, client:clients(*), emitter:emitters(*)')
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
