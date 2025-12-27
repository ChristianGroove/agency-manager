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

        // CRITICAL FIX: Fetch settings from CLIENT's organization, not user
        const clientOrgId = invoiceData.client?.organization_id

        if (!clientOrgId) {
            console.warn("Invoice client has no organization_id, using fallback settings")
        }

        // Fetch organization settings for client's org
        const { data: settingsData, error: settingsError } = await supabaseAdmin
            .from('organization_settings')
            .select('*')
            .eq('organization_id', clientOrgId)
            .maybeSingle()

        if (settingsError) {
            console.error("Error fetching organization settings:", settingsError)
        }

        // Fetch document branding for client's org
        const { getDocumentBranding } = await import('@/app/actions/document-branding-actions')
        const brandingSettings = await getDocumentBranding(clientOrgId)

        return {
            invoice: fullInvoice,
            settings: settingsData || {},
            brandingSettings: brandingSettings || undefined
        }

    } catch (error) {
        console.error("Error in getPublicInvoice:", error)
        return { error: "No se pudo cargar la factura." }
    }
}
