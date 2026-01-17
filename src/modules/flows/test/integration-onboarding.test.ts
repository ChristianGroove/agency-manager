import { describe, it, expect } from 'vitest';
import { FlowEngine } from '../services/flow-engine';

describe('Pixy Flows MVP - Integration Verification (Happy Path)', () => {

    it('should execute the Onboarding Flow (Trigger -> Engine -> Worker)', async () => {
        // 1. SETUP: Simulate an external event (Trigger)
        const triggerKey = 'new_client_signed';
        const payload = {
            clientId: 'client_777',
            clientName: 'Acme Corp',
            clientEmail: 'contact@acmecorp.com'
        };
        const spaceId = 'space_agency_main';

        // 2. ACT: The core system reacts to the event
        const results = await FlowEngine.processTrigger(triggerKey, payload, spaceId);

        // 3. ASSERT: The system did work
        expect(results).toHaveLength(1); // One action executed (Email)

        const emailResult = results[0];

        // Check Status
        expect(emailResult.success).toBe(true);
        expect(emailResult.status).toBe('completed');

        // Check Narrative (The "Virtual Employee" speaking)
        expect(emailResult.narrativeLog).toContain('Enviado email "Welcome Kit" a contact@acmecorp.com');

        // Check Output connection
        expect(emailResult.outputData).toBeDefined();
        expect(emailResult.shouldCreateNextIntent).toBe(true);
    });

    it('should ignore triggers with no active routines', async () => {
        const results = await FlowEngine.processTrigger('unknown_event', {}, 'space_1');
        expect(results).toHaveLength(0);
    });
});
