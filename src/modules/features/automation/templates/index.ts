import { WorkflowTemplate } from './types';

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
    // Template 1: WhatsApp Lead Qualification Bot
    {
        id: 'whatsapp-lead-bot',
        name: '🤖 Bot Calificación de Leads (WhatsApp)',
        description: 'Chatbot interactivo para calificar leads entrantes, asignar etiquetas y moverlos en el pipeline automáticamente.',
        category: 'marketing',
        requiredIntegrations: ['whatsapp', 'crm'],
        estimatedSetupTime: '5 minutos',
        tags: ['chatbot', 'whatsapp', 'qualify', 'tags'],
        difficulty: 'intermediate',
        nodes: [
            {
                id: 'trigger-1',
                type: 'trigger',
                data: {
                    label: 'Mensaje Entrante',
                    triggerType: 'webhook',
                    description: 'Palabra clave: "info" o "precio"',
                },
                position: { x: 250, y: 50 },
            },
            {
                id: 'btn-menu',
                type: 'buttons',
                data: {
                    label: 'Menú Principal',
                    header: 'Bienvenido a Agencia Digital 🚀',
                    body: 'Hola {{contact.first_name}}, ¿en qué podemos ayudarte hoy?',
                    footer: 'Selecciona una opción',
                    buttons: [
                        { id: 'btn_servicios', title: 'Ver Servicios' },
                        { id: 'btn_precios', title: 'Consultar Precios' },
                        { id: 'btn_soporte', title: 'Hablar con Asesor' }
                    ]
                },
                position: { x: 250, y: 150 },
            },
            // Path: Servicios
            {
                id: 'tag-servicios',
                type: 'tag',
                data: {
                    label: 'Tag: Interesado',
                    action: 'add',
                    tagName: 'Interesado Servicios'
                },
                position: { x: 0, y: 300 },
            },
            {
                id: 'msg-servicios',
                type: 'action',
                data: {
                    label: 'Enviar PDF Servicios',
                    actionType: 'send_message',
                    message: 'Aquí tienes nuestro portafolio de servicios: https://ejemplo.com/portfolio.pdf'
                },
                position: { x: 0, y: 400 },
            },
            // Path: Precios
            {
                id: 'tag-precios',
                type: 'tag',
                data: {
                    label: 'Tag: High Intent',
                    action: 'add',
                    tagName: 'High Intent'
                },
                position: { x: 250, y: 300 },
            },
            {
                id: 'stage-precios',
                type: 'stage',
                data: {
                    label: 'Mover a: Propuesta',
                    status: 'proposal'
                },
                position: { x: 250, y: 400 },
            },
            {
                id: 'msg-precios',
                type: 'action',
                data: {
                    label: 'Pedir Presupuesto',
                    actionType: 'send_message',
                    message: 'Para darte un precio exacto, ¿cuál es tu presupuesto aproximado?'
                },
                position: { x: 250, y: 500 },
            },
            {
                id: 'wait-budget',
                type: 'wait_input',
                data: {
                    label: 'Esperar Presupuesto',
                    timeout: '24h',
                    variableName: 'lead.budget'
                },
                position: { x: 250, y: 600 },
            },
            // Path: Soporte
            {
                id: 'crm-assign',
                type: 'crm',
                data: {
                    label: 'Asignar Agente',
                    actionType: 'assign_owner', // Hypothetical
                },
                position: { x: 500, y: 300 },
            },
            {
                id: 'msg-human',
                type: 'action',
                data: {
                    label: 'Aviso Humano',
                    actionType: 'send_message',
                    message: 'Un agente humano te atenderá en breve. 👨‍💻'
                },
                position: { x: 500, y: 400 },
            }
        ],
        edges: [
            // Menu Edges
            { id: 'e1', source: 'trigger-1', target: 'btn-menu' },
            { id: 'e2', source: 'btn-menu', target: 'tag-servicios', sourceHandle: 'btn_servicios' },
            { id: 'e3', source: 'btn-menu', target: 'tag-precios', sourceHandle: 'btn_precios' },
            { id: 'e4', source: 'btn-menu', target: 'crm-assign', sourceHandle: 'btn_soporte' },

            // Servicios Flow
            { id: 'e5', source: 'tag-servicios', target: 'msg-servicios' },

            // Precios Flow
            { id: 'e6', source: 'tag-precios', target: 'stage-precios' },
            { id: 'e7', source: 'stage-precios', target: 'msg-precios' },
            { id: 'e8', source: 'msg-precios', target: 'wait-budget' },

            // Soporte Flow
            { id: 'e9', source: 'crm-assign', target: 'msg-human' }
        ],
    },

    // Template 2: Appointment Confirmation
    {
        id: 'appointment-reminder',
        name: '📅 Confirmación de Citas',
        description: 'Envía recordatorios de citas y gestiona confirmaciones o cancelaciones automáticamente.',
        category: 'sales',
        requiredIntegrations: ['whatsapp', 'crm', 'calendar'],
        estimatedSetupTime: '3 minutos',
        tags: ['calendar', 'reminder', 'whatsapp'],
        difficulty: 'beginner',
        nodes: [
            {
                id: 'trigger-time',
                type: 'trigger',
                data: {
                    label: '24h Antes de Cita',
                    triggerType: 'schedule', // Hypothetical
                    cron: '0 9 * * *'
                },
                position: { x: 250, y: 50 },
            },
            {
                id: 'btn-confirm',
                type: 'buttons',
                data: {
                    label: 'Confirmar Asistencia',
                    body: 'Hola {{contact.first_name}}, tienes una cita mañana a las {{calendar.time}}. ¿Podrás asistir?',
                    buttons: [
                        { id: 'yes', title: '✅ Sí, confirmo' },
                        { id: 'no', title: '❌ No, reagendar' }
                    ]
                },
                position: { x: 250, y: 150 },
            },
            // Yes Branch
            {
                id: 'tag-confirmed',
                type: 'tag',
                data: {
                    label: 'Tag: Confirmado',
                    action: 'add',
                    tagName: 'Cita Confirmada'
                },
                position: { x: 100, y: 300 },
            },
            {
                id: 'msg-thanks',
                type: 'action',
                data: {
                    label: 'Enviar Ubicación',
                    actionType: 'send_message',
                    message: '¡Genial! Nos vemos. Aquí está la ubicación: https://maps.google.com/...'
                },
                position: { x: 100, y: 400 },
            },
            // No Branch
            {
                id: 'tag-reschedule',
                type: 'tag',
                data: {
                    label: 'Tag: Reagendar',
                    action: 'add',
                    tagName: 'Requiere Reagendar'
                },
                position: { x: 400, y: 300 },
            },
            {
                id: 'stage-reschedule',
                type: 'stage',
                data: {
                    label: 'Mover: Negociación',
                    status: 'negotiation'
                },
                position: { x: 400, y: 400 },
            },
            {
                id: 'alert-agent',
                type: 'action',
                data: {
                    label: 'Avisar Equipo',
                    actionType: 'notification', // Hypothetical internal notification
                    message: 'Cliente {{contact.name}} necesita reagendar cita.'
                },
                position: { x: 400, y: 500 },
            }
        ],
        edges: [
            { id: 'e1', source: 'trigger-time', target: 'btn-confirm' },
            { id: 'e2', source: 'btn-confirm', target: 'tag-confirmed', sourceHandle: 'yes' },
            { id: 'e3', source: 'btn-confirm', target: 'tag-reschedule', sourceHandle: 'no' },
            { id: 'e4', source: 'tag-confirmed', target: 'msg-thanks' },
            { id: 'e5', source: 'tag-reschedule', target: 'stage-reschedule' },
            { id: 'e6', source: 'stage-reschedule', target: 'alert-agent' }
        ]
    },

    // Template 3: Lead Nurturing & Enrichment
    {
        id: 'lead-enrichment-advanced',
        name: '🕵️ Enriquecimiento de Leads Avanzado',
        description: 'Investiga el email del lead, clasifica si es B2B o B2C, y personaliza la bienvenida.',
        category: 'marketing',
        requiredIntegrations: ['http', 'crm', 'openai'],
        estimatedSetupTime: '8 minutos',
        tags: ['enrichment', 'api', 'segmentation'],
        difficulty: 'advanced',
        nodes: [
            {
                id: 'trigger-new-lead',
                type: 'trigger',
                data: {
                    label: 'Nuevo Lead',
                    triggerType: 'crm_event',
                    event: 'lead_created'
                },
                position: { x: 300, y: 50 },
            },
            {
                id: 'http-enrich',
                type: 'http',
                data: {
                    label: 'Enrichment API',
                    method: 'GET',
                    url: 'https://api.enrichment.io/v1/person?email={{lead.email}}'
                },
                position: { x: 300, y: 150 },
            },
            {
                id: 'ai-classifier',
                type: 'ai_agent',
                data: {
                    label: 'Clasificador IA',
                    model: 'gpt-4',
                    prompt: 'Analiza este JSON y dime si es B2B o B2C: {{http.response}}'
                },
                position: { x: 300, y: 250 },
            },
            // Branching based on AI or Condition (Simplified as Condition here)
            {
                id: 'cond-b2b',
                type: 'condition', // Using condition but conceptually relying on AI output
                data: {
                    label: 'Es B2B?',
                    conditions: [{ variable: 'ai_agent.output', operator: 'contains', value: 'B2B' }]
                },
                position: { x: 300, y: 350 },
            },
            {
                id: 'tag-b2b',
                type: 'tag',
                data: { label: 'Tag: B2B', action: 'add', tagName: 'B2B' },
                position: { x: 150, y: 450 },
            },
            {
                id: 'tag-b2c',
                type: 'tag',
                data: { label: 'Tag: B2C', action: 'add', tagName: 'B2C' },
                position: { x: 450, y: 450 },
            },
            {
                id: 'email-welcome',
                type: 'action',
                data: {
                    label: 'Email Personalizado',
                    actionType: 'send_email',
                    subject: 'Bienvenido a la plataforma',
                    body: 'Hola! Vimos que eres {{ai_agent.output}}...'
                },
                position: { x: 300, y: 600 },
            }
        ],
        edges: [
            { id: 'e1', source: 'trigger-new-lead', target: 'http-enrich' },
            { id: 'e2', source: 'http-enrich', target: 'ai-classifier' },
            { id: 'e3', source: 'ai-classifier', target: 'cond-b2b' },
            { id: 'e4', source: 'cond-b2b', target: 'tag-b2b', label: 'True' },
            { id: 'e5', source: 'cond-b2b', target: 'tag-b2c', label: 'False' },
            { id: 'e6', source: 'tag-b2b', target: 'email-welcome' },
            { id: 'e7', source: 'tag-b2c', target: 'email-welcome' }
        ]
    }
];
