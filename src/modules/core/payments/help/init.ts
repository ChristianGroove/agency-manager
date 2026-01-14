import { helpRegistry } from "@/modules/core/caa/registry"
import { HelpArticle } from "@/modules/core/caa/types"

export function registerPaymentsHelp() {
    const articles: HelpArticle[] = [
        {
            id: "payments-overview",
            title: "Recibe Pagos Online",
            description: "Cobra a tus clientes de forma segura y automática.",
            relatedViews: ["payments", "billing"],
            relatedActions: [],
            keywords: ["pago", "cobrar", "online", "tarjeta"],
            contentBlocks: [
                { type: "text", content: "Con Pixy, tus clientes pueden pagar facturas directamente desde el portal con tarjeta de crédito o débito." },
                { type: "text", content: "**Beneficios**:\n- Cobro automatizado\n- Reconciliación automática\n- Historial de transacciones\n- Recibos automáticos" },
                { type: "callout", content: "Configura tu pasarela de pago en Integraciones.", variant: "info" }
            ]
        },
        {
            id: "payment-methods",
            title: "Métodos de Pago Soportados",
            description: "Opciones de pago para tus clientes.",
            relatedViews: ["payments"],
            relatedActions: [],
            keywords: ["tarjeta", "transferencia", "pse", "nequi"],
            contentBlocks: [
                { type: "text", content: "Dependiendo de tu pasarela y país, puedes ofrecer:" },
                { type: "text", content: "**Colombia**: PSE, tarjeta crédito/débito, Nequi, Daviplata.\n**Internacional**: Tarjeta, PayPal, transferencia bancaria.\n**Suscripciones**: Cobro recurrente automático." }
            ]
        },
        {
            id: "payment-tracking",
            title: "Seguimiento de Pagos",
            description: "Sabe exactamente quién ha pagado y quién no.",
            relatedViews: ["payments", "billing"],
            relatedActions: [],
            keywords: ["tracking", "pendiente", "estado", "mora"],
            contentBlocks: [
                { type: "text", content: "El dashboard de pagos te muestra:\n- Pagos recibidos hoy/semana/mes\n- Facturas pendientes\n- Clientes en mora\n- Proyección de ingresos" },
                { type: "callout", content: "Activa recordatorios automáticos para facturas vencidas.", variant: "warning" }
            ]
        }
    ]

    helpRegistry.batchRegister(articles)
}
