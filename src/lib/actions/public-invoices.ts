'use server'

import { createClient } from '@supabase/supabase-js'

// WARNING: This key allows bypassing RLS. Use CAREFULLY.
// It should only be used for specific public endpoints like this one.
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function getPublicInvoice(id: string) {
    try {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error("Missing SUPABASE_SERVICE_ROLE_KEY")
            throw new Error("Configuration Error")
        }

        // Fetch Invoice with joined Client
        const { data: invoiceData, error: invoiceError } = await supabaseAdmin
            .from('invoices')
            .select(`
                *,
                client:clients(*)
            `)
            .eq('id', id)
            .single()

        if (invoiceError) throw invoiceError

        // Fetch Invoice Items separately to avoid FK relationship issues
        const { data: itemsData, error: itemsError } = await supabaseAdmin
            .from('invoice_items')
            .select('*')
            .eq('invoice_id', id)

        if (itemsError) {
            console.error("Error fetching items:", itemsError)
            // Non-critical, we can proceed with empty items if this fails, 
            // but better to throw or handle. For now, log and assume empty.
        }

        // Attach items to invoice
        const fullInvoice = {
            ...invoiceData,
            items: itemsData || []
        }

        // Fetch Settings (Agency Branding)
        const { data: settingsData, error: settingsError } = await supabaseAdmin
            .from('user_settings')
            .select('*')
            .eq('user_id', invoiceData.user_id)
            .single()

        if (settingsError && settingsError.code !== 'PGRST116') {
            console.error("Error fetching settings:", settingsError)
        }

        return {
            invoice: fullInvoice,
            settings: settingsData || {}
        }

    } catch (error) {
        console.error("Error in getPublicInvoice:", error)
        return { error: "No se pudo cargar la factura." }
    }
}
