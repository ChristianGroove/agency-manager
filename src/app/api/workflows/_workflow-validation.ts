import type { WorkflowDefinition, WorkflowEdge, WorkflowNode } from '@/modules/features/automation/engine'

const MAX_WORKFLOW_NODES = 100
const MAX_WORKFLOW_EDGES = 200
const MAX_WORKFLOW_JSON_LENGTH = 100_000
const MAX_TEST_DATA_JSON_LENGTH = 20_000

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getJsonLength(value: unknown) {
    try {
        return JSON.stringify(value).length
    } catch {
        return Infinity
    }
}

export function validateWorkflowDefinition(value: unknown): { workflowDefinition: WorkflowDefinition } | { error: string } {
    if (!isRecord(value)) {
        return { error: 'Workflow definition must be an object' }
    }

    if (getJsonLength(value) > MAX_WORKFLOW_JSON_LENGTH) {
        return { error: 'Workflow definition is too large' }
    }

    const nodes = value.nodes
    const edges = value.edges

    if (!Array.isArray(nodes)) {
        return { error: 'Workflow definition nodes must be an array' }
    }

    if (!Array.isArray(edges)) {
        return { error: 'Workflow definition edges must be an array' }
    }

    if (nodes.length > MAX_WORKFLOW_NODES) {
        return { error: `Workflow definition cannot exceed ${MAX_WORKFLOW_NODES} nodes` }
    }

    if (edges.length > MAX_WORKFLOW_EDGES) {
        return { error: `Workflow definition cannot exceed ${MAX_WORKFLOW_EDGES} edges` }
    }

    const invalidNode = nodes.find((node): node is unknown => (
        !isRecord(node) ||
        typeof node.id !== 'string' ||
        !node.id.trim() ||
        typeof node.type !== 'string' ||
        !node.type.trim() ||
        !isRecord(node.data)
    ))

    if (invalidNode) {
        return { error: 'Workflow definition contains an invalid node' }
    }

    const invalidEdge = edges.find((edge): edge is unknown => (
        !isRecord(edge) ||
        typeof edge.source !== 'string' ||
        !edge.source.trim() ||
        typeof edge.target !== 'string' ||
        !edge.target.trim()
    ))

    if (invalidEdge) {
        return { error: 'Workflow definition contains an invalid edge' }
    }

    return {
        workflowDefinition: {
            ...value,
            nodes: nodes as WorkflowNode[],
            edges: edges as WorkflowEdge[],
        } as WorkflowDefinition
    }
}

export function validateWorkflowGraph(nodes: unknown, edges: unknown): { nodes: WorkflowNode[], edges: WorkflowEdge[] } | { error: string } {
    const validation = validateWorkflowDefinition({ nodes, edges: Array.isArray(edges) ? edges : [] })
    if ('error' in validation) return validation

    return {
        nodes: validation.workflowDefinition.nodes,
        edges: validation.workflowDefinition.edges,
    }
}

export function validateWorkflowTestData(value: unknown): { testData: Record<string, unknown> } | { error: string } {
    if (value === undefined || value === null) {
        return { testData: {} }
    }

    if (!isRecord(value)) {
        return { error: 'testData must be an object' }
    }

    if (getJsonLength(value) > MAX_TEST_DATA_JSON_LENGTH) {
        return { error: 'testData is too large' }
    }

    return { testData: value }
}
