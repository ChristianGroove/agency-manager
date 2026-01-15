
import { ContextManager } from '../context-manager';
import { NodeExecutionResult } from '../types';

export interface BillingNodeData {
    actionType: 'create_invoice' | 'create_quote' | 'send_quote';
    // Common
    items?: Array<{ description: string; quantity: number; price: number }>;
    // Create params
    clientId?: string;
    leadId?: string;
    // Send params
    quoteId?: string;
    method?: 'whatsapp' | 'email';
}

export class BillingNode {
    constructor(private contextManager: ContextManager) { }

    async execute(data: BillingNodeData): Promise<NodeExecutionResult> {
        const actionType = data.actionType;
        console.log(`[BillingNode] Executing ${actionType}`);

        try {
            switch (actionType) {
                case 'create_invoice':
                    return await this.createInvoice(data);
                case 'create_quote':
                    return await this.createQuote(data);
                case 'send_quote':
                    return await this.sendQuote(data);
                default:
                    throw new Error(`Unknown billing action: ${actionType}`);
            }
        } catch (error: any) {
            console.error(`[BillingNode] Error:`, error);
            return { success: false, error: error.message };
        }
    }

    private async createInvoice(data: BillingNodeData): Promise<NodeExecutionResult> {
        const { createInvoice } = await import('@/modules/core/billing/invoices-actions');

        // Resolve variables
        const clientId = this.contextManager.resolve(data.clientId || '') ||
            (this.contextManager.get('client') as any)?.id;

        if (!clientId) throw new Error("Client ID required for invoice");

        // Parse items (handle stringified JSON from context if needed, or raw array)
        let items = data.items || [];
        if (typeof items === 'string') {
            try { items = JSON.parse(this.contextManager.resolve(items)); } catch (e) { }
        }

        const result = await createInvoice({
            client_id: clientId,
            items: items,
            date: new Date().toISOString(),
            status: 'pending' // Default
        });

        if (!result.success) throw new Error(result.error || "Failed to create invoice");

        this.contextManager.set('invoice_id', result.data.id);
        this.contextManager.set('invoice', result.data);

        return { success: true, output: result.data };
    }

    private async createQuote(data: BillingNodeData): Promise<NodeExecutionResult> {
        const { createQuote } = await import('@/modules/core/quotes/actions');

        const leadId = this.contextManager.resolve(data.leadId || '') ||
            (this.contextManager.get('lead') as any)?.id;
        const clientId = this.contextManager.resolve(data.clientId || '') ||
            (this.contextManager.get('client') as any)?.id;

        if (!leadId && !clientId) throw new Error("Lead ID or Client ID required for quote");

        let items = data.items || [];
        // Helper to sum total
        const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const result = await createQuote({
            lead_id: leadId,
            client_id: clientId,
            items: items,
            total,
            date: new Date().toISOString()
        });

        if (!result.success) throw new Error(result.error as string);

        this.contextManager.set('quote_id', result.data.id);
        this.contextManager.set('quote', result.data);

        return { success: true, output: result.data };
    }

    private async sendQuote(data: BillingNodeData): Promise<NodeExecutionResult> {
        const { sendQuoteViaWhatsApp } = await import('@/modules/core/quotes/actions');

        const quoteId = this.contextManager.resolve(data.quoteId || '') ||
            (this.contextManager.get('quote_id') as string);

        if (!quoteId) throw new Error("Quote ID required to send");

        const result = await sendQuoteViaWhatsApp(quoteId);

        if (!result.success) throw new Error(result.error);

        return { success: true };
    }
}
