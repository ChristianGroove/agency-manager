
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// SCR (Server-Side Cron) Implementation
// This route is designed to be called by a trusted external scheduler (like Vercel Cron, GitHub Actions, or a simple curl loop)
// It manages:
// 1. Payment Reminders (2 days before)
// 2. Automatic Invoice Generation
// 3. Overdue Invoice Alerts

export async function GET(request: Request) {
    // 1. security check
    const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //     return new NextResponse('Unauthorized', { status: 401 });
    // }

    try {
        const results = {
            remindersSent: 0,
            invoicesGenerated: 0,
            overdueAlerts: 0,
            errors: [] as string[],
            logs: [] as string[]
        };

        const log = (msg: string) => {
            console.log(msg);
            results.logs.push(msg);
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const twoDaysFromNow = new Date(today);
        twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
        twoDaysFromNow.setHours(0, 0, 0, 0);

        // -----------------------------------------------------
        // 1. Fetch All Active Subscriptions (Cross-Tenant)
        // -----------------------------------------------------
        const { data: subscriptions, error: subError } = await supabaseAdmin
            .from('subscriptions')
            .select(`
                *,
                clients ( id, name ),
                organizations ( id, name )
            `)
            .eq('status', 'active')
            .not('next_billing_date', 'is', null);

        if (subError) throw subError;

        if (subscriptions && subscriptions.length > 0) {
            log(`[BillingCron] Found ${subscriptions.length} active subscriptions.`);
            for (const sub of subscriptions) {
                try {
                    const billingDate = new Date(sub.next_billing_date);
                    billingDate.setHours(0, 0, 0, 0);

                    // Client data fallback
                    const client = Array.isArray(sub.clients) ? sub.clients[0] : sub.clients;
                    if (!client) {
                        log(`[BillingCron] Sub ${sub.id} skipped: No client data.`);
                        continue;
                    }

                    log(`[BillingCron] Processing Sub ${sub.id} (${sub.name}) for Client ${client.name}. Next Billing: ${billingDate.toISOString()} vs Today: ${today.toISOString()}`);

                    // A. Payment Reminder (2 Days Before)
                    if (billingDate.getTime() === twoDaysFromNow.getTime()) {
                        log(`[BillingCron] Triggering Reminder for Sub ${sub.id}`);
                        await notifyOrganizationAdmins(sub.organization_id, {
                            type: 'payment_reminder',
                            title: '⏰ Próximo cobro en 2 días',
                            message: `El servicio "${sub.name}" de ${client.name} se cobrará en 2 días. Monto: $${sub.amount.toLocaleString()}`,
                            subscription_id: sub.id,
                            client_id: sub.client_id,
                            action_url: `/clients/${sub.client_id}`
                        });
                        results.remindersSent++;
                    }

                    // B. Invoice Generation (On Due Date or Past Due)
                    // We use <= to catch up if the cron job didn't run on the exact day
                    if (billingDate.getTime() <= today.getTime()) {
                        log(`[BillingCron] Triggering Invoice Generation for Sub ${sub.id}`);
                        const invoiceId = await generateInvoiceSystem(sub, client);
                        if (invoiceId) {
                            log(`[BillingCron] Invoice generated: ${invoiceId}`);
                            results.invoicesGenerated++;
                            await notifyOrganizationAdmins(sub.organization_id, {
                                type: 'invoice_generated',
                                title: '📄 Documento generado',
                                message: `Se generó automáticamente un documento para ${client.name}. Monto: $${sub.amount.toLocaleString()}`,
                                subscription_id: sub.id,
                                client_id: sub.client_id,
                                action_url: `/invoices/${invoiceId}`
                            });
                        } else {
                            log(`[BillingCron] Invoice skipped (likely duplicate in last 24h) for Sub ${sub.id}`);
                        }
                    } else {
                        log(`[BillingCron] Date not reached yet for Sub ${sub.id}`);
                    }
                } catch (err: any) {
                    console.error(`Error processing subscription ${sub.id}:`, err);
                    results.errors.push(`Sub ${sub.id}: ${err.message}`);
                }
            }
        } else {
            log(`[BillingCron] No active subscriptions found.`);
        }

        // -----------------------------------------------------
        // 2. Check Overdue Invoices
        // -----------------------------------------------------
        const { data: overdueInvoices, error: overdueError } = await supabaseAdmin
            .from('invoices')
            .select(`
                *,
                client:clients(id, name)
            `)
            .eq('status', 'pending')
            .lt('due_date', new Date().toISOString());

        if (overdueError) throw overdueError;

        if (overdueInvoices && overdueInvoices.length > 0) {
            for (const invoice of overdueInvoices) {
                // Check if already notified recently (3 days) OR if there is an unread notification
                // This prevents spamming the user if they haven't seen the previous alert
                const { data: existing } = await supabaseAdmin
                    .from('notifications')
                    .select('id, read')
                    .eq('type', 'payment_due')
                    .eq('action_url', `/invoices/${invoice.id}`)
                    .or(`read.eq.false,created_at.gte.${new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()}`) // Unread OR Recent
                    .limit(1)
                    .maybeSingle();

                if (!existing) {
                    await notifyOrganizationAdmins(invoice.organization_id, {
                        type: 'payment_due',
                        title: '⚠️ Documento Vencido',
                        message: `El documento ${invoice.number} de ${invoice.client.name} está vencido.`,
                        client_id: invoice.client_id,
                        action_url: `/invoices/${invoice.id}`
                    });
                    results.overdueAlerts++;
                }
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error('Cron Job Failed:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// --- Helper Functions ---

async function notifyOrganizationAdmins(organizationId: string, notificationData: any) {
    // 1. Find all Admins/Owners of the organization
    // We assume 'organization_members' table links users to orgs with roles
    const { data: members, error } = await supabaseAdmin
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', organizationId)
        .in('role', ['owner', 'admin']);

    if (error || !members) return;

    // 2. Create notifications for each
    const notifications = members.map(member => ({
        organization_id: organizationId,
        user_id: member.user_id,
        read: false,
        ...notificationData
    }));

    if (notifications.length > 0) {
        await supabaseAdmin.from('notifications').insert(notifications);
    }
}

async function generateInvoiceSystem(subscription: any, client: any) {
    // 1. Check existing (Removed to allow multiple subscriptions for same client)
    // const { data: existing } = await supabaseAdmin
    //     .from('invoices')
    //     .select('id')
    //     .eq('client_id', subscription.client_id)
    //     .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    //     .maybeSingle();

    // if (existing) return null;

    // 2. Calculate Dates
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    const invoiceNumber = `INV-${timestamp}-${randomSuffix}`; // Ideally fetch prefix from settings

    const currentBillingDate = new Date(subscription.next_billing_date);
    let nextBillingDate: Date | null = new Date(currentBillingDate);
    let dueDate = new Date(currentBillingDate);

    switch (subscription.frequency) {
        case 'biweekly': nextBillingDate.setDate(nextBillingDate.getDate() + 15); break;
        case 'monthly': nextBillingDate.setMonth(nextBillingDate.getMonth() + 1); break;
        case 'quarterly': nextBillingDate.setMonth(nextBillingDate.getMonth() + 3); break;
        case 'yearly': nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1); break;
        case 'one-time': nextBillingDate = null; dueDate.setDate(dueDate.getDate() + 30); break;
    }

    // 2.5 Find Emitter
    // Prioritize Cristian if available for the org, otherwise any emitter
    let emitterId = null;
    const { data: emitters } = await supabaseAdmin
        .from('emitters')
        .select('id, name, legal_name, business_name')
        .eq('organization_id', subscription.organization_id);

    if (emitters && emitters.length > 0) {
        // Try to find Cristian
        const cristian = emitters.find((e: any) =>
            (e.name && e.name.toLowerCase().includes('cristian')) ||
            (e.legal_name && e.legal_name.toLowerCase().includes('cristian')) ||
            (e.business_name && e.business_name.toLowerCase().includes('cristian'))
        );
        emitterId = cristian ? cristian.id : emitters[0].id;
    }

    // 3. Insert Invoice
    const { data: invoice, error } = await supabaseAdmin
        .from('invoices')
        .insert({
            organization_id: subscription.organization_id, // Critical for multi-tenancy
            client_id: subscription.client_id,
            emitter_id: emitterId, // Explicitly set Emitter
            number: invoiceNumber,
            date: new Date().toISOString(),
            due_date: dueDate.toISOString(),
            items: [{
                description: subscription.name,
                quantity: 1,
                price: subscription.amount
            }],
            total: subscription.amount,
            status: 'pending',
            document_type: 'CUENTA_DE_COBRO' // Default
        })
        .select()
        .single();

    if (error) throw error;

    // 4. Update Subscription
    await supabaseAdmin
        .from('subscriptions')
        .update({
            next_billing_date: nextBillingDate ? nextBillingDate.toISOString() : null,
            invoice_id: invoice.id
        })
        .eq('id', subscription.id);

    // 5. Create Billing Cycle (For Visualization)
    try {
        const { data: service } = await supabaseAdmin
            .from('services')
            .select('id')
            .eq('client_id', subscription.client_id)
            .eq('name', subscription.name) // Heuristic match
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (service) {
            // Calculate Cycle Dates (Arrears/Current assumption)
            const cycleEnd = new Date(currentBillingDate);
            const cycleStart = new Date(cycleEnd);

            switch (subscription.frequency) {
                case 'biweekly': cycleStart.setDate(cycleStart.getDate() - 15); break;
                case 'monthly': cycleStart.setMonth(cycleStart.getMonth() - 1); break;
                case 'quarterly': cycleStart.setMonth(cycleStart.getMonth() - 3); break;
                case 'yearly': cycleStart.setFullYear(cycleStart.getFullYear() - 1); break;
                case 'one-time': cycleStart.setDate(cycleStart.getDate() - 30); break;
                default: cycleStart.setMonth(cycleStart.getMonth() - 1);
            }

            const { data: cycle, error: cycleErr } = await supabaseAdmin
                .from('billing_cycles')
                .insert({
                    service_id: service.id,
                    invoice_id: invoice.id,
                    start_date: cycleStart.toISOString(),
                    end_date: cycleEnd.toISOString(),
                    due_date: dueDate.toISOString(),
                    amount: subscription.amount,
                    status: 'invoiced',
                    metadata: { source: 'cron_automation' }
                })
                .select()
                .single();

            if (!cycleErr && cycle) {
                // Link invoice back to cycle if column exists
                await supabaseAdmin.from('invoices').update({ billing_cycle_id: cycle.id }).eq('id', invoice.id);
            } else if (cycleErr) {
                console.error('Error creating billing cycle:', cycleErr);
            }

            // 6. Sync Service Next Billing Date (Crucial for UI)
            if (nextBillingDate) {
                await supabaseAdmin
                    .from('services')
                    .update({ next_billing_date: nextBillingDate.toISOString() })
                    .eq('id', service.id);
            }
        }
    } catch (err) {
        console.error('Error in cycle creation logic:', err);
    }

    return invoice.id;
}
