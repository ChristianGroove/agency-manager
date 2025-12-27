"use server"

import { createClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"
import { Quote } from "@/types"
import { getCurrentOrganizationId } from "./organizations"

export async function duplicateQuote(originalQuoteId: string) {
    const supabase = await createClient()

    try {
        // 1. Fetch Original
        const { data: original, error: fetchError } = await supabase
            .from('quotes')
            .select('*')
            .eq('id', originalQuoteId)
            .single()

        if (fetchError || !original) throw new Error("Quote not found")

        // 2. Generate New Number
        const { count } = await supabase.from('quotes').select('*', { count: 'exact', head: true })
        const newNumber = `COT-${(count || 0) + 1}`.padStart(6, '0') // Simple logic, can be improved

        // 3. Create Clone
        const { data: newQuote, error: createError } = await supabase
            .from('quotes')
            .insert({
                ...original,
                id: undefined, // Let DB generate new ID
                created_at: undefined,
                organization_id: await getCurrentOrganizationId(), // Ensure it belongs to current org
                number: newNumber,
                status: 'draft', // Reset to draft
                date: new Date().toISOString(), // Today's date
                // Keep client, items, total, etc.
            })
            .select()
            .single()

        if (createError) throw createError

        revalidatePath('/quotes')
        return { success: true, quote: newQuote }
    } catch (error: any) {
        console.error("Duplicate Quote Error:", error)
        return { success: false, error: error.message }
    }
}

export async function updateQuoteStatus(id: string, status: Quote['status']) {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('quotes')
            .update({ status })
            .eq('id', id)

        if (error) throw error

        revalidatePath('/quotes')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
