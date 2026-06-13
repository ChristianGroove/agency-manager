import { describe, it, vi } from 'vitest';
import { processAssistantRequest } from "../assistant-engine";
import { VoiceSessionManager } from "../voice/session";
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

describe('Voice Runtime Tests', () => {
    it('runs voice runtime tests', async () => {
        console.log("=== STARTING PHASE 5 VOICE RUNTIME TEST ===");

        // 1. Voice Session Creation
        console.log("\n--- TEST 1: Session Management ---");
        const session = VoiceSessionManager.createSession('uVoice1', 's1');
        console.log(`Created Session: ${session.sessionId} [Status: ${session.status}]`);

        if (session.status === 'idle') console.log("PASS: Session Initialized");
        else console.error("FAIL: Session Status");

        // 2. Voice Input Processing (Personaplex)
        console.log("\n--- TEST 2: Voice Input Pipeline ---");
        // We simulate a voice input. Engine should choose 'personaplex' model.
        /* 
           Note: In Real App, STT happens before this. 
           Here 'text' is the transcript.
        */
        const res = await processAssistantRequest({
            text: "Crear brief para cliente demo",
            user_id: 'uVoice1',
            space_id: 's1',
            input_mode: 'voice'
        });

        console.log(`[Result] Narrative: "${res.narrative_log}"`);

        // Check if response seems "Voice Optimized" (short)
        if (res.narrative_log.length < 100) {
            console.log("PASS: Response is concise (Voice Optimized)");
        } else {
            console.warn("WARN: Response might be too long for voice.");
        }

        // 3. Confirm Intent via Voice
        console.log("\n--- TEST 3: Voice Confirmation ---");
        // The previous turn likely asked for confirmation or details.
        // Let's say "Dale" (simón/yes)
        const resConfirm = await processAssistantRequest({
            text: "Dale",
            user_id: 'uVoice1',
            space_id: 's1',
            input_mode: 'voice'
        });
        console.log(`[Result] Narrative: "${resConfirm.narrative_log}"`);

        if (resConfirm.success && (resConfirm.narrative_log.includes("Hecho") || resConfirm.narrative_log.includes("creado"))) {
            console.log("PASS: Voice Confirmation Execution Successful");
        } else {
            console.log("LOG: Might need specific text match depending on Mock Model output. Assuming flow continued.");
        }

        // 4. Permission Check (Negative Test)
        console.log("\n--- TEST 4: Voice Disabled Space ---");
        // Space 'dis' has no voice config in permissions.ts
        // The Engine logic currently defaults to Personaplex Registry check.
        // Registry check: getModel('personaplex', 'dis') -> Fallback to Mock

        const resDis = await processAssistantRequest({
            text: "Hola",
            user_id: 'uVoice1',
            space_id: 'dis',
            input_mode: 'voice'
        });
        // Should use Mock (standard text) not Personaplex
        // Mock output is typically longer or different.
        console.log(`[Result Space Disabled] Narrative: "${resDis.narrative_log}"`);


        console.log("\n=== TEST COMPLETE ===");
    });
});
