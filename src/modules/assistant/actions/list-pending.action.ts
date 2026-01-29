
import { AssistantContext, AssistantAction, AssistantResult } from "../types";
import { getInvoices } from "@/modules/core/billing/invoices-actions";
// import { getQuotes } from "@/modules/core/quotes/actions"; // Assuming this exists or using generic fetch

export const ListPendingActions: AssistantAction = {
    name: "list_pending_actions",
    description: "Lista facturas vencidas y cotizaciones pendientes",
    required_permissions: ['billing.read', 'quotes.read'],
    execute: async (ctx: AssistantContext, params: any): Promise<AssistantResult> => {
        try {
            // Parallel Fetch
            const [invoices] = await Promise.all([
                getInvoices(),
                // getQuotes() // Commented until verified export
            ]);

            const overdue = invoices.filter(i => i.status === 'overdue' || (i.status === 'pending' && new Date(i.due_date || '') < new Date()));

            // Generate Narrative
            let narrative = "";

            if (overdue.length > 0) {
                const total = overdue.reduce((sum, inv) => sum + inv.total, 0);
                narrative += `Tienes ${overdue.length} facturas vencidas por cobrar ($${total.toLocaleString()}). `;
            } else {
                narrative += "Estás al día con los cobros. ";
            }

            // if (pendingQuotes...)

            return {
                success: true,
                narrative_log: narrative || "No encontré acciones urgentes pendientes.",
                data: { overdue_count: overdue.length }
            };

        } catch (e: any) {
            return {
                success: false,
                narrative_log: `Error consultando pendientes: ${e.message}`
            };
        }
    }
};
