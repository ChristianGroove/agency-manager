
export interface NodeExecutionResult {
    success: boolean;
    error?: string;
    suspended?: boolean;
    resumeAt?: Date;
    nextBranchId?: string; // For branching nodes like Buttons, AB Test, Wait
    output?: any; // Data to store in context
}

export interface WorkflowNodeData {
    [key: string]: unknown;
}

export interface WorkflowContext {
    [key: string]: unknown;
}
