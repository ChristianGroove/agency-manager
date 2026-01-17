import { FlowRoutine, FlowTemplate, RoutineDefinition } from '../types';

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
}
