import { inngest } from "@/lib/inngest/client";
import { checkAndGenerateCycles } from "@/lib/billing-automation";

/**
 * Automatización de Facturación de Clientes (SaaS Engine)
 * Ejecuta el ciclo de facturación para todos los tenants de forma independiente.
 * Frecuencia: Cada 6 horas (puedes ajustarla según necesidad).
 */
export const clientInvoicingAutomation = inngest.createFunction(
    { 
        id: "client-invoicing-automation",
        name: "Client Invoicing Automation (SaaS CRM)",
        concurrency: 1 // Evitar ejecuciones paralelas para prevenir race conditions en la DB
    },
    { cron: "0 */6 * * *" }, // Corre cada 6 horas (00:00, 06:00, 12:00, 18:00)
    async ({ step }) => {
        const result = await step.run("run-billing-cycle-check", async () => {
            console.log("[INNGEST] 🚀 Iniciando verificación de ciclos de facturación global...");
            
            const summary = await checkAndGenerateCycles();
            
            console.log(`[INNGEST] ✅ Verificación completada. Resultados:`, summary);
            
            return summary;
        });

        return { 
            message: "Ciclo de facturación procesado satisfactoriamente",
            stats: result 
        };
    }
);
