/**
 * Coexistence Monitor (Meta 14-Day Rule)
 * 
 * Monitors the "Last Echo" timestamp for each WABA.
 * If a WABA hasn't sent an echo (mobile app usage) in 12 days, 
 * it sends an alert to the admin to prevent disconnection.
 */

import { supabaseAdmin } from "@/modules/core/database/supabase-admin"

export class CoexistenceMonitor {
    private readonly WARNING_THRESHOLD_DAYS = 12;
    private readonly DISCONNECT_THRESHOLD_DAYS = 14;

    /**
     * Run the monitor check
     * Should be called by a cron job (e.g., daily)
     */
    async runCheck(): Promise<{
        checked: number;
        warnings: number;
        errors: string[];
    }> {
        console.log('[CoexistenceMonitor] Starting check...');
        const errors: string[] = [];
        let checked = 0;
        let warnings = 0;

        try {
            // 1. Get all WABAs with their last_echo_at timestamp
            // Assuming we store this in integration_connections metadata or a separate table
            // For now, let's query integration_connections
            const { data: connections, error } = await supabaseAdmin
                .from('integration_connections')
                .select('id, organization_id, metadata, connection_name')
                .eq('provider_key', 'meta_whatsapp')
                .eq('status', 'active');

            if (error) throw error;

            checked = connections.length;

            for (const conn of connections) {
                const metadata = conn.metadata || {};
                const lastEcho = metadata.last_echo_at ? new Date(metadata.last_echo_at) : null;
                const wabaId = metadata.waba_id || metadata.phone_number_id;

                if (!lastEcho) {
                    console.log(`[CoexistenceMonitor] WABA ${wabaId} has no echo history. Skipping.`);
                    continue;
                }

                // Calculate days since last echo
                const now = new Date();
                const diffTime = Math.abs(now.getTime() - lastEcho.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                console.log(`[CoexistenceMonitor] WABA ${wabaId}: ${diffDays} days since last echo`);

                if (diffDays >= this.WARNING_THRESHOLD_DAYS) {
                    warnings++;
                    await this.sendAlert(conn.organization_id, wabaId, conn.connection_name, diffDays);
                }
            }

            console.log(`[CoexistenceMonitor] Check complete. Checked: ${checked}, Warnings: ${warnings}`);
            return { checked, warnings, errors };

        } catch (error: any) {
            console.error('[CoexistenceMonitor] critical error:', error);
            return { checked, warnings, errors: [error.message] };
        }
    }

    /**
     * Send alert to admin/user
     */
    private async sendAlert(orgId: string, wabaId: string, name: string, days: number): Promise<void> {
        console.warn(`[CoexistenceMonitor] 🚨 ALERT: WABA ${name} (${wabaId}) inactive for ${days} days!`);

        // MVP: Log to DB or Send Email (using existing notification infrastructure)
        // For this audit, we'll log a security alert to the database

        await supabaseAdmin.from('security_alerts').insert({
            organization_id: orgId,
            severity: 'high',
            title: 'Riesgo de Desconexión WhatsApp (Regla 14 días)',
            description: `La línea WhatsApp "${name}" no ha registrado actividad desde la App Móvil en ${days} días. Meta desconectará la API en ${14 - days} días si no se abre la App oficial.`,
            status: 'open',
            metadata: {
                waba_id: wabaId,
                days_inactive: days,
                deadline: new Date(Date.now() + (14 - days) * 24 * 60 * 60 * 1000).toISOString()
            }
        });
    }

    /**
     * Record an Echo event (keepalive)
     * Called by MetaProvider when an echo message is received
     */
    async recordEcho(wabaId: string): Promise<void> {
        try {
            // Find connection by WABA ID (search in metadata)
            // This relies on metadata->>'waba_id' or 'phone_number_id'
            const { data: search } = await supabaseAdmin
                .from('integration_connections')
                .select('id, metadata')
                .or(`metadata->>waba_id.eq.${wabaId},metadata->>phone_number_id.eq.${wabaId}`)
                .limit(1)
                .single();

            if (search) {
                const newMeta = {
                    ...search.metadata,
                    last_echo_at: new Date().toISOString()
                };

                await supabaseAdmin
                    .from('integration_connections')
                    .update({ metadata: newMeta })
                    .eq('id', search.id);

                console.log(`[CoexistenceMonitor] Echo recorded for ${wabaId}`);
            }
        } catch (e) {
            console.error('[CoexistenceMonitor] Failed to record echo:', e);
        }
    }
}

export const coexistenceMonitor = new CoexistenceMonitor();
