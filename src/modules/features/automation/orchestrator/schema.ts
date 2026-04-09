import { z } from 'zod';

// Tipos de nodos permitidos
export const NodeTypeEnum = z.enum([
    'trigger', 'action', 'condition', 'wait', 'wait_input',
    'crm', 'email', 'sms', 'http', 'ai_agent', 'ab_test',
    'billing', 'notification', 'variable', 'buttons', 'tag', 'stage'
]);

// Configuraciones específicas por tipo de nodo
export const TriggerConfigSchema = z.object({
    triggerType: z.enum(['webhook', 'first_contact', 'keyword', 'business_hours', 'outside_hours', 'media_received']),
    channels: z.array(z.string()).optional(),
    keyword: z.string().optional(),
});

export const ActionConfigSchema = z.object({
    message: z.string().min(1),
    useTemplate: z.boolean().optional(),
});

export const ConditionConfigSchema = z.object({
    field: z.string(),
    operator: z.enum(['==', '!=', 'contains', '>', '<', '>=', '<=']),
    value: z.string(),
});

export const WaitConfigSchema = z.object({
    duration: z.number().positive(),
    unit: z.enum(['seconds', 'minutes', 'hours', 'days']),
});

export const WaitInputConfigSchema = z.object({
    timeout: z.number().positive(),
    unit: z.enum(['minutes', 'hours']),
    variableName: z.string().optional(),
});

export const CRMConfigSchema = z.object({
    actionType: z.enum(['create_lead', 'update_lead', 'add_tag', 'update_stage']),
    tag: z.string().optional(),
    stage: z.string().optional(),
});

export const EmailConfigSchema = z.object({
    to: z.string(),
    subject: z.string(),
    body: z.string(),
});

export const SMSConfigSchema = z.object({
    to: z.string(),
    body: z.string(),
});

export const HTTPConfigSchema = z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
    url: z.string().url(),
    headers: z.record(z.string(), z.string()).optional(),
    body: z.string().optional(),
});

export const AIAgentConfigSchema = z.object({
    model: z.enum(['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']),
    prompt: z.string().min(1),
    outputVariable: z.string(),
});

export const ABTestConfigSchema = z.object({
    variants: z.array(z.object({
        name: z.string(),
        weight: z.number().min(0).max(100),
    })).min(2),
});

export const BillingConfigSchema = z.object({
    actionType: z.enum(['create_invoice', 'create_quote', 'send_quote']),
    items: z.array(z.object({
        description: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
    })).optional(),
});

export const NotificationConfigSchema = z.object({
    title: z.string(),
    message: z.string(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
});

export const VariableConfigSchema = z.object({
    actionType: z.enum(['set', 'math']),
    targetVar: z.string(),
    value: z.string().optional(),
    operator: z.enum(['+', '-', '*', '/']).optional(),
    operand1: z.string().optional(),
    operand2: z.string().optional(),
});

export const ButtonsConfigSchema = z.object({
    body: z.string(),
    buttons: z.array(z.object({
        title: z.string().max(20),
    })).max(3),
});

// Schema de un nodo generado por la IA
export const GeneratedNodeSchema = z.object({
    id: z.string().regex(/^node_\d+$/),
    type: NodeTypeEnum,
    label: z.string().max(50),
    config: z.record(z.string(), z.unknown()),
});

// Schema de una conexión (edge)
export const GeneratedEdgeSchema = z.object({
    source: z.string(),
    target: z.string(),
    sourceHandle: z.enum(['default', 'yes', 'no', 'a', 'b', 'c']).optional(),
});

// Schema de respuesta completa de la IA
export const OrchestratorResponseSchema = z.object({
    success: z.boolean(),
    workflow: z.object({
        name: z.string().max(100),
        description: z.string().max(500),
        nodes: z.array(GeneratedNodeSchema).min(1).max(20),
        edges: z.array(GeneratedEdgeSchema),
    }).optional(),
    error: z.string().optional(),
    reasoning: z.string().optional(),
});

export type OrchestratorResponse = z.infer<typeof OrchestratorResponseSchema>;
export type GeneratedNode = z.infer<typeof GeneratedNodeSchema>;
export type GeneratedEdge = z.infer<typeof GeneratedEdgeSchema>;
