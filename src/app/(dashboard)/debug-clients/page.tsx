
import { createClient } from "@/lib/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"

export default async function DebugClientsPage() {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()

    let query = supabase
        .from('clients')
        .select(`
          *,
          portal_token,
          portal_short_token,
          invoices (
            id, total, status, due_date, number, pdf_url, deleted_at,
            billing_cycles (start_date, end_date)
          ),
          quotes (id, number, total, status, pdf_url, deleted_at),
          hosting_accounts (status, renewal_date),
          subscriptions (id, name, next_billing_date, status, amount, service_type, frequency, deleted_at),
          services (id, status, deleted_at)
        `)
    // Removed billing_cycles!billing_cycle_id syntax locally to test if standard resolving works, 
    // or effectively testing the raw query. 
    // Actually, let's use the EXACT query from actions.ts to reproduce the error.

    // EXACT QUERY FROM ACTIONS.TS
    const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          portal_token,
          portal_short_token,
          invoices (id, total, status, due_date, number, pdf_url, deleted_at, billing_cycles:billing_cycles!billing_cycle_id (start_date, end_date)),
          quotes (id, number, total, status, pdf_url, deleted_at),
          hosting_accounts (status, renewal_date),
          subscriptions (id, name, next_billing_date, status, amount, service_type, frequency, deleted_at),
          services (id, status, deleted_at)
        `)
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    return (
        <div className="p-10 font-mono text-sm">
            <h1 className="text-xl font-bold mb-4">Debug Clients Query</h1>

            <div className="mb-4">
                <strong>Org ID:</strong> {orgId}
            </div>

            {error && (
                <div className="bg-red-100 p-4 border border-red-500 mb-4 text-red-900">
                    <h2 className="font-bold">QUERY ERROR:</h2>
                    <pre className="whitespace-pre-wrap">{JSON.stringify(error, null, 2)}</pre>
                </div>
            )}

            <div className="bg-gray-100 p-4 border mb-4">
                <h2 className="font-bold">Data ({data?.length || 0} items):</h2>
                <pre className="max-h-96 overflow-auto">{JSON.stringify(data, null, 2)}</pre>
            </div>
        </div>
    )
}
