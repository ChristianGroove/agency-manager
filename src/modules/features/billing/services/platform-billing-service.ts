import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { isSuperAdmin, requireSuperAdmin } from "@/modules/core/iam/services/platform-roles"
import { generatePlatformInvoicePDF } from "@/modules/infrastructure/pdf/services/platform-pdf-generator"
import { EmailService } from "@/modules/features/notifications/email.service"
import { sanitizePaymentMethodsForClient } from "@/modules/core/settings/payment-methods-sanitizer"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import crypto from "crypto"

const PUBLIC_PLATFORM_INVOICE_CREATE_ERROR = "No se pudo crear la factura de plataforma"
const PUBLIC_PLATFORM_INVOICE_EMAIL_ERROR = "No se pudo enviar la factura de plataforma"
const PUBLIC_SUBSCRIPTION_ACTIVATION_ERROR = "No se pudo activar la suscripcion"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizePlatformBillingError(error: unknown) {
    if (error instanceof Error) return { name: error.name }

    if (error && typeof error === 'object') {
        return {
            code: (error as any).code,
            status: (error as any).status,
            statusCode: (error as any).statusCode,
            hasMessage: typeof (error as any).message === 'string' && (error as any).message.length > 0,
        }
    }

    return { type: typeof error }
}

function logPlatformBillingError(label: string, error: unknown) {
    if (!isDeployedRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, summarizePlatformBillingError(error))
}

function platformBillingErrorMessage(error: unknown, publicMessage: string) {
    if (isDeployedRuntime()) return publicMessage
    if (error instanceof Error) return error.message
    if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
        return error.message
    }
    if (typeof error === 'string' && error) return error
    return publicMessage
}

/**
 * PlatformBillingService handles management-level billing operations
 * for the SaaS platform itself (e.g. charging tenants).
 * Extracted from platform-invoicing-actions.ts
 */
export class PlatformBillingService {
    
    static async createManualPlatformInvoice(data: {
        organizationId: string,
        amount: number,
        currency?: string,
        billingPeriodStart: string,
        billingPeriodEnd: string,
        notes?: string,
        clientTaxId?: string,
        clientAddress?: string,
        clientLegalName?: string,
        includeTax?: boolean,
        taxRate?: number,
        taxAmount?: number,
        amountSubtotal?: number,
        recipientEmail?: string
    }) {
        const supabase = supabaseAdmin

        // 1. Security Check: Only SuperAdmins
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: "No autorizado" }

        const isAdmin = await isSuperAdmin(user.id)
        if (!isAdmin) {
            return { success: false, error: "Solo los Super Administradores pueden generar facturas de plataforma" }
        }

        // 1.5. Upsert Billing Profile for persistence (Safe)
        if (data.clientTaxId || data.clientAddress || data.clientLegalName) {
            try {
                await supabaseAdmin
                    .from('organization_billing_profiles')
                    .upsert({
                        organization_id: data.organizationId,
                        tax_id: data.clientTaxId,
                        address: data.clientAddress,
                        legal_name: data.clientLegalName,
                        updated_at: new Date().toISOString()
                    });
            } catch (e) {
                logPlatformBillingError("Warning: Profile upsert failed (continuing invoice creation):", e);
            }
        }

        // 2. Insert into saas_platform_invoices
        const { data: invoice, error } = await supabaseAdmin
            .from('saas_platform_invoices')
            .insert({
                organization_id: data.organizationId,
                amount_total: data.amount,
                currency: data.currency || 'USD',
                status: 'PENDING',
                billing_period_start: data.billingPeriodStart,
                billing_period_end: data.billingPeriodEnd,
                notes: data.notes || '',
                client_tax_id: data.clientTaxId || '',
                client_address: data.clientAddress || '',
                client_legal_name: data.clientLegalName || '',
                include_tax: data.includeTax || false,
                tax_rate: data.taxRate || 19.0,
                tax_amount: data.taxAmount || 0,
                amount_subtotal: data.amountSubtotal || data.amount,
                recipient_email: data.recipientEmail || ''
            })
            .select(`
                *,
                organization:organizations(name)
            `)
            .single()

