'use server'

import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"

/**
 * Update job status from portal (worker app)
 * Uses admin client to bypass RLS since portal users don't have auth session
 */
export async function updateJobStatusFromPortal(
    jobId: string,
    status: 'in_progress' | 'completed'
) {
    try {
        const { error } = await supabaseAdmin
            .from('appointments')
            .update({ status })
            .eq('id', jobId)

        if (error) throw error

        revalidatePath('/portal')
        return { success: true }
    } catch (error: any) {
        console.error('Error updating job status:', error)
        return { success: false, error: error.message }
    }
}
