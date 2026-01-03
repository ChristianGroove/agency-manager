import { WorkflowTemplate } from './types';

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
    // Template 1: Lead Scoring Automático
    {
        id: 'lead-scoring-auto',
        name: 'Lead Scoring Automático',
        description: 'Califica leads automáticamente según email corporativo y actualiza el score en CRM',
        category: 'sales',
        requiredIntegrations: ['crm', 'webhook'],
        estimatedSetupTime: '5 minutos',
        tags: ['scoring', 'leads', 'automation'],
        difficulty: 'beginner',
        nodes: [
            {
                id: 'trigger-1',
                type: 'trigger',
                data: {
                    label: 'Nuevo Lead (Webhook)',
                    triggerType: 'webhook',
                    description: 'Se activa cuando llega un nuevo lead',
                },
                position: { x: 100, y: 100 },
            },
            {
                id: 'condition-1',
                type: 'condition',
                data: {
                    label: 'Email corporativo?',
                    logic: 'ALL',
                    conditions: [
                        {
                            variable: 'lead.email',
                            operator: 'contains',
                            value: '@',
                        },
                    ],
                },
                position: { x: 100, y: 200 },
            },
            {
                id: 'crm-high',
                type: 'crm',
                data: {
                    label: 'Score Alto (+50)',
                    actionType: 'update_lead',
                    field: 'score',
                    value: '+50',
                },
                position: { x: 50, y: 320 },
            },
            {
                id: 'crm-low',
                type: 'crm',
                data: {
                    label: 'Score Bajo (+10)',
                    actionType: 'update_lead',
                    field: 'score',
                    value: '+10',
                },
                position: { x: 250, y: 320 },
            },
        ],
        edges: [
            { id: 'e1', source: 'trigger-1', target: 'condition-1' },
            { id: 'e2', source: 'condition-1', target: 'crm-high', label: 'True' },
            { id: 'e3', source: 'condition-1', target: 'crm-low', label: 'False' },
        ],
    },

    // Template 2: Welcome Email Sequence
    {
        id: 'welcome-sequence',
        name: 'Secuencia de Bienvenida',
        description: 'Serie de emails de bienvenida automática con delays y seguimiento',
        category: 'marketing',
        requiredIntegrations: ['email', 'crm'],
        estimatedSetupTime: '8 minutos',
        tags: ['email', 'onboarding', 'nurture'],
        difficulty: 'intermediate',
        nodes: [
            {
                id: 'trigger-1',
                type: 'trigger',
                data: {
                    label: 'Nuevo Lead',
                    triggerType: 'webhook',
                },
                position: { x: 100, y: 50 },
            },
            {
                id: 'email-1',
                type: 'email',
                data: {
                    label: 'Email de Bienvenida',
                    to: '{{lead.email}}',
                    subject: '¡Bienvenido a {{company.name}}!',
                    body: 'Hola {{lead.name}}, gracias por unirte...',
                },
                position: { x: 100, y: 150 },
            },
            {
                id: 'email-2',
                type: 'email',
                data: {
                    label: 'Recursos Útiles',
                    to: '{{lead.email}}',
                    subject: 'Recursos para comenzar',
                    body: 'Aquí tienes algunos recursos...',
                },
                position: { x: 100, y: 250 },
            },
            {
                id: 'condition-1',
                type: 'condition',
                data: {
                    label: 'Abrió emails?',
                    logic: 'ANY',
                    conditions: [
                        {
                            variable: 'email.opened',
                            operator: '==',
                            value: 'true',
                        },
                    ],
                },
                position: { x: 100, y: 350 },
            },
            {
                id: 'crm-engaged',
                type: 'crm',
                data: {
                    label: 'Tag: Engaged',
                    actionType: 'update_lead',
                    field: 'tags',
                    value: 'engaged',
                },
                position: { x: 50, y: 470 },
            },
            {
                id: 'email-reeng',
                type: 'email',
                data: {
                    label: 'Re-engagement',
                    to: '{{lead.email}}',
                    subject: '¿Necesitas ayuda?',
                },
                position: { x: 250, y: 470 },
            },
        ],
        edges: [
            { id: 'e1', source: 'trigger-1', target: 'email-1' },
            { id: 'e2', source: 'email-1', target: 'email-2' },
            { id: 'e3', source: 'email-2', target: 'condition-1' },
            { id: 'e4', source: 'condition-1', target: 'crm-engaged', label: 'True' },
            { id: 'e5', source: 'condition-1', target: 'email-reeng', label: 'False' },
        ],
    },

    // Template 3: Support Ticket Auto-Assignment
    {
        id: 'support-auto-assign',
        name: 'Asignación Automática de Tickets',
        description: 'Asigna tickets a agentes según prioridad y notifica por SMS',
        category: 'support',
        requiredIntegrations: ['crm', 'sms'],
        estimatedSetupTime: '6 minutos',
        tags: ['support', 'tickets', 'assignment'],
        difficulty: 'intermediate',
        nodes: [
            {
                id: 'trigger-1',
                type: 'trigger',
                data: {
                    label: 'Nuevo Ticket',
                    triggerType: 'webhook',
                },
                position: { x: 150, y: 50 },
            },
            {
                id: 'condition-1',
                type: 'condition',
                data: {
                    label: 'Prioridad Alta?',
                    logic: 'ALL',
                    conditions: [
                        {
                            variable: 'ticket.priority',
                            operator: '==',
                            value: 'high',
                        },
                    ],
                },
                position: { x: 150, y: 150 },
            },
            {
                id: 'crm-senior',
                type: 'crm',
                data: {
                    label: 'Asignar a Senior',
                    actionType: 'assign_ticket',
                    assignee: 'senior_support',
                },
                position: { x: 50, y: 270 },
            },
            {
                id: 'crm-junior',
                type: 'crm',
                data: {
                    label: 'Asignar a Junior',
                    actionType: 'assign_ticket',
                    assignee: 'junior_support',
                },
                position: { x: 250, y: 270 },
            },
            {
                id: 'sms-1',
                type: 'sms',
                data: {
                    label: 'Notificar Agente',
                    to: '{{assigned.phone}}',
                    message: 'Nuevo ticket #{{ticket.id}} asignado',
                },
                position: { x: 150, y: 390 },
            },
        ],
        edges: [
            { id: 'e1', source: 'trigger-1', target: 'condition-1' },
            { id: 'e2', source: 'condition-1', target: 'crm-senior', label: 'True' },
            { id: 'e3', source: 'condition-1', target: 'crm-junior', label: 'False' },
            { id: 'e4', source: 'crm-senior', target: 'sms-1' },
            { id: 'e5', source: 'crm-junior', target: 'sms-1' },
        ],
    },

    // Template 4: Task Follow-up
    {
        id: 'task-followup',
        name: 'Recordatorios de Tareas',
        description: 'Sistema automático de recordatorios para tareas pendientes',
        category: 'internal',
        requiredIntegrations: ['email', 'sms'],
        estimatedSetupTime: '7 minutos',
        tags: ['tasks', 'reminders', 'productivity'],
        difficulty: 'beginner',
        nodes: [
            {
                id: 'trigger-1',
                type: 'trigger',
                data: {
                    label: 'Tarea Creada',
                    triggerType: 'webhook',
                },
                position: { x: 100, y: 50 },
            },
            {
                id: 'condition-1',
                type: 'condition',
                data: {
                    label: 'Tarea completada?',
                    logic: 'ALL',
                    conditions: [
                        {
                            variable: 'task.status',
                            operator: '==',
                            value: 'completed',
                        },
                    ],
                },
                position: { x: 100, y: 150 },
            },
            {
                id: 'email-1',
                type: 'email',
                data: {
                    label: 'Reminder Email',
                    to: '{{task.assigned_to}}',
                    subject: 'Recordatorio: Tarea pendiente',
                },
                position: { x: 200, y: 270 },
            },
            {
                id: 'sms-1',
                type: 'sms',
                data: {
                    label: 'Urgente SMS',
                    to: '{{user.phone}}',
                    message: 'Tarea urgente pendiente',
                },
                position: { x: 200, y: 390 },
            },
        ],
        edges: [
            { id: 'e1', source: 'trigger-1', target: 'condition-1' },
            { id: 'e2', source: 'condition-1', target: 'email-1', label: 'False' },
            { id: 'e3', source: 'email-1', target: 'sms-1' },
        ],
    },

    // Template 5: Lead Enrichment
    {
        id: 'lead-enrichment',
        name: 'Enriquecimiento de Leads',
        description: 'Enriquece leads con datos externos y segmenta automáticamente',
        category: 'sales',
        requiredIntegrations: ['http', 'crm', 'email'],
        estimatedSetupTime: '10 minutos',
        tags: ['enrichment', 'api', 'segmentation'],
        difficulty: 'advanced',
        nodes: [
            {
                id: 'trigger-1',
                type: 'trigger',
                data: {
                    label: 'Nuevo Lead',
                    triggerType: 'webhook',
                },
                position: { x: 150, y: 50 },
            },
            {
                id: 'http-1',
                type: 'http',
                data: {
                    label: 'Clearbit Enrichment',
                    method: 'GET',
                    url: 'https://api.clearbit.com/v2/people/find?email={{lead.email}}',
                    headers: { Authorization: 'Bearer {{clearbit_api_key}}' },
                },
                position: { x: 150, y: 150 },
            },
            {
                id: 'condition-1',
                type: 'condition',
                data: {
                    label: 'Empresa grande?',
                    logic: 'ALL',
                    conditions: [
                        {
                            variable: 'http_response.company.employees',
                            operator: '>',
                            value: '100',
                        },
                    ],
                },
                position: { x: 150, y: 270 },
            },
            {
                id: 'crm-enterprise',
                type: 'crm',
                data: {
                    label: 'Tag: Enterprise',
                    actionType: 'update_lead',
                    field: 'segment',
                    value: 'enterprise',
                },
                position: { x: 50, y: 390 },
            },
            {
                id: 'crm-smb',
                type: 'crm',
                data: {
                    label: 'Tag: SMB',
                    actionType: 'update_lead',
                    field: 'segment',
                    value: 'smb',
                },
                position: { x: 250, y: 390 },
            },
            {
                id: 'email-1',
                type: 'email',
                data: {
                    label: 'Email Personalizado',
                    to: '{{lead.email}}',
                    subject: 'Bienvenido {{lead.company}}',
                },
                position: { x: 150, y: 510 },
            },
        ],
        edges: [
            { id: 'e1', source: 'trigger-1', target: 'http-1' },
            { id: 'e2', source: 'http-1', target: 'condition-1' },
            { id: 'e3', source: 'condition-1', target: 'crm-enterprise', label: 'True' },
            { id: 'e4', source: 'condition-1', target: 'crm-smb', label: 'False' },
            { id: 'e5', source: 'crm-enterprise', target: 'email-1' },
            { id: 'e6', source: 'crm-smb', target: 'email-1' },
        ],
    },
];
