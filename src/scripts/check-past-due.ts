
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

async function checkPastDueInvoices() {
    console.log('[Job] Checking past due invoices...')
    const now = new Date().toISOString()
    const today = now.split('T')[0]

    // 1. Find unpaid invoices with due_date < today
    // And that are NOT already flagged or processed? We don't want to spam transitions.
    // We check if the associated process is ALREADY in 'payment_issue' to avoid double toggle.

    const { data: invoices, error } = await supabaseAdmin
        .from('invoices')
        .select('id, number, due_date, total, status, client_id, organization_id')
        .eq('status', 'sent') // Sent but not paid
        .lt('due_date', today)

    if (error) {
        console.error('Error fetching invoices:', error)
        return
    }

    console.log(`Found ${invoices?.length || 0} overdue invoices.`)

    if (!invoices || invoices.length === 0) return

    // Dynamic Import Engine
    const { ProcessEngine } = await import('../modules/core/crm/process-engine/engine')

    for (const inv of invoices) {
        if (!inv.client_id) continue

        // Check active process
        try {
            // How to mock Org Context? ProcessEngine uses getCurrentOrganizationId() which uses headers().
            // This script runs outside Next.js request context.
            // ProcessEngine needs to be refactored or we need to Mock it.
            // OR we use a lower-level functioning method that accepts orgId.
            // `ProcessEngine.transition` uses `createClient` (user) or `supabaseAdmin`. 
            // It reads `instance.organization_id` from the instance itself, so it might be safe for transition.
            // BUT `getActiveProcess` calls `getCurrentOrganizationId`.

            // WE NEED TO FIX `getActiveProcess` to accept orgId override or fetch ignoring orgId filter if needed (but we have client_id/lead_id).

            // Let's modify ProcessEngine.getActiveProcess to be robust or query instances directly here since we have admin.

            const { data: instance } = await supabaseAdmin
                .from('process_instances')
                .select('*')
                .eq('lead_id', inv.client_id)
                .eq('status', 'active')
                .single()

            if (instance && instance.current_state !== 'payment_issue') {
                console.log(`Processing Overdue Invoice ${inv.number} for Lead ${inv.client_id}`)

                // Transition
                const result = await ProcessEngine.transition(
                    instance.id,
                    'payment_issue',
                    'system_job',
                    `Invoice #${inv.number} Past Due (${inv.due_date})`
                )

                if (result.success) {
                    console.log(`-> Transitioned process ${instance.id} to 'payment_issue'`)

                    // Create Notification
                    await supabaseAdmin.from('notifications').insert({
                        organization_id: inv.organization_id,
                        user_id: instance.lead_id, // Again, lead_id as placeholder or notify admin
                        type: 'payment_alert',
                        title: '⚠️ Factura Vencida',
                        message: `La factura #${inv.number} ha vencido sin pago. Proceso movido a Riesgo.`,
                        read: false
                    })
                } else {
                    console.log(`-> Failed transition: ${result.error}`)
                }
            }

        } catch (e) {
            console.error(`Error processing invoice ${inv.number}:`, e)
        }
    }
}

checkPastDueInvoices()
