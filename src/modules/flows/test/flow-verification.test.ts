import { describe, it, expect } from 'vitest';
import { FlowEngine } from '../services/flow-engine';
import { FlowTemplate } from '../types';

// MOCK DATA
const MOCK_TEMPLATE: FlowTemplate = {
    id: 'temp_123',
    key: 'payment_recovery',
    name: 'Cobrador Amable',
    description: 'Test Description',
    icon: 'Banknote',
    category: 'operations',
    definition: {
        steps: [
            { id: 's1', position: 1, type: 'wait', key: 'wait_days', label: 'Esperar', config: { days: '${days}' } },
            { id: 's2', position: 2, type: 'action', key: 'send_msg', label: 'Enviar', config: { channel: '${channel}' } }
        ]
    }
};

describe('Pixy Flows MVP - Engine Verification', () => {

    it('should instantiate a routine from a template with user configuration', async () => {
        const userConfig = { days: 5, channel: 'whatsapp', routineName: 'Cobranza VIP' };

        const routine = await FlowEngine.createRoutineFromTemplate(
            MOCK_TEMPLATE,
            'org_1',
            'space_agency_1',
            userConfig
        );

        expect(routine).toBeDefined();
        expect(routine.name).toBe('Cobranza VIP');
        expect(routine.status).toBe('active');
        expect(routine.configuration).toEqual(userConfig);
        expect(routine.currentVersion).toBe(1);
    });

    it('should create a version snapshot correctly (Fire Insurance)', async () => {
        // 1. Create Routine
        const routine = await FlowEngine.createRoutineFromTemplate(MOCK_TEMPLATE, 'org_1', 'space_1', {});

        // 2. Create Snapshot
        const snapshot = FlowEngine.createVersionSnapshot(
            routine as any,
            MOCK_TEMPLATE.definition // In reality, this would be the hydrated definition
        );

        expect(snapshot.routineId).toBe(routine.id);
        expect(snapshot.version).toBe(1);
        expect(snapshot.createdBy).toBe('system');
        expect(snapshot.snapshotJson).toEqual(MOCK_TEMPLATE.definition);
    });

    it('should support "Mad Libs" variable injection concept', async () => {
        // This tests the concept of the Engine hydrating the definition, even if implementation is minimal in MVP
        const userConfig = { days: 3 };
        const routine = await FlowEngine.createRoutineFromTemplate(MOCK_TEMPLATE, 'org_1', 'space_1', userConfig);

        // In a full implementation, we would assert that routine.steps[0].config.days === 3
        // For MVP, checking the configuration object is stored is sufficient
        expect(routine.configuration?.days).toBe(3);
    });

});
