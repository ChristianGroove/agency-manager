import { describe, it, vi } from 'vitest';
import { processAssistantRequest } from "../assistant-engine";
import { getModel } from "../models/model-registry";

vi.mock('next/headers', () => ({
    headers: vi.fn(() => new Map()),
    cookies: vi.fn(() => new Map()),
}));

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(async () => ({
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        auth: { getUser: vi.fn(async () => ({ data: { user: { id: "mock-user" } } })) },
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(async () => ({ data: null, error: null })),
        maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        rpc: vi.fn(async () => ({ data: null, error: null }))
    }))
}));

vi.mock('@/modules/core/database/supabase', () => ({
    supabase: {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(async () => ({ data: null, error: null })),
        maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        rpc: vi.fn(async () => ({ data: null, error: null }))
    }
}));

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: vi.fn(async () => 'mock-org-id')
}));

vi.mock('@/modules/core/iam/services/platform-roles', () => ({
    requireSuperAdmin: vi.fn(async () => {}),
    isSuperAdmin: vi.fn(async () => true)
}));

vi.mock('@/modules/core/iam/services/org-roles', () => ({
    requireOrgRole: vi.fn(async () => {})
}));

describe('Model Adapter Tests', () => {
    it('runs model adapter tests', async () => {
        console.log("=== STARTING PHASE 3.5 MODEL ADAPTER TEST ===");

        // 1. Verify Model Integrity
        const model = getModel('mock');
        console.log(`[Test] Loaded Model ID: ${model.id}`);

        // 2. Direct Model Query (Unit Test)
        const output = await model.generateResponse({
            message: "Crear brief para cliente demo",
            space_id: "test",
            organization_id: "test",
            context: { allowedActions: [] }
        });

        console.log(`[Test] Direct Output: ${output.text}`);
        if (output.suggestedAction?.type !== 'create_brief') {
            console.error("FAIL: Model did not suggest CREATE_BRIEF");
        } else {
            console.log("PASS: Model suggested CREATE_BRIEF");
        }

        // 3. Engine Integration (Integration Test)
        // Should behave exactly like before, but logs should show "Asking Model..."
        console.log("\n--- ENGINE INTEGRATION ---");
        const res = await processAssistantRequest({ text: "Crear brief para cliente demo", user_id: 'uM1', space_id: 's1' });
        console.log(`[Result] ${res.narrative_log}`);

        if (res.narrative_log.includes("Confirmas")) {
            console.log("PASS: Engine correctly processed Model Suggestion -> Confirmation Flow");
        } else {
            console.error("FAIL: Engine flow broken.");
        }

        console.log("\n=== TEST COMPLETE ===");
    });
});
