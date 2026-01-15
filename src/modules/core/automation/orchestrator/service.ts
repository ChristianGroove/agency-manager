'use server';

import { OrchestratorResponseSchema, GeneratedNode, GeneratedEdge } from './schema';
import { validatePromptContext, checkOrchestratorRateLimit } from './context-guard';
import { getLayoutedElements } from '../utils/layout-utils';
import { Node, Edge } from '@xyflow/react';

export interface OrchestratorResult {
    success: boolean;
    workflow?: {
        name: string;
        description: string;
        nodes: Node[];
        edges: Edge[];
    };
    error?: string;
    reasoning?: string;
    rateLimitInfo?: {
        remaining: number;
        resetInSeconds: number;
    };
}

/**
 * Main orchestration function: Takes user prompt, generates complete workflow.
 */
export async function orchestrateWorkflow(
    organizationId: string,
    userPrompt: string
): Promise<OrchestratorResult> {

    // 1. Rate Limit Check
    const rateLimit = checkOrchestratorRateLimit(organizationId);
    if (!rateLimit.allowed) {
        return {
            success: false,
            error: `Has alcanzado el límite de generaciones. Intenta de nuevo en ${Math.ceil(rateLimit.resetInSeconds / 60)} minutos.`,
            rateLimitInfo: { remaining: 0, resetInSeconds: rateLimit.resetInSeconds }
        };
    }

    // 2. Context Validation (Security)
    const contextCheck = validatePromptContext(userPrompt);
    if (!contextCheck.valid) {
        return {
            success: false,
            error: contextCheck.reason,
            rateLimitInfo: { remaining: rateLimit.remaining, resetInSeconds: rateLimit.resetInSeconds }
        };
    }

    try {
        // 3. Call AI Engine
        const { AIEngine } = await import('@/modules/core/ai-engine/service');

        const response = await AIEngine.executeTask({
            organizationId,
            taskType: 'automation.orchestrate_workflow_v1',
            payload: {
                userPrompt: contextCheck.sanitizedPrompt
            }
        });

        // 4. Parse and Validate Response
        const parsed = OrchestratorResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            console.error('[Orchestrator] Schema validation failed:', parsed.error.issues);
            return {
                success: false,
                error: 'La IA generó una respuesta inválida. Intenta reformular tu descripción de forma más clara.',
                rateLimitInfo: { remaining: rateLimit.remaining, resetInSeconds: rateLimit.resetInSeconds }
            };
        }

        const aiResponse = parsed.data;

        // Check if AI reported an error
        if (!aiResponse.success || !aiResponse.workflow) {
            return {
                success: false,
                error: aiResponse.error || 'No se pudo generar el workflow.',
                rateLimitInfo: { remaining: rateLimit.remaining, resetInSeconds: rateLimit.resetInSeconds }
            };
        }

        // 5. Validate Workflow Logic
        const validationErrors = validateWorkflowLogic(aiResponse.workflow);
        if (validationErrors.length > 0) {
            return {
                success: false,
                error: validationErrors.join('. '),
                rateLimitInfo: { remaining: rateLimit.remaining, resetInSeconds: rateLimit.resetInSeconds }
            };
        }

        // 6. Transform to React Flow format with auto-layout
        const reactFlowNodes = transformNodesToReactFlow(aiResponse.workflow.nodes);
        const reactFlowEdges = transformEdgesToReactFlow(aiResponse.workflow.edges);

        // Apply auto-layout
        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            reactFlowNodes,
            reactFlowEdges
        );

        return {
            success: true,
            workflow: {
                name: aiResponse.workflow.name,
                description: aiResponse.workflow.description,
                nodes: layoutedNodes,
                edges: layoutedEdges,
            },
            reasoning: aiResponse.reasoning,
            rateLimitInfo: { remaining: rateLimit.remaining, resetInSeconds: rateLimit.resetInSeconds }
        };

    } catch (error) {
        console.error('[Orchestrator] Error:', error);
        return {
            success: false,
            error: 'Error al procesar tu solicitud. Intenta de nuevo.',
            rateLimitInfo: { remaining: rateLimit.remaining, resetInSeconds: rateLimit.resetInSeconds }
        };
    }
}

/**
 * Validates the logical consistency of the generated workflow.
 */
function validateWorkflowLogic(workflow: { nodes: GeneratedNode[]; edges: GeneratedEdge[] }): string[] {
    const errors: string[] = [];

    // Must have exactly one trigger
    const triggers = workflow.nodes.filter(n => n.type === 'trigger');
    if (triggers.length === 0) {
        errors.push('El flujo debe comenzar con un nodo Trigger');
    }
    if (triggers.length > 1) {
        errors.push('Solo puede haber un Trigger por flujo');
    }

    // All referenced nodes in edges must exist
    const nodeIds = new Set(workflow.nodes.map(n => n.id));
    for (const edge of workflow.edges) {
        if (!nodeIds.has(edge.source)) {
            errors.push(`Conexión inválida: origen '${edge.source}' no existe`);
        }
        if (!nodeIds.has(edge.target)) {
            errors.push(`Conexión inválida: destino '${edge.target}' no existe`);
        }
    }

    // All non-trigger nodes should be connected
    const connectedNodes = new Set<string>();
    connectedNodes.add(triggers[0]?.id); // Trigger is root
    for (const edge of workflow.edges) {
        connectedNodes.add(edge.target);
    }

    for (const node of workflow.nodes) {
        if (node.type !== 'trigger' && !connectedNodes.has(node.id)) {
            errors.push(`Nodo '${node.label}' no está conectado al flujo`);
        }
    }

    return errors;
}

/**
 * Transforms AI-generated nodes to React Flow format.
 */
function transformNodesToReactFlow(nodes: GeneratedNode[]): Node[] {
    return nodes.map((node, index) => ({
        id: node.id,
        type: node.type,
        position: { x: 0, y: index * 150 }, // Will be adjusted by layout
        data: {
            label: node.label,
            ...node.config,
        },
    }));
}

/**
 * Transforms AI-generated edges to React Flow format.
 */
function transformEdgesToReactFlow(edges: GeneratedEdge[]): Edge[] {
    return edges.map((edge, index) => ({
        id: `edge_${index + 1}`,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle || 'default',
        type: 'smoothstep',
        animated: true,
    }));
}
