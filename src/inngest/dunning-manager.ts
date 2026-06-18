import { inngest } from "@/modules/infrastructure/automation/inngest/client";
import { EmailService } from "@/modules/features/notifications/email.service";
import { supabaseAdmin } from "@/modules/core/database/supabase-admin";

/**
 * Platform Dunning Manager
 * Runs daily to process pending manual invoices and handle reminders/suspensions.
 */
export const platformDunningManager = inngest.createFunction(
    { id: "platform-dunning-manager", name: "SaaS Platform Dunning" },
    { cron: "0 6 * * *" }, // Run daily at 6 AM
    async ({ step }) => {
        // 1. Fetch pending invoices
        const pendingInvoices = await step.run("fetch-pending-invoices", async () => {
            const { data, error } = await supabaseAdmin
                .from('saas_platform_invoices')
                .select(`
                    *,
                    organization:organizations(name)
                `)
                .eq('status', 'PENDING')
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data || [];
        });

        const results = { reminders: 0, suspensions: 0, errors: 0 };

        for (const invoice of pendingInvoices) {
            const createdAt = new Date(invoice.created_at);
            const now = new Date();
            const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
            const billingEnd = new Date(invoice.billing_period_end);

            await step.run(`process-invoice-${invoice.id}`, async () => {
                try {
                    // CASE 1: Suspensions (T+10 or past period end)
                    if (daysSinceCreation >= 10 || now > billingEnd) {
                        // Check if the organization has an active bypass
                        const { data: subData } = await supabaseAdmin
                            .from('saas_subscriptions')
                            .select('bypass_until')
                            .eq('organization_id', invoice.organization_id)
                            .single();

                        if (subData?.bypass_until && new Date(subData.bypass_until) > new Date()) {
                            // Bypass is active, skip suspension
                            return;
                        }

                        // Suspend subscription and organization
                        await Promise.all([
                            supabaseAdmin
                                .from('saas_subscriptions')
                                .update({ 
                                    status: 'suspended',
                                    updated_at: new Date().toISOString() 
                                })
                                .eq('organization_id', invoice.organization_id),
                            supabaseAdmin
                                .from('organizations')
                                .update({ 
                                    status: 'suspended',
                                    updated_at: new Date().toISOString() 
                                })
                                .eq('id', invoice.organization_id)
                        ]);

                        results.suspensions++;
                        const targetEmail = invoice.recipient_email || "";

                        // Notify client
                        await EmailService.send({
                            to: targetEmail,
                                subject: "AVISO CRÍTICO: Servicio Suspendido - Pixy Spaces",
                                organizationId: invoice.organization_id, // Mandatory field
                                html: `
                                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #fee2e2; border-radius: 8px; padding: 30px;">
                                        <h2 style="color: #991b1b; margin-top: 0;">Servicio Suspendido</h2>
                                        <p>Hola <strong>${invoice.organization.name}</strong>,</p>
                                        <p>Debido a que la cuenta de cobro <strong>${invoice.invoice_number}</strong> se encuentra pendiente de pago fuera de término, tu acceso a Pixy Spaces ha sido suspendido.</p>
                                        <div style="background-color: #fef2f2; padding: 15px; border-radius: 6px; margin: 20px 0;">
                                            <p style="margin: 0; font-weight: bold;">Monto Pendiente: ${invoice.amount_total} ${invoice.currency}</p>
                                        </div>
                                        <p>Para reactivar tu servicio de inmediato, por favor realiza el pago pendiente.</p>
                                        <a href="https://mi.pixy.com.co/portal" style="background-color: #EC4899; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: bold;">Pagar ahora para reactivar</a>
                                    </div>
                                `
                    });
                    } 
                    // CASE 2: Critical Reminder (T+7)
                    else if (daysSinceCreation === 7) {
                        const targetEmail = invoice.recipient_email || "";

                        results.reminders++;
                        await EmailService.send({
                            to: targetEmail,
                            subject: "URGENTE: Tu cuenta de cobro vence pronto",
                            organizationId: invoice.organization_id,
                            html: `<p>Hola ${invoice.organization.name}, recordamos que la factura ${invoice.invoice_number} está pendiente. Evita la suspensión de tu servicio pagando hoy mismo.</p>`
                        });
                    }
                    // CASE 3: Friendly Reminder (T+3)
                    else if (daysSinceCreation === 3) {
                        const targetEmail = invoice.recipient_email || "";

                        results.reminders++;
                        await EmailService.send({
                            to: targetEmail,
                            subject: "Recordatorio Amistoso: Cuenta de Cobro Pixy Spaces",
                            organizationId: invoice.organization_id,
                            html: `<p>Hola ${invoice.organization.name}, esperamos que todo vaya bien. Solo queríamos recordarte que tienes una cuenta de cobro pendiente (${invoice.invoice_number}).</p>`
                        });
                    }
                } catch (e) {
                    results.errors++;
                    console.error(`Error processing dunning for invoice ${invoice.id}:`, e);
                }
            });
        }

        return results;
    }
);
