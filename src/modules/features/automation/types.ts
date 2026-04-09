/**
 * Automation System Types
 */

export interface WorkflowNode {
    id: string
    type: string // 'trigger', 'action', 'condition', 'delay', etc.
    data: Record<string, unknown>
    position?: { x: number, y: number } // For UI only
}

export interface WorkflowEdge {
    id: string
    source: string
    target: string
    sourceHandle?: string | null
    targetHandle?: string | null
    label?: string
}

export interface WorkflowDefinition {
    nodes: WorkflowNode[]
    edges: WorkflowEdge[]
}

export interface WorkflowContext {
    [key: string]: unknown
}

export interface NodeExecutionResult {
    success: boolean
    suspended?: boolean
    error?: string
    results?: any
    output?: any
    nextBranchId?: string
}
