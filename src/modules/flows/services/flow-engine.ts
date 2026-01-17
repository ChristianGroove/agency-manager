import { FlowRoutine, FlowTemplate, RoutineDefinition, ExecutionIntent, FlowStep, ExecutionResult } from '../types';
import { FlowWorker } from './flow-worker';

/**
 * FLOW ENGINE (The Brain)
 * Responsibilities:
 * 1. Instantiate Routines from Templates (Hiring the employee)
 * 2. Version Control (Fire insurance)
 * 3. Intention Generation (Deciding what to do, not doing it)
 */

export class FlowEngine {

    // 1. INSTANTIATION: The "Hiring" Process
    static async createRoutineFromTemplate(
        template: FlowTemplate,
        orgId: string,
        spaceId: string,
        userConfig: Record<string, any> // The "Mad Libs" answers
    ): Promise<Partial<FlowRoutine>> {

        // Merge template definition with user config
        // In v1, this largely means injecting variables into step configs
        const configuredDefinition = this.hydrateDefinition(template.definition, userConfig);

        return {
            organizationId: orgId,
            spaceId: spaceId,
            templateId: template.id,
            name: userConfig.routineName || template.name, // "Cobrador Amable"
            status: 'active', // Active by default in MVP
            currentVersion: 1,
            configuration: userConfig,
            // In a real DB call, we would save 'configuredDefinition' to flow_routine_versions
        };
    }

    // 2. VERSIONING: The "Snapshot"
    static createVersionSnapshot(routine: FlowRoutine, definition: RoutineDefinition) {
        return {
            routineId: routine.id,
            version: routine.currentVersion,
            snapshotJson: definition,
            createdAt: new Date().toISOString(),
            createdBy: 'system', // or the user ID
        };
    }

    // Helper: Injects user answers into the static template (e.g. replacing variables)
    private static hydrateDefinition(
        baseDef: RoutineDefinition,
        config: Record<string, any>
    ): RoutineDefinition {
        // Deep clone to avoid mutating the template
        const newDef = JSON.parse(JSON.stringify(baseDef));

        // Simple variable substitution strategy
        // In reality, this would recursively traverse the JSON
        // For MVP, we presume steps consume 'config' directly at runtime, 
        // but we might hardcode critical values here.

        return newDef;
    }

    // 3. ROLLBACK: The "Undo" Button (AC 2.4)
    static async restoreRoutineVersion(
        routineId: string,
        targetVersion: number,
        // In real app, we would inject specific repos or DB adapters here
    ): Promise<Partial<FlowRoutine>> {
        // 1. Fetch the snapshot for 'targetVersion' from flow_routine_versions
        // const snapshot = db.find(v => v.routineId === routineId && v.version === targetVersion)

        // MOCK LOGIC FOR MVP
        // In a real implementation:
        // const snapshot = await db.flow_routine_versions.find({ routineId, version: targetVersion });
        // const newVersion = (await db.flow_routines.getCurrentVersion(routineId)) + 1;

        return {
            id: routineId,
            currentVersion: targetVersion + 1, // Moving forward by looking back
            // configuration: snapshot.config ...
        };
    }

    // 6. LIFE CONTROLS (Phase 7)
    // Enforces that dead employees don't work.
    static async updateStatus(routineId: string, status: 'active' | 'paused' | 'archived') {
        console.log(`[Engine] Setting routine ${routineId} to ${status}`);
        // MOCK DB UPDATE
        // db.update(routines).set({ status }).where(eq(routines.id, routineId))
        return { success: true, newStatus: status };
    }

    // 4. RUNTIME: Processing Triggers (The "Wake Up" Call)
    static async processTrigger(
        triggerKey: string,
        payload: any,
        spaceId: string
    ): Promise<ExecutionResult[]> {
        console.log(`[Engine] Processing trigger "${triggerKey}" for Space ${spaceId}`);

        // 1. FIND ROUTINES (Mock DB Lookup)
        // In real life: Select * from flow_routines where space_id = spaceId AND status = 'active'
        // AND template definition includes a first step with key == triggerKey

        // MOCK: matching a routine for 'new_client_signed'
        const mockMatchingRoutine: any = {
            id: 'routine_onboarding_1',
            spaceId,
            status: 'active', // <--- CHECK THIS IN DB
            definition: {
                steps: [
                    { id: 's1', type: 'trigger', key: 'new_client_signed', label: 'Start' },
                    { id: 's2', type: 'action', key: 'send_welcome_kit', label: 'Email', config: { channel: 'email' } },
                    { id: 's3', type: 'action', key: 'create_drive_folder', label: 'Drive', config: {} }
                ]
            }
        };

        // PHASE 7 CHECK: Life or Death
        if (mockMatchingRoutine.status !== 'active') {
            console.warn(`[Engine] Routine ${mockMatchingRoutine.id} is ${mockMatchingRoutine.status}. Ignoring trigger.`);
            return [];
        }

        if (triggerKey !== 'new_client_signed') return [];

        // 2. CREATE EXECUTION INTENT (For the FIRST action after the trigger)
        // We skip the trigger step itself (it just happened) and look for Step 2
        const firstActionStep = mockMatchingRoutine.definition.steps[1];

        const intent: ExecutionIntent = {
            routineId: mockMatchingRoutine.id,
            executionId: `exec_${Date.now()}`,
            stepToExecute: firstActionStep,
            context: {
                routineId: mockMatchingRoutine.id,
                spaceId,
                organizationId: 'org_1',
                triggerPayload: payload,
                memory: {}
            }
        };

        // 3. DELEGATE TO WORKER
        const result = await FlowWorker.execute(intent);

        // 4. CHAINING (Simplified for MVP Happy Path)
        // If successful, we would technically find the NEXT step (s3) and execute it too.
        // For this demo, let's just return the first result.

        return [result];
    }

    // 5. OBSERVABILITY: The "Logbook" (Phase 6)
    static async getRecentExecutions(routineId: string): Promise<ExecutionResult[]> {
        // MOCK: In real DB -> Select * from flow_executions where routine_id = routineId order by started_at desc limit 10

        return [
            {
                success: true,
                status: 'completed',
                narrativeLog: 'Ejecutado exitosamente: Enviado email "Welcome Kit" a cliente@demo.com',
                shouldCreateNextIntent: false
            },
            {
                success: true,
                status: 'completed',
                narrativeLog: 'Ejecutado exitosamente: Carpeta "Clientes/Demo" creada en Drive',
                shouldCreateNextIntent: false
            }
        ];
    }
}
