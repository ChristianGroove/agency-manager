
import { AssistantContext, AssistantAction, AssistantResult } from "../types";
import { createQuote } from "@/modules/core/quotes/actions";

export const CreateQuoteAction: AssistantAction = {
    name: "create_quote",
    description: "Crea una nueva cotización en borrador",
    required_permissions: ['quotes.create'],
    execute: async (ctx: AssistantContext, params: any): Promise<AssistantResult> => {
        // 1. Validation
        if (!params.client_id) {
            return {
                success: false,
                narrative_log: "Falta el cliente para la cotización."
            };
        }

        const items = params.items || [];
        if (items.length === 0) {
            return {
                success: false,
                narrative_log: "No puedo crear una cotización vacía. Necesito conceptos."
            };
        }

        // 2. Execution
        try {
            // Map simple items to Quote structure
            // Assumes items have { description, price }
            const quoteItems = items.map((i: any) => ({
                description: i.description || "Concepto general",
                price: Number(i.price) || 0,
                quantity: Number(i.quantity) || 1
            }));

            const result = await createQuote({
                client_id: params.client_id,
                items: quoteItems,
                date: new Date().toISOString()
            });

            if (result.success) {
                return {
                    success: true,
                    // data should contain the quote object. Let's assume result.data is the quote.
                    narrative_log: `✅ Cotización #${result.data?.number || 'Draft'} creada exitosamente por $${result.data?.total?.toLocaleString()}.`,
                    data: result.data
                };
            } else {
                throw new Error(result.error);
            }

        } catch (e: any) {
            return {
                success: false,
                narrative_log: `Error creando la cotización: ${e.message}`
            };
        }
    }
};
