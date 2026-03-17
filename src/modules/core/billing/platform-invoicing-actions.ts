"use server"

import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { isSuperAdmin, requireSuperAdmin } from "@/lib/auth/platform-roles"
import { generatePlatformInvoicePDF } from "@/lib/platform-pdf-generator"
import { EmailService } from "@/modules/core/notifications/email.service"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import crypto from "crypto"

export async function createManualPlatformInvoice(data: {
    organizationId: string,
    amount: number,
    currency?: string,
    billingPeriodStart: string,
    billingPeriodEnd: string,
    notes?: string,
    // New: Legal information for persistence
    clientTaxId?: string,
    clientAddress?: string,
    clientLegalName?: string,
    // New: Dynamic Tax Module
    includeTax?: boolean,
    taxRate?: number,
    taxAmount?: number,
    amountSubtotal?: number,
    recipientEmail?: string
}) {
    const supabase = await createClient()

    // 1. Security Check: Only SuperAdmins
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const isAdmin = await isSuperAdmin(user.id)
    if (!isAdmin) {
        throw new Error("Solo los Super Administradores pueden generar facturas de plataforma")
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
            console.error("Warning: Profile upsert failed (continuing invoice creation):", e);
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
            // Tax fields
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
        console.error("Full error creating platform invoice:", error)
        throw new Error(`No se pudo crear la factura de plataforma: ${error.message} (${error.code})`)
    }

    // Normalizing for serialization (Plain JSON only)
    return { 
        success: true, 
        invoice: JSON.parse(JSON.stringify(invoice)) 
    }
}

