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
    private apiKey: string;
    private model: string = 'gpt-4o-mini';

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    }

    async getSuggestions(context: WorkflowContext): Promise<AISuggestion[]> {
        if (!this.apiKey) {
            console.warn('[AIAnalyzer] No API key, returning fallback suggestions');
            return this.getFallbackSuggestions(context);
        }

        try {
            const prompt = this.buildPrompt(context);
            const response = await this.callOpenAI(prompt);
            return this.parseSuggestions(response);
        } catch (error) {
            console.error('[AIAnalyzer] Error getting suggestions:', error);
            return this.getFallbackSuggestions(context);
        }
    }

    private buildPrompt(context: WorkflowContext): string {
        const { nodes, lastNode, variables } = context;

        // Describir el workflow actual
        const workflowDescription = nodes.map((node, i) => {
            return `${i + 1}. ${node.type} (${node.data.label || 'Sin nombre'})`;
        }).join('\n');

        const variablesDesc = variables.length > 0
            ? `Variables disponibles: ${variables.join(', ')}`
            : 'No hay variables en contexto aún';

        const lastNodeDesc = lastNode
            ? `Último nodo añadido: ${lastNode.type} (${lastNode.data.label || 'Sin nombre'})`
            : 'Workflow vacío';

        return `
Eres un experto en automatización de workflows para un CRM y plataforma de marketing.

Workflow actual:
${workflowDescription || 'Vacío (sin nodos)'}

${lastNodeDesc}

${variablesDesc}

Tipos de nodos disponibles:
- trigger: Punto de inicio del workflow
- http: Llamadas a APIs REST externas
- crm: Crear o actualizar leads/clientes en el CRM
- email: Enviar correos electrónicos (Resend)
- sms: Enviar mensajes SMS (Twilio)
- condition: Lógica condicional (if/else)
- action: Acciones genéricas

Contexto de negocio:
- Sistema CRM integrado
- Marketing automation
- Sales pipeline management
- Customer communication

Tarea: Sugiere los 3 próximos nodos más lógicos para continuar este workflow.
Para cada sugerencia, proporciona:
1. El tipo de nodo
2. Confianza (0-100)
3. Razón clara y concisa
4. Configuración sugerida (opcional)

Formato JSON:
{
  "suggestions": [
    {
      "nodeType": "email",
      "confidence": 92,
      "reasoning": "Enviar email de bienvenida al nuevo lead",
      "suggestedConfig": {
        "to": "{{lead.email}}",
        "subject": "¡Bienvenido!"
      }
    }
  ]
}

Responde SOLO con JSON válido.
        `.trim();
    }

    private async callOpenAI(prompt: string): Promise<string> {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'Eres un experto en automatización de workflows. Siempre respondes con JSON válido.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 800,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    private parseSuggestions(response: string): AISuggestion[] {
        try {
            const parsed = JSON.parse(response);
            const suggestions = parsed.suggestions || [];

            return suggestions.map((s: any) => ({
                nodeType: s.nodeType,
                confidence: s.confidence / 100, // Convert to 0-1
                reasoning: s.reasoning,
                suggestedConfig: s.suggestedConfig || {}
            })).slice(0, 3); // Max 3 suggestions
        } catch (error) {
            console.error('[AIAnalyzer] Error parsing suggestions:', error);
            return [];
        }
    }

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
