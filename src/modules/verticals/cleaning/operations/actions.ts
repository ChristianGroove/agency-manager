'use server'

import { createClient } from "@/lib/supabase-server"
import { Appointment } from "@/types/appointment"
import { startOfDay, endOfDay, formatISO } from "date-fns"

/**
 * Fetch appointments for a specific date range (defaulting to "today" if single date provided)
 * with location data.
 */
export async function getFieldOpsAppointments(orgId: string, date: Date = new Date()) {
    const supabase = await createClient()

    const start = formatISO(startOfDay(date))
    const end = formatISO(endOfDay(date))

    const { data, error } = await supabase
        .from('appointments')
        .select(`
            *,
            staff:staff_profiles!staff_id (
                id,
                color,
                member:organization_members!member_id (
                    full_name
                )
            ),
            client:clients!client_id (
                name
            )
        `)
        .eq('organization_id', orgId)
        .gte('start_time', start)
        .lte('start_time', end)

    if (error) {
        console.error('Error fetching ops appointments:', error)
        return []
    }

    return data as any[] // TODO: cast to proper joined type if needed
}