export async function sendPlatformInvoiceEmail(invoiceId: string, recipientEmail: string) {
    const supabase = await createClient()

    // 1. Fetch Invoice
    const { data: invoice, error } = await supabase
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

    // Use historical email -> fallback to provided email -> fallback to NONE
    const targetEmail = recipientEmail || invoice.recipient_email;

    if (!targetEmail) {
        throw new Error("No se encontró un destinatario válido para esta factura (Email histórico vacío)")
    }

    // Check environment (Pre-flight)
    if (!process.env.RESEND_API_KEY) {
        console.error("[Billing] CRITICAL: RESEND_API_KEY missing in production environment");
        throw new Error("El sistema de correo no está configurado correctamente en el servidor.");
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
        
        if (methods && methods.length > 0) {
            pdfPaymentMethods = methods;
            paymentMethodsHtml = `
                <div style="margin-top: 30px; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #fcfcfd;">
                    <h3 style="margin-top: 0; color: #0F172A; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 15px;">Instrucciones de Pago Manual</h3>
                    <div style="space-y: 12px;">
                        ${methods.map(m => `
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
        payment_methods: pdfPaymentMethods // Pass to PDF generator
    })

    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer())

    const formattedTotal = new Intl.NumberFormat('es-CO', { 
        style: 'currency', 
        currency: invoice.currency, 
        minimumFractionDigits: 0 
    }).format(invoice.amount_total);

    // 4.5. Generate Wompi Link (Automatic Integration)
    let wompiLink = '';
    const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
    const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;

    if (publicKey && integritySecret) {
        const reference = `PIXY-PAY-${invoice.id.slice(0, 8)}-${Date.now()}`;
        const amountInCents = Math.round(invoice.amount_total * 100);
        const currency = invoice.currency || 'USD';
        
        // Create signature
        const signatureRaw = `${reference}${amountInCents}${currency}${integritySecret}`;
        const signature = crypto.createHash('sha256').update(signatureRaw).digest('hex');
        
        // Create transaction record
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

        const isLocalhost = process.env.NODE_ENV === 'development';
        const redirectUrl = `https://mi.pixy.com.co/portal?status=success`;
        
        wompiLink = `https://checkout.wompi.co/p/?public-key=${publicKey}&currency=${currency}&amount-in-cents=${amountInCents}&reference=${reference}&signature:integrity=${signature}&redirect-url=${encodeURIComponent(redirectUrl)}`;
    }

    // 5. Send via EmailService
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

                    <p style="color: #475569; font-size: 14px;">Adjunto a este correo encontrarás el documento PDF con todos los detalles legales y el concepto del servicio.</p>
                    
                    ${wompiLink ? `
                    <div style="margin: 35px 0; text-align: center;">
                        <a href="${wompiLink}" style="background-color: #EC4899; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(236, 72, 153, 0.2);">
                            Pagar en línea con Wompi
                        </a>
                        <p style="color: #94a3b8; font-size: 11px; margin-top: 10px;">Aceptamos Tarjetas, PSE y Nequi. El pago se procesará y activará tu servicio automáticamente.</p>
                    </div>
                    ` : ''}

                    ${paymentMethodsHtml}
                    
                    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 5px;">Atentamente,</p>
                        <p style="color: #0F172A; font-weight: bold; margin: 0;">Equipo de Facturación Pixy Spaces</p>
                    </div>
                </div>
                <div style="background-color: #f1f5f9; padding: 20px; text-align: center;">
                    <p style="color: #94a3b8; font-size: 10px; margin: 0;">© 2026 Pixy Spaces. Este es un correo automático, por favor no respondas directamente.</p>
                </div>
            </div>
        `,
        attachments: [
            {
                filename: `${invoice.invoice_number}.pdf`,
                content: pdfBuffer
            }
        ],
        organizationId: invoice.organization_id // Logged for traceability
    })

    if (!result.success) {
        console.error("[Billing] EmailService failed:", result.error);
        throw new Error(`Servicio de correo falló: ${result.error?.message || "Error desconocido"}`);
    }

    return { success: true }
}

export async function getPlatformPaymentMethods() {
    const supabase = await createClient()
    
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
    
    return methods || [];
}

export async function manualActivateSubscription(organizationId: string, options?: { expiryDate?: string, monthsToAdd?: number }) {
    const supabase = await createClient()

    // 1. Security Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    // 2. Determine Expiry
    let newExpiry: Date;
    if (options?.expiryDate) {
        newExpiry = new Date(options.expiryDate);
    } else {
        newExpiry = new Date();
        newExpiry.setMonth(newExpiry.getMonth() + (options?.monthsToAdd || 1));
    }

    const { error } = await supabaseAdmin
        .from('saas_subscriptions')
        .update({
            current_period_end: newExpiry.toISOString(),
            status: 'active',
            billing_method: 'MANUAL',
            updated_at: new Date().toISOString()
        })
        .eq('organization_id', organizationId)

    if (error) {
        console.error("Error activating subscription:", error)
        throw new Error("No se pudo activar la suscripción manualmente")
    }

    return { 
        success: true, 
        newExpiry: newExpiry.toISOString() // SERIALIZABLE!
    }
}

export async function suspendOrganizationSubscription(organizationId: string) {
    await requireSuperAdmin();
    
    // Suspend both subscription and organization for effective access block
    const { error: subError } = await supabaseAdmin
        .from('saas_subscriptions')
        .update({
            status: 'suspended',
            updated_at: new Date().toISOString()
        })
        .eq('organization_id', organizationId)

    if (subError) throw subError;

    const { error: orgError } = await supabaseAdmin
        .from('organizations')
        .update({
            status: 'suspended',
            updated_at: new Date().toISOString()
        })
        .eq('id', organizationId)

    if (orgError) {
        console.error("Error suspending organization:", orgError)
        throw new Error("No se pudo suspender la organización")
    }

    return { success: true }
}
export async function getPlatformInvoices(page: number = 1, pageSize: number = 50) {
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

export async function deletePlatformInvoice(invoiceId: string) {
    await requireSuperAdmin();

    const { error } = await supabaseAdmin
        .from('saas_platform_invoices')
        .delete()
        .eq('id', invoiceId);

    if (error) {
        console.error("Error deleting platform invoice:", error);
        throw new Error("No se pudo eliminar la factura");
    }

    return { success: true };
}
