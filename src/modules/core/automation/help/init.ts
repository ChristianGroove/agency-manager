import { helpRegistry } from "@/modules/core/caa/registry"
import { HelpArticle } from "@/modules/core/caa/types"

export function registerAutomationHelp() {
    const articles: HelpArticle[] = [
        {
            id: "automation-intro",
            title: "Automatiza tu Agencia",
            description: "Deja que Pixy trabaje mientras duermes.",
            relatedViews: ["automation", "dashboard"],
            relatedActions: ["create-workflow"],
            keywords: ["automatización", "workflow", "trigger", "acción"],
            contentBlocks: [
                { type: "text", content: "Las automatizaciones ejecutan acciones cuando ocurren eventos. Por ejemplo: 'Cuando un lead se registra → Enviar correo de bienvenida'." },
                { type: "text", content: "**Componentes de una automatización**:\n- **Trigger**: El evento que inicia todo (ej. 'Lead creado').\n- **Condiciones**: Filtros opcionales (ej. 'Solo si viene de Facebook').\n- **Acciones**: Lo que sucede (ej. 'Enviar email', 'Asignar a agente')." },
                { type: "callout", content: "Empieza simple. Una automatización bien hecha vale más que diez a medias.", variant: "warning" },
                { type: "text", content: "{{action:create-workflow|Crear Mi Primera Automatización}}." }
            ]
        },
        {
            id: "automation-templates",
            title: "Plantillas de Automatización",
            description: "No reinventes la rueda: usa flujos probados.",
            relatedViews: ["automation"],
            relatedActions: [],
            keywords: ["plantilla", "template", "ejemplo"],
            contentBlocks: [
                { type: "text", content: "Pixy incluye plantillas listas para usar:" },
                { type: "text", content: "- **Onboarding de Cliente**: Envía secuencia de bienvenida.\n- **Recuperación de Carrito**: Recuerda al lead su cotización pendiente.\n- **Cumpleaños**: Felicita a tus clientes automáticamente.\n- **NPS Post-Servicio**: Pide valoración después de entregar." },
                { type: "callout", content: "Puedes duplicar y personalizar cualquier plantilla.", variant: "info" }
            ]
        },
        {
            id: "automation-testing",
            title: "Probar Automatizaciones",
            description: "Asegúrate de que todo funcione antes de activar.",
            relatedViews: ["automation"],
            relatedActions: [],
            keywords: ["test", "probar", "debug"],
            contentBlocks: [
                { type: "text", content: "Antes de activar una automatización, usa el modo 'Prueba' para simular el flujo sin afectar datos reales." },
                { type: "text", content: "Revisa el historial de ejecuciones para ver qué pasó en cada paso." }
            ]
        }
    ]

    helpRegistry.batchRegister(articles)
}
