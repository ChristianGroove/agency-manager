/**
 * PIXY FLOWS MVP - TYPE DEFINITIONS
 * 
 * Domain language:
 * - Routine: A hired "virtual employee" (instance of a flow)
 * - Template: A job description (static definition)
 * - Step: A specific instruction in the routine
 * - Momento (Trigger): When to start
 * - Tarea (Action): What to do
 */

export type FlowStatus = 'active' | 'paused' | 'archived' | 'error';
export type StepType = 'trigger' | 'action' | 'wait' | 'rule';

// --- ENTITIES ---

export interface FlowTemplate {
    id: string;
    key: string; // 'payment_recovery'
    name: string; // 'Cobrador Amable'
    description: string;
    icon: string;
    category: 'sales' | 'retention' | 'operations';
    definition: RoutineDefinition; // Base structure
}

export interface FlowRoutine {
    id: string;
    organizationId: string;
    spaceId: string;
    templateId: string;

    name: string;
    status: FlowStatus;
    currentVersion: number;

    configuration: Record<string, any>; // User 'Mad Libs' inputs

    createdAt: string;
    updatedAt: string;
    lastRunAt?: string;
}

// --- DEFINITION (The DNA) ---

export interface RoutineDefinition {
    steps: FlowStep[];
}

export interface FlowStep {
    id: string; // uuid
    position: number; // 1, 2, 3...
    type: StepType;
    key: string; // 'wait_3_days', 'send_whatsapp'

    // Human-readable label for the Rail Editor
    label: string;
    description?: string;

    config: Record<string, any>;
}

// --- EXECUTION ENGINE ---

export interface ExecutionContext {
    routineId: string;
    spaceId: string;
    organizationId: string;

    // The business object that triggered the flow
    triggerPayload: {
        entityId: string;
        entityType: string; // 'invoice', 'client'
        [key: string]: any;
    };

    // Memory of previous steps
    memory: Record<string, any>;
}

export interface ExecutionIntent {
    routineId: string;
    executionId: string;
    stepToExecute: FlowStep;
    context: ExecutionContext;
}

export interface ExecutionResult {
    success: boolean;
    status: 'running' | 'completed' | 'failed';

    narrativeLog: string; // "Esperé 3 días"
    outputData?: any;

    shouldCreateNextIntent: boolean;
}
