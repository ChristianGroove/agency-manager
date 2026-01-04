
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // 1. Security Check
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const results = {
            processed: 0,
            alertsSent: 0,
            errors: [] as string[]
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Define alert thresholds (days before expiration)
        const thresholds = [30, 15, 7, 3];

        // 2. Fetch Active Hosting Accounts with Renewal Dates
        const { data: accounts, error } = await supabaseAdmin
            .from('hosting_accounts')
            .select(`
                *,
                client:clients ( id, name, email ),
                organization:organizations ( id, name )
            `)
            .eq('status', 'active')
            .not('renewal_date', 'is', null);

        if (error) throw error;

        if (accounts && accounts.length > 0) {
            for (const account of accounts) {
                try {
                    const renewalDate = new Date(account.renewal_date);
                    renewalDate.setHours(0, 0, 0, 0);

                    // Calculate days difference
                    const diffTime = renewalDate.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    // Check if today matches any threshold
                    if (thresholds.includes(diffDays)) {
                        results.processed++;

                        // Notify Organization Admins (Internal Alert)
                        await notifyOrganizationAdmins(account.organization_id, {
                            type: 'hosting_renewal_alert',
                            title: `🌐 Hosting Expira en ${diffDays} días`,
                            message: `El hosting ${account.domain_url} (${account.client.name}) vence el ${renewalDate.toLocaleDateString()}. Proveedor: ${account.provider_name}`,
                            client_id: account.client_id,
                            action_url: `/clients/${account.client.id}?tab=hosting`,
                            metadata: {
                                account_id: account.id,
                                days_remaining: diffDays
                            }
                        });

                        results.alertsSent++;
                    } else if (diffDays <= 0 && diffDays > -5) {
                        // Hosting expired recently (grace period alert)
                        await notifyOrganizationAdmins(account.organization_id, {
                            type: 'hosting_expired',
                            title: `🔴 Hosting VENCIDO: ${account.domain_url}`,
                            message: `El hosting de ${account.client.name} venció el ${renewalDate.toLocaleDateString()}. Verificar estado urgente.`,
                            client_id: account.client_id,
                            action_url: `/clients/${account.client.id}?tab=hosting`,
                            metadata: {
                                account_id: account.id,
                                expired: true
                            }
                        });
                        results.alertsSent++;
                    }

                } catch (err: any) {
                    console.error(`Error processing hosting account ${account.id}:`, err);
                    results.errors.push(`Account ${account.id}: ${err.message}`);
                }
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error('Hosting Cron Job Failed:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// --- Helper Functions (Reused from billing cron, ideally moved to a shared lib) ---

async function notifyOrganizationAdmins(organizationId: string, notificationData: any) {
    const { data: members, error } = await supabaseAdmin
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', organizationId)
        .in('role', ['owner', 'admin']);

    if (error || !members) return;

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