        if (error) {
            logPlatformBillingError("Full error creating platform invoice:", error)
            return { success: false, error: platformBillingErrorMessage(error, PUBLIC_PLATFORM_INVOICE_CREATE_ERROR) }
        }

        return { 
            success: true, 
            invoice: JSON.parse(JSON.stringify(invoice)) 
        }
    }

    static async sendPlatformInvoiceEmail(invoiceId: string, recipientEmail: string) {
        await requireSuperAdmin();
        const supabase = supabaseAdmin

        // 1. Fetch Invoice
        const { data: invoice, error } = await supabaseAdmin
            .from('saas_platform_invoices')
            .select(`
                *,
                organization:organizations(name)
            `)
            .eq('id', invoiceId)
            .single()

        if (error || !invoice) {
            throw new Error("Factura no encontrada")
        }

        const targetEmail = recipientEmail || invoice.recipient_email;
        if (!targetEmail) {
            return { success: false, error: "No se encontró un destinatario válido" }
        }

        if (!process.env.RESEND_API_KEY) {
            console.error("[PlatformBilling] RESEND_API_KEY missing");
            return { success: false, error: "Configuración de correo faltante" }
        }

        // 3. Fetch Platform Payment Methods
        const { data: platformOrg } = await supabaseAdmin
            .from('organizations')
            .select('id')
            .eq('organization_type', 'platform')
            .single();
        
        let paymentMethodsHtml = '';
        let pdfPaymentMethods = [];

        if (platformOrg) {
            const { data: methods } = await supabaseAdmin
                .from('organization_payment_methods')
                .select('*')
                .eq('organization_id', platformOrg.id)
                .eq('is_active', true)
                .order('display_order', { ascending: true });
            
            const safeMethods = sanitizePaymentMethodsForClient(methods || []);
            if (safeMethods.length > 0) {
                pdfPaymentMethods = safeMethods;
                paymentMethodsHtml = `
                    <div style="margin-top: 30px; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #fcfcfd;">
                        <h3 style="margin-top: 0; color: #0F172A; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 15px;">Instrucciones de Pago Manual</h3>
                        <div style="space-y: 12px;">
                            ${safeMethods.map(m => `
                                <div style="margin-bottom: 15px;">
                                    <div style="font-weight: bold; color: #0F172A; font-size: 14px; margin-bottom: 4px;">${m.title}</div>
                                    <div style="color: #475569; font-size: 13px;">${m.instructions || ''}</div>
                                    ${m.details?.account_number ? `
                                        <div style="background-color: #f1f5f9; padding: 8px 12px; border-radius: 6px; font-family: monospace; font-size: 15px; color: #0F172A; margin-top: 5px; display: inline-block; border: 1px solid #e2e8f0;">
                                            ${m.details.account_number}
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                        <p style="margin-top: 15px; font-size: 11px; color: #94a3b8; font-style: italic;">* Favor enviar el comprobante de pago una vez realizada la transferencia.</p>
                    </div>
                `;
            }
        }

        // 4. Generate PDF
        const pdfBlob = await generatePlatformInvoicePDF({
            invoice_number: invoice.invoice_number,
            organization_name: invoice.organization.name,
            amount: invoice.amount_total,
            currency: invoice.currency,
            billing_period: `${format(new Date(invoice.billing_period_start), 'MMM yyyy', { locale: es })}`,
            issue_date: new Date(invoice.created_at),
            client_tax_id: invoice.client_tax_id,
            client_address: invoice.client_address,
            client_legal_name: invoice.client_legal_name,
            include_tax: invoice.include_tax,
            tax_rate: invoice.tax_rate,
            tax_amount: invoice.tax_amount,
            amount_subtotal: invoice.amount_subtotal,
            payment_methods: pdfPaymentMethods
        })

        const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer())

        const formattedTotal = new Intl.NumberFormat('es-CO', { 
            style: 'currency', 
            currency: invoice.currency, 
            minimumFractionDigits: 0 
        }).format(invoice.amount_total);

        // 4.5. Generate Wompi Link
        let wompiLink = '';
        const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
        const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;

        if (publicKey && integritySecret) {
            const reference = `PIXY-PAY-${invoice.id.slice(0, 8)}-${Date.now()}`;
            const amountInCents = Math.round(invoice.amount_total * 100);
            const currency = invoice.currency || 'USD';
            
            const signatureRaw = `${reference}${amountInCents}${currency}${integritySecret}`;
            const signature = crypto.createHash('sha256').update(signatureRaw).digest('hex');
            
            await supabaseAdmin.from('payment_transactions').insert({
                organization_id: invoice.organization_id,
                reference,
                amount_in_cents: amountInCents,
                currency,
                status: 'PENDING',
                metadata: {
                    type: 'subscription_payment',
                    platform_invoice: true,
                    invoice_id: invoice.id,
                    concept: `Pago Documento ${invoice.invoice_number}`
                }
            });

            const redirectUrl = `https://mi.pixy.com.co/portal?status=success`;
            wompiLink = `https://checkout.wompi.co/p/?public-key=${publicKey}&currency=${currency}&amount-in-cents=${amountInCents}&reference=${reference}&signature:integrity=${signature}&redirect-url=${encodeURIComponent(redirectUrl)}`;
        }

        // 5. Send Email
        const result = await EmailService.send({
            to: targetEmail,
            subject: `Cuenta de Cobro ${invoice.invoice_number} - Pixy Spaces`,
            html: `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: white;">
                    <div style="background-color: #ffffff; padding: 40px 30px; text-align: center; border-bottom: 1px solid #f1f5f9;">
                        <img src="https://app.pixy.com.co/pixy-logo-black.png" alt="Pixy Spaces" style="max-width: 160px; height: auto;" />
                    </div>
                    <div style="padding: 40px; background-color: white;">
                        <h2 style="color: #1e293b; margin-top: 0;">Hola, ${invoice.organization.name}</h2>
                        <p style="color: #475569; line-height: 1.6;">Esperamos que todo vaya bien. Se ha generado una nueva <strong>Cuenta de Cobro</strong> por los servicios de licenciamiento de Pixy Spaces.</p>
                        
                        <div style="background-color: #f8fafc; border-radius: 6px; padding: 20px; margin: 30px 0; border: 1px solid #edf2f7;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding-bottom: 8px; color: #64748b; font-size: 11px; text-transform: uppercase;">Documento No.</td>
                                    <td style="padding-bottom: 8px; text-align: right; color: #1e293b; font-size: 14px; font-weight: bold;">${invoice.invoice_number}</td>
                                </tr>
                                ${invoice.include_tax ? `
                                    <tr>
                                        <td style="padding-top: 4px; color: #64748b; font-size: 13px;">Subtotal</td>
                                        <td style="padding-top: 4px; text-align: right; color: #1e293b; font-size: 14px;">${new Intl.NumberFormat('es-CO', { style: 'currency', currency: invoice.currency, minimumFractionDigits: 0 }).format(invoice.amount_subtotal)}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding-top: 4px; color: #64748b; font-size: 13px;">IVA (${invoice.tax_rate}%)</td>
                                        <td style="padding-top: 4px; text-align: right; color: #1e293b; font-size: 14px;">${new Intl.NumberFormat('es-CO', { style: 'currency', currency: invoice.currency, minimumFractionDigits: 0 }).format(invoice.tax_amount)}</td>
                                    </tr>
                                    <tr><td colspan="2" style="padding: 10px 0;"><div style="border-top: 1px dashed #e2e8f0;"></div></td></tr>
                                ` : ''}
                                <tr>
                                    <td style="color: #64748b; font-size: 14px;">Total a Pagar</td>
                                    <td style="text-align: right; color: #EC4899; font-size: 20px; font-weight: bold;">${formattedTotal}</td>
                                </tr>
                            </table>
                        </div>

                        ${wompiLink ? `
                        <div style="margin: 35px 0; text-align: center;">
                            <a href="${wompiLink}" style="background-color: #EC4899; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(236, 72, 153, 0.2);">
                                Pagar en línea con Wompi
                            </a>
                        </div>
                        ` : ''}

                        ${paymentMethodsHtml}
                    </div>
                </div>
            `,
            attachments: [
                {
                    filename: `${invoice.invoice_number}.pdf`,
                    content: pdfBuffer
                }
            ],
            organizationId: invoice.organization_id
        })

        if (!result.success) {
            logPlatformBillingError("[PlatformBilling] Email send failed:", result.error)
            return { success: false, error: platformBillingErrorMessage(result.error, PUBLIC_PLATFORM_INVOICE_EMAIL_ERROR) }
        }

        return { success: true }
    }

    static async getPlatformInvoices(page: number = 1, pageSize: number = 50) {
        await requireSuperAdmin();
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        
        const { data, error, count } = await supabaseAdmin
            .from('saas_platform_invoices')
            .select(`
                *,
                organization:organizations(name),
                payment_transaction:payment_transactions(*)
            `, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            console.error('Error fetching platform invoices:', error);
            return { invoices: [], totalCount: 0 };
        }

        return { invoices: data || [], totalCount: count || 0 };
    }

    static async getOrganizationInvoices(organizationId: string) {
        await requireSuperAdmin();
        
        const { data, error } = await supabaseAdmin
            .from('saas_platform_invoices')
            .select(`
                *,
                organization:organizations(name),
                payment_transaction:payment_transactions(*)
            `)
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching org invoices:', error);
            return [];
        }

        return data || [];
    }

    static async getPlatformPaymentMethods() {
        await requireSuperAdmin();
        const supabase = supabaseAdmin
        
        // 1. Find Platform Organization
        const { data: platformOrg } = await supabaseAdmin
            .from('organizations')
            .select('id')
            .eq('organization_type', 'platform')
            .single();
        
        if (!platformOrg) return [];

        // 2. Fetch Active Methods
        const { data: methods } = await supabaseAdmin
            .from('organization_payment_methods')
            .select('*')
            .eq('organization_id', platformOrg.id)
            .eq('is_active', true)
            .order('display_order', { ascending: true });
        
        return sanitizePaymentMethodsForClient(methods || []);
    }

    static async deletePlatformInvoice(invoiceId: string) {
        await requireSuperAdmin();
        
        const { error } = await supabaseAdmin
            .from('saas_platform_invoices')
            .delete()
            .eq('id', invoiceId);

        if (error) throw new Error("No se pudo eliminar la factura");
        return { success: true };
    }

    static async manualActivateSubscription(organizationId: string, options?: { expiryDate?: string, monthsToAdd?: number }) {
        await requireSuperAdmin();
        const supabase = supabaseAdmin

        // 1. Security Check
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: "No autorizado" }

        // 2. Fetch Organization Data
        const { data: org, error: orgFetchError } = await supabaseAdmin
            .from('organizations')
            .select('name, subscription_product_id, active_app_id')
            .eq('id', organizationId)
            .single();

        if (orgFetchError || !org) {
            return { success: false, error: "No se encontró la organización especificada." }
        }

        // 3. PRODUCT & APP RESOLUTION
        let finalProduct: { id: string, slug: string } | null = null;
        const productRef = org.subscription_product_id;
        const { data: foundProduct } = await supabaseAdmin
            .from('saas_products')
            .select('id, slug')
            .or(`id.eq.${productRef || '00000000-0000-0000-0000-000000000000'},slug.eq.${productRef || 'none'}`)
            .maybeSingle();

        if (foundProduct) {
            finalProduct = foundProduct;
        } else {
            const { data: fallback } = await supabaseAdmin
                .from('saas_products')
                .select('id, slug')
                .order('status', { ascending: false })
                .limit(1)
                .maybeSingle();
            finalProduct = fallback;
        }

        let dialect: 'uuid' | 'slug' | 'app' = 'uuid';
        const { data: sampleSub } = await supabaseAdmin
            .from('saas_subscriptions')
            .select('plan_id')
            .limit(1)
            .maybeSingle();
        
        if (sampleSub && sampleSub.plan_id) {
            if (sampleSub.plan_id.startsWith('app_')) {
                dialect = 'app';
            } else {
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sampleSub.plan_id);
                dialect = isUuid ? 'uuid' : 'slug';
            }
        }

        let planValueForInsert: string;
        if (dialect === 'app') {
            planValueForInsert = org.active_app_id || 'app_marketing_starter';
        } else {
            if (!finalProduct) return { success: false, error: "No hay productos disponibles para activar." }
            planValueForInsert = dialect === 'uuid' ? finalProduct.id : finalProduct.slug;
        }

        // 4. Determine Expiry
        let expiryStr: string;
        if (options?.expiryDate) {
            expiryStr = new Date(options.expiryDate).toISOString();
        } else {
            const d = new Date();
            d.setMonth(d.getMonth() + (options?.monthsToAdd || 1));
            expiryStr = d.toISOString();
        }

        // 5. DB Sync
        try {
            const { error: subError } = await supabaseAdmin
                .from('saas_subscriptions')
                .upsert({
                    organization_id: organizationId,
                    plan_id: planValueForInsert,
                    status: 'active',
                    current_period_end: expiryStr,
                    billing_method: 'MANUAL',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'organization_id' });

            if (subError) throw subError;

            await supabaseAdmin
                .from('organizations')
                .update({ subscription_status: 'active' })
                .eq('id', organizationId);

            return { success: true };
        } catch (dbError: any) {
            logPlatformBillingError("[PlatformBilling.manualActivateSubscription] Error:", dbError)
            return { success: false, error: platformBillingErrorMessage(dbError, PUBLIC_SUBSCRIPTION_ACTIVATION_ERROR) };
        }
    }

    static async suspendOrganizationSubscription(organizationId: string) {
        await requireSuperAdmin();
        
        const { error: subError } = await supabaseAdmin
            .from('saas_subscriptions')
            .update({ status: 'suspended', updated_at: new Date().toISOString() })
            .eq('organization_id', organizationId)

        if (subError) throw subError;

        const { error: orgError } = await supabaseAdmin
            .from('organizations')
            .update({ 
                status: 'suspended', 
                subscription_status: 'suspended',
                suspended_at: new Date().toISOString(),
                updated_at: new Date().toISOString() 
            })
            .eq('id', organizationId)

        if (orgError) throw new Error("No se pudo suspender la organización")

        return { success: true }
    }

    static async markPlatformInvoiceAsPaid(invoiceId: string) {
        await requireSuperAdmin();
        
        
        
        // 1. Update invoice status
        const { error: invoiceError } = await supabaseAdmin
            .from('saas_platform_invoices')
            .update({ 
                status: 'PAID', 
                updated_at: new Date().toISOString()
            })
            .eq('id', invoiceId)

        if (invoiceError) {
            logPlatformBillingError("[PlatformBilling.markPlatformInvoiceAsPaid] Invoice error:", invoiceError)
            return { success: false, error: "No se pudo actualizar el estado de la factura." }
        }

        // 2. Fetch the invoice to get org info
        const { data: invoice } = await supabaseAdmin
            .from('saas_platform_invoices')
            .select('organization_id')
            .eq('id', invoiceId)
            .single()

        // 3. Reactivate subscription if it was pending
        if (invoice?.organization_id) {
            await this.manualActivateSubscription(invoice.organization_id, { monthsToAdd: 1 })
        }

        return { success: true }
    }
}
