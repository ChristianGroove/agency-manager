import { WorkflowNode, WorkflowEdge } from './engine';

export interface WorkflowContext {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    lastNode: WorkflowNode | null;
    variables: string[];
}

export interface AISuggestion {
    nodeType: string;
    confidence: number; // 0-1
    reasoning: string;
    suggestedConfig?: Record<string, unknown>;
    icon?: string;
}

export class AIWorkflowAnalyzer {
    private organizationId: string;

    constructor(organizationId: string) {
        if (!organizationId) throw new Error("Organization ID required for AI Analysis");
        this.organizationId = organizationId;
    }

    async getSuggestions(context: WorkflowContext): Promise<AISuggestion[]> {
        try {
            // Use Central AI Engine
            const { AIEngine } = await import("@/modules/core/ai-engine/service");

            const response = await AIEngine.executeTask({
                organizationId: this.organizationId,
                taskType: 'automation.suggest_node_v1',
                payload: {
                    nodeCount: context.nodes.length,
                    lastNodeType: context.lastNode?.type || 'start',
                    lastNodeLabel: context.lastNode?.data?.label || '',
                    variables: context.variables
                }
            });

            // Parse response (Engine ensures JSONMode but we validate structure)
            const data = response.data as any;
            return (data.suggestions || []).map((s: any) => ({
                nodeType: s.nodeType,
                confidence: s.confidence / 100, // Normalize to 0-1
                reasoning: s.reasoning,
                suggestedConfig: s.suggestedConfig
            })).slice(0, 3);

        } catch (error) {
            console.error('[AIAnalyzer] Engine failed, using fallback:', error);
            return this.getFallbackSuggestions(context);
        }
    }

    // ... fallbacks kept for safety ...

    private getFallbackSuggestions(context: WorkflowContext): AISuggestion[] {
        const { nodes, lastNode } = context;

        // Si no hay nodos, sugerir trigger
        if (nodes.length === 0) {
            return [
                {
                    nodeType: 'trigger',
                    confidence: 1.0,
                    reasoning: 'Comienza tu workflow con un trigger para definir cuándo se ejecuta'
                }
            ];
        }

        // Sugerencias basadas en el último nodo
        const lastType = lastNode?.type;

        switch (lastType) {
            case 'trigger':
                return [
                    {
                        nodeType: 'http',
                        confidence: 0.8,
                        reasoning: 'Obtener datos de una API externa',
                        suggestedConfig: { method: 'GET' }
                    },
                    {
                        nodeType: 'crm',
                        confidence: 0.85,
                        reasoning: 'Crear un nuevo lead en el CRM',
                        suggestedConfig: { actionType: 'create_lead' }
                    },
                    {
                        nodeType: 'condition',
                        confidence: 0.7,
                        reasoning: 'Validar datos antes de continuar'
                    }
                ];

            case 'http':
                return [
                    {
                        nodeType: 'crm',
                        confidence: 0.9,
                        reasoning: 'Guardar los datos obtenidos de la API en el CRM'
                    },
                    {
                        nodeType: 'condition',
                        confidence: 0.85,
                        reasoning: 'Verificar si la respuesta de la API fue exitosa'
                    },
                    {
                        nodeType: 'email',
                        confidence: 0.75,
                        reasoning: 'Notificar por email sobre los datos obtenidos'
                    }
                ];

            case 'crm':
                return [
                    {
                        nodeType: 'email',
                        confidence: 0.9,
                        reasoning: 'Enviar email de bienvenida al nuevo lead',
                        suggestedConfig: {
                            to: '{{lead.email}}',
                            subject: 'Bienvenido'
                        }
                    },
                    {
                        nodeType: 'sms',
                        confidence: 0.8,
                        reasoning: 'Enviar SMS de confirmación',
                        suggestedConfig: {
                            to: '{{lead.phone}}'
                        }
                    },
                    {
                        nodeType: 'http',
                        confidence: 0.7,
                        reasoning: 'Notificar a sistemas externos sobre el nuevo lead'
                    }
                ];

            case 'email':
            case 'sms':
                return [
                    {
                        nodeType: 'condition',
                        confidence: 0.8,
                        reasoning: 'Verificar si el mensaje fue enviado exitosamente'
                    },
                    {
                        nodeType: 'crm',
                        confidence: 0.75,
                        reasoning: 'Actualizar el estado del lead después del contacto'
                    },
                    {
                        nodeType: 'http',
                        confidence: 0.7,
                        reasoning: 'Registrar la interacción en un sistema externo'
                    }
                ];

            default:
                return [
                    {
                        nodeType: 'email',
                        confidence: 0.7,
                        reasoning: 'Enviar notificación por email'
                    },
                    {
                        nodeType: 'crm',
                        confidence: 0.7,
                        reasoning: 'Actualizar datos en el CRM'
                    },
                    {
                        nodeType: 'http',
                        confidence: 0.6,
                        reasoning: 'Integrar con servicios externos'
                    }
                ];
        }
    }

    private extractVariables(nodes: WorkflowNode[]): string[] {
        const variables = new Set<string>();

        nodes.forEach(node => {
            // Extract from common data fields
            Object.entries(node.data).forEach(([key, value]) => {
                if (typeof value === 'string') {
                    const matches = value.matchAll(/\{\{([^}]+)\}\}/g);
                    for (const match of matches) {
                        variables.add(match[1]);
                    }
                }
            });
        });

        return Array.from(variables);
    }
}
