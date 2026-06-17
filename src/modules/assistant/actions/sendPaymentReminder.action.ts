
import { createClient } from "@/modules/core/database/supabase-server";
import { AssistantContext } from "../types";
import { logAssistantInfo } from "../safe-logging";

/**
 * SEND PAYMENT REMINDER ACTION
 * 
 * Scope: Billing
 * Risk: Medium
 * Required Params: invoice_id
 */

type SendReminderParams = {
    invoice_id: string;
};

export async function sendPaymentReminderAction(
    params: SendReminderParams,
    context: AssistantContext,
    injectedClient?: any
) {
    logAssistantInfo("[ACTION] Send Payment Reminder", {
        userId: context.user_id,
        organizationId: context.tenant_id,
        invoiceId: params.invoice_id,
    });

    // 1. Validate Params
    if (!params.invoice_id) {
        throw new Error("Missing required parameter: invoice_id");
    }

    // 2. Initialize Client
    const supabase = injectedClient || await createClient();

    // 3. Fetch Invoice (Validation)
    const { data: invoice, error } = await supabase
        .from('invoices')
        .select('id, status, client_id, due_date, total_amount')
        .eq('id', params.invoice_id)
        .eq('organization_id', context.tenant_id)
        .single();

    if (error || !invoice) {
        throw new Error(`Invoice not found or access denied: ${params.invoice_id}`);
    }

    // 4. BI Logic Validation
    if (invoice.status === 'paid') {
        throw new Error("Cannot send reminder: Invoice is already PAID.");
    }

    // 5. Execution (Simulation Phase 1)
    // TODO: Integrate with real Email/WhatsApp provider (Wompi/Resend)
    // For now, we simulate success and return payload for the Assistant to confirm.

    logAssistantInfo("[ACTION] SIMULATION: Sending payment reminder", {
        clientId: invoice.client_id,
        invoiceId: invoice.id,
        amountPresent: invoice.total_amount != null,
    });

    return {
        success: true,
        invoice_id: invoice.id,
        status: 'queued',
        method: 'simulated_email',
        message: `Reminder queued for Invoice #${invoice.id.slice(0, 8)}... ($${invoice.total_amount})`,
        meta: {
            due_date: invoice.due_date,
            current_status: invoice.status
        }
    };
}
