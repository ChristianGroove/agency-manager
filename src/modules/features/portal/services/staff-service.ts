'use server'

import { supabaseAdmin } from "@/lib/supabase-admin"

/**
 * Worker/Staff Portal Actions
 */
export async function startJob(token: string, jobId: string, location?: { lat: number, lng: number }) {
    try {
        const { data: staff, error: staffError } = await supabaseAdmin
            .from('cleaning_staff_profiles')
            .select('*')
            .eq('access_token', token)
            .is('deleted_at', null)
            .single()

        if (staffError || !staff) throw new Error('Unauthorized')

        const { data: job, error: jobError } = await supabaseAdmin
            .from('appointments')
            .select('id, start_time')
            .eq('id', jobId)
            .eq('staff_id', staff.id)
            .single()

        if (jobError || !job) throw new Error('Job not found or not assigned to you')

        const { error: updateError } = await supabaseAdmin
            .from('appointments')
            .update({
                status: 'in_progress',
                gps_coordinates: location ? location : undefined
            })
            .eq('id', jobId)

        if (updateError) throw updateError
        return { success: true }
    } catch (error) {
        console.error('startJob Error:', error)
        return { success: false, error: 'Error starting job' }
    }
}

export async function completeJob(token: string, jobId: string) {
    try {
        const { data: staff, error: staffError } = await supabaseAdmin
            .from('cleaning_staff_profiles')
            .select('*')
            .eq('access_token', token)
            .is('deleted_at', null)
            .single()

        if (staffError || !staff) throw new Error('Unauthorized')

        const { data: job, error: jobError } = await supabaseAdmin
            .from('appointments')
            .select('id')
            .eq('id', jobId)
            .eq('staff_id', staff.id)
            .single()

        if (jobError || !job) throw new Error('Job not found or not assigned to you')

        const { error: updateError } = await supabaseAdmin
            .from('appointments')
            .update({ status: 'completed' })
            .eq('id', jobId)

        if (updateError) throw updateError
        return { success: true }
    } catch (error) {
        console.error('completeJob Error:', error)
        return { success: false, error: 'Error completing job' }
    }
}
