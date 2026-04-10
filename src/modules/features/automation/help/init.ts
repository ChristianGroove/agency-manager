import { helpRegistry } from "@/modules/features/caa/registry"
import { HelpArticle } from "@/modules/features/caa/types"

export function registerAutomationHelp() {
    const articles: HelpArticle[] = [
        // --- EXISTING ARTICLES (Kept for continuity) ---
        {
            id: "automation-intro",
            title: "Automatiza tu Agencia",
            description: "Conceptos básicos: Triggers, Acciones y Condiciones.",
            relatedViews: ["automation", "dashboard"],
            relatedActions: ["create-workflow"],
            keywords: ["automatización", "workflow", "trigger", "acción", "intro"],
            contentBlocks: [
                { type: "text", content: "Las automatizaciones son flujos de trabajo que trabajan por ti 24/7." },
                { type: "text", content: "**Estructura Básica**:\n- **Trigger (Disparador)**: El evento que inicia el flujo (ej. 'Mensaje Recibido').\n- **Acciones**: Lo que el bot hace (ej. 'Responder', 'Crear Factura').\n- **Lógica**: Decisiones inteligentes (ej. 'Si es cliente VIP...')." },
                { type: "callout", content: "Empieza simple. Un flujo de 'Bienvenida' bien hecho vale más que diez flujos complejos a medias.", variant: "info" }
            ]
        },

        // --- NEW ULTRA-DETAILED GUIDES ---

        // 1. TRIGGERS (EL ORIGEN)
        {
            id: "guide-triggers",
            title: "Guía de Triggers (Disparadores)",
            description: "Aprende cómo iniciar tus flujos: Webhooks, Horarios, Palabras Clave.",
            relatedViews: ["automation"],
            relatedActions: [],
            keywords: ["trigger", "inicio", "webhook", "keyword", "horario"],
            contentBlocks: [
                { type: "text", content: "El nodo **Trigger** es el corazón de tu automatización. Define *cuándo* y *por qué* se ejecuta el flujo." },
                { type: "callout", content: "Puedes configurar múltiples canales (WhatsApp, Instagram, etc.) en un solo Trigger.", variant: "info" },
                { type: "text", content: "### Tipos de Disparadores:" },
                { type: "text", content: "**1. Webhook (Cualquier Mensaje)**\n- **Uso**: Escucha *todo* lo que llega.\n- **Ejemplo**: Bot de atención al cliente general que responde a cualquier 'Hola'." },
                { type: "text", content: "**2. First Contact (Primer Contacto)**\n- **Uso**: Se activa solo si es la **primera vez** que este número escribe.\n- **Ejemplo**: Mensaje de bienvenida único + Creación de Lead en CRM." },
                { type: "text", content: "**3. Keyword (Palabra Clave)**\n- **Uso**: Filtra mensajes que contengan una palabra específica.\n- **Ejemplo**: Si el cliente escribe 'PRECIO' -> Enviar lista de precios." },
                { type: "text", content: "**4. Business Hours (Horario Laboral)**\n- **Uso**: Se activa solo dentro de tu horario definido (ej. 9am - 6pm).\n- **Ejemplo**: Bot que asigna chats a humanos durante el día." },
                { type: "text", content: "**5. Outside Hours (Fuera de Horario)**\n- **Uso**: Se activa cuando estás cerrado.\n- **Ejemplo**: Auto-respuesta: 'Estamos cerrados, volvemos mañana'." },
                { type: "text", content: "**6. Media Received (Archivos)**\n- **Uso**: Detecta imágenes, audios o documentos.\n- **Ejemplo**: Cliente envía comprobante de pago -> Bot procesa la imagen." }
            ]
        },

        // 2. MENSAJERÍA E INTERACCIÓN
        {
            id: "guide-messaging",
            title: "Guía de Mensajería Interactiva",
            description: "WhatsApp, Botones, Menús y Espera de Respuestas.",
            relatedViews: ["automation"],
            relatedActions: [],
            keywords: ["mensaje", "whatsapp", "botones", "wait input", "sms", "email"],
            contentBlocks: [
                { type: "text", content: "Comunícate con tus clientes usando estos nodos:" },
                { type: "text", content: "### 💬 Mensajería Básica" },
                { type: "text", content: "**📨 Send Message (Acción)**\n- Envía texto simple.\n- **Tip**: Usa `{{lead.name}}` para personalizar con el nombre del cliente." },
                { type: "text", content: "**📧 Email Node**\n- Envía correos HTML completos.\n- Requiere configurar SMTP o proveedor." },
                { type: "text", content: "**📱 SMS Node**\n- Envía mensajes de texto cortos (160 caracteres).\n- Ideal para alertas urgentes o códigos OTP." },

                { type: "text", content: "### 🎮 Interacción Avanzada" },
                { type: "text", content: "**🔘 Buttons (Botones)**\n- Envía un mensaje con hasta 3 opciones clicables.\n- **Uso**: Menús de navegación ('Ventas', 'Soporte', 'Halar con Humano').\n- **Nota**: Mucho más rápido que pedir al usuario que escriba." },
                { type: "text", content: "**⏳ Wait Input (Esperar Respuesta)**\n- **¡Vital!** Detiene el flujo hasta que el cliente responde.\n- **Timeout**: Puedes configurar cuánto tiempo esperar antes de rendirse.\n- **Ejemplo**: Preguntas '¿Cuál es tu correo?', pones un Wait Input, y luego guardas la respuesta." }
            ]
        },

        // 3. GESTIÓN DE NEGOCIO (CRM & BILLING)
        {
            id: "guide-business",
            title: "Guía de Negocio: CRM y Facturación",
            description: "Automatiza tu operación: Leads, Facturas y Notificaciones.",
            relatedViews: ["automation"],
            relatedActions: [],
            keywords: ["crm", "factura", "billing", "lead", "notificacion", "tag"],
            contentBlocks: [
                { type: "text", content: "Convierte conversaciones en dinero sin mover un dedo." },
                { type: "text", content: "### 🗄️ CRM (Gestión de Leads)" },
                { type: "text", content: "**👤 Create Lead**: Guarda a quien te escribe como un nuevo cliente potencial." },
                { type: "text", content: "**🏷️ Add Tag**: Clasifica usuarios (ej. 'vip', 'interesado-bot', 'pagado')." },
                { type: "text", content: "**📈 Update Stage**: Mueve al cliente en tu Pipeline (ej. de 'Nuevo' a 'Negociación')." },

                { type: "text", content: "### 💰 Billing (Facturación)" },
                { type: "text", content: "**📄 Create Invoice**: Genera una factura real en el sistema.\n- **Input**: Items, Cliente, Vencimiento." },
                { type: "text", content: "**📜 Create/Send Quote**: Crea y envía una cotización PDF por WhatsApp automáticamente." },

                { type: "text", content: "### 🔔 Sistema Interno" },
                { type: "text", content: "**🔔 Notification**: Envía una alerta al PANEL de tus empleados.\n- **Ejemplo**: '¡Nuevo Lead Caliente! Atender ya'." }
            ]
        },

        // 4. LÓGICA Y CONTROL
        {
            id: "guide-logic",
            title: "Guía de Lógica y Control",
            description: "Crea cerebros complejos: Condiciones, IA, Variables y Tiempos.",
            relatedViews: ["automation"],
            relatedActions: [],
            keywords: ["condicion", "logic", "ai", "variable", "wait", "ab test"],
            contentBlocks: [
                { type: "text", content: "Domina el flujo de la conversación con lógica avanzada." },

                { type: "text", content: "### 🧠 Inteligencia" },
                { type: "text", content: "**🤖 AI Agent**: Procesa texto con GPT-4.\n- **Prompt**: 'Analiza el sentimiento de este mensaje: {{message.body}}'.\n- **Respuesta**: La IA guarda su análisis en una variable para usarla después." },
                { type: "text", content: "**🧮 Variable Node**: \n- **Set**: Guarda datos (ej. score = 0).\n- **Math**: Suma/Resta (ej. score = score + 10)." },

                { type: "text", content: "### 🚦 Control de Flujo" },
                { type: "text", content: "**Condition (If/Else)**: Divide el camino.\n- **Ejemplo**: Si `{{lead.tag}}` contiene 'vip' -> Camino A, si no -> Camino B." },
                { type: "text", content: "**🧪 A/B Test**: Experimentos de marketing.\n- **Ejemplo**: Envía el Mensaje A al 50% y el B al 50% para ver cuál vende más." },

                { type: "text", content: "### ⏱️ Tiempos" },
                { type: "text", content: "**Wait (Espera)**: Pausa el flujo por un tiempo determinado.\n- **Uso**: Desde micro-pausas (3 seg para parecer humano) hasta esperas largas (24h para seguimiento)." }
            ]
        }
    ]

    helpRegistry.batchRegister(articles)
}
