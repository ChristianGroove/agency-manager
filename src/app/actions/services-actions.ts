'use server'

import { supabaseAdmin } from "@/lib/supabase-admin"
import { Service } from "@/types"

export async function toggleServiceStatus(
    serviceId: string,
    newStatus: 'active' | 'paused',
    resumeOptions?: {
        newFrequency?: string
        newNextBillingDate?: string // ISO string or null
    }
) {
    try {
        // 1. Get Service Info for Log
        const { data: service, error: fetchError } = await supabaseAdmin
            .from('services')
            .select('*, client:clients(id, name)')
            .eq('id', serviceId)
            .single()

        if (fetchError || !service) throw new Error('Service not found')

        // 2. Prepare Update Data
        const updateData: any = { status: newStatus }

        if (newStatus === 'active' && resumeOptions) {
            if (resumeOptions.newFrequency) {
                updateData.frequency = resumeOptions.newFrequency
            }
            if (resumeOptions.newNextBillingDate) {
                updateData.next_billing_date = resumeOptions.newNextBillingDate
            }
        }

        // 3. Update Service
        const { error: updateError } = await supabaseAdmin
            .from('services')
            .update(updateData)
            .eq('id', serviceId)

        if (updateError) throw updateError

        // 4. Create Client Event (Log)
        const eventTitle = newStatus === 'active' ? 'Servicio Reanudado' : 'Servicio Pausado'
        const eventIcon = newStatus === 'active' ? 'PlayCircle' : 'PauseCircle'
        const description = newStatus === 'active'
            ? `Se ha reanudado el servicio: ${service.name}. ${resumeOptions?.newNextBillingDate ? 'Ciclo de facturación actualizado.' : ''}`
            : `Se ha pausado el servicio: ${service.name}. Facturación detenida.`

        await supabaseAdmin.from('client_events').insert({
            client_id: service.client_id,
            type: 'system',
            title: eventTitle,
            description: description,
            metadata: {
                service_id: serviceId,
                previous_status: service.status,
                new_status: newStatus
            },
            icon: eventIcon
        })

        return { success: true }
    } catch (error) {
        console.error('toggleServiceStatus Error:', error)
        return { success: false, error: 'Error toggling service status' }
    }
}
