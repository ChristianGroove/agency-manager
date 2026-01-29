
import { AssistantContext, AssistantAction, AssistantResult } from "../types";
import { getInvoiceById } from "@/modules/core/billing/invoices-actions";

export const SendPaymentReminderAction: AssistantAction = {
    name: "send_payment_reminder",
    description: "Envía un recordatorio de pago para una factura",
    required_permissions: ['billing.read', 'communications.create'],
    execute: async (ctx: AssistantContext, params: any): Promise<AssistantResult> => {
        // 1. Validation
        if (!params.invoice_id) {
            return {
                success: false,
                narrative_log: "Necesito el ID de la factura para enviar el recordatorio."
            };
        }

        // 2. Logic
        try {
            const invoice = await getInvoiceById(params.invoice_id);
            if (!invoice) {
                return { success: false, narrative_log: "No encontré esa factura." };
            }

            if (invoice.status === 'paid') {
                return { success: false, narrative_log: "Esa factura ya está pagada. No molestaré al cliente." };
            }

            // Mock Email Sending (Phase 1 Requirement: "Log narrativo obligatorio")
            // Real impl would call Resend or similar here.

            const clientName = invoice.client?.name || "Cliente";
            const amount = invoice.total.toLocaleString();

            console.log(`[Assistant] Sending email to ${clientName} for invoice ${invoice.number}`);

            return {
                success: true,
                narrative_log: `✅ Recordatorio enviado a ${clientName} por la factura ${invoice.number} ($${amount}).`,
                data: { sent_to: clientName, channel: 'email' }
            };

        } catch (e: any) {
            return {
                success: false,
                narrative_log: `Error enviando recordatorio: ${e.message}`
            };
        }
    }
};
