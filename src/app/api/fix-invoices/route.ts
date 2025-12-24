
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
    // Initialize admin client to bypass RLS
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        // 1. Get all soft-deleted service IDs
        const { data: services, error: serviceError } = await supabase
            .from('services')
            .select('id')
            .not('deleted_at', 'is', null)

        if (serviceError) throw serviceError

        const serviceIds = services.map(s => s.id)

        if (serviceIds.length === 0) {
            return NextResponse.json({ message: 'No soft-deleted services found.' })
        }

        // 2. Cancel all pending/overdue invoices for these services
        const { data: invoices, error: updateError } = await supabase
            .from('invoices')
            .update({ status: 'cancelled' })
            .in('service_id', serviceIds)
            .in('status', ['pending', 'overdue'])
            .select()

        if (updateError) throw updateError

        return NextResponse.json({
            success: true,
            message: `Cancelled ${invoices.length} invoices.`,
            cancelled_invoices: invoices.map(i => i.id)
        })

    } catch (error) {
        return NextResponse.json({ success: false, error: JSON.stringify(error) }, { status: 500 })
    }
}
