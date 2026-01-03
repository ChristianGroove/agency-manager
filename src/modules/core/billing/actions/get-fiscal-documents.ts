'use server'

import { supabase } from "@/lib/supabase"
import { DianDocument } from "@/modules/billing/adapters/colombia/entities/DianDocument"
import { Invoice } from "@/types"

export type FiscalDocumentRow = {
    invoice_id: string
    invoice_number: string
    client_name: string
    issued_at: string
    dian_status: string
    cufe: string | null
    track_id: string | null
    xml_url: string | null // Derived or direct link
    total: number
}

export async function getFiscalDocuments(): Promise<FiscalDocumentRow[]> {
    // We want all invoices that have a corresponding DIAN document entry
    // OR invoices that are in a state that implies fiscal relevance (e.g. ISSUED/SENT)
    // For this "Red Zone" tab, we prioritize the dian_documents table as the source of truth.

    // Note: Supabase JS doesn't do deep joins easily without defined relationships in types or views.
    // We will fetch dian_documents and expand invoice data.

    const { data, error } = await supabase
        .from('dian_documents')
        .select(`
            *,
            invoice:invoices (
                id,
                number,
                total,
                date,
                client:clients (
                    name
                )
            )
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching fiscal documents:", error)
        return []
    }

    // Map to friendly UI type
    return data.map((d: any) => ({
        invoice_id: d.invoice_id,
        invoice_number: d.invoice?.number || '??',
        client_name: d.invoice?.client?.name || 'Desconocido',
        issued_at: d.created_at, // The time the DIAN doc was created/attempted
        dian_status: d.dian_status,
        cufe: d.cufe,
        track_id: d.track_id,
        xml_url: d.xml_signed ? '#view-xml' : null,
        total: d.invoice?.total || 0
    }))
}
