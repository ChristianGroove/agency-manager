
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/modules/core/database/supabase-admin';
import { isProductionRuntime, requireCronSecret } from '@/app/api/_guards/request-guards';

export const dynamic = 'force-dynamic';

const PUBLIC_HOSTING_CRON_ERROR = 'Hosting renewal cron failed';

function logHostingCronError(label: string, error: unknown) {
    if (!isProductionRuntime()) {
        console.error(label, error);
        return;
    }

    console.error(label, error instanceof Error
        ? { name: error.name }
        : { type: typeof error });
}

function hostingCronErrorMessage(error: unknown) {
    if (isProductionRuntime()) {
        return PUBLIC_HOSTING_CRON_ERROR;
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
        return (error as any).message;
    }

    return PUBLIC_HOSTING_CRON_ERROR;
}

export async function GET(request: Request) {
    const unauthorized = requireCronSecret(request);
    if (unauthorized) return unauthorized;

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
                    logHostingCronError(
                        isProductionRuntime() ? 'Error processing hosting account:' : `Error processing hosting account ${account.id}:`,
                        err
                    );
                    const errorMessage = hostingCronErrorMessage(err);
                    results.errors.push(isProductionRuntime() ? errorMessage : `Account ${account.id}: ${errorMessage}`);
                }
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        logHostingCronError('Hosting Cron Job Failed:', error);
        return NextResponse.json({ success: false, error: hostingCronErrorMessage(error) }, { status: 500 });
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
