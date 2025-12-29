
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
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const results = {
            remindersSent: 0,
            invoicesGenerated: 0,
            overdueAlerts: 0,
            errors: [] as string[]
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
            for (const sub of subscriptions) {
                try {
                    const billingDate = new Date(sub.next_billing_date);
                    billingDate.setHours(0, 0, 0, 0);

                    // Client data fallback
                    const client = Array.isArray(sub.clients) ? sub.clients[0] : sub.clients;
                    if (!client) continue;

                    // A. Payment Reminder (2 Days Before)
                    if (billingDate.getTime() === twoDaysFromNow.getTime()) {
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

                    // B. Invoice Generation (On Due Date)
                    if (billingDate.getTime() === today.getTime()) {
                        const invoiceId = await generateInvoiceSystem(sub, client);
                        if (invoiceId) {
                            results.invoicesGenerated++;
                            await notifyOrganizationAdmins(sub.organization_id, {
                                type: 'invoice_generated',
                                title: '📄 Documento generado',
                                message: `Se generó automáticamente un documento para ${client.name}. Monto: $${sub.amount.toLocaleString()}`,
                                subscription_id: sub.id,
                                client_id: sub.client_id,
                                action_url: `/invoices/${invoiceId}`
                            });
                        }
                    }
                } catch (err: any) {
                    console.error(`Error processing subscription ${sub.id}:`, err);
                    results.errors.push(`Sub ${sub.id}: ${err.message}`);
                }
            }
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
    // 1. Check existing
    const { data: existing } = await supabaseAdmin
        .from('invoices')
        .select('id')
        .eq('client_id', subscription.client_id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

    if (existing) return null;

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

    // 3. Insert Invoice
    const { data: invoice, error } = await supabaseAdmin
        .from('invoices')
        .insert({
            organization_id: subscription.organization_id, // Critical for multi-tenancy
            client_id: subscription.client_id,
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

    return invoice.id;
}
