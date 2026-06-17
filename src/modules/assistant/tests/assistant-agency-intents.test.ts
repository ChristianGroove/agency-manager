
import { resolveAssistantContext } from "../context-resolver";
import { processAssistantRequest } from "../assistant-engine";
import { SYSTEM_INTENTS } from "../intent-registry";
import { vi, describe, it, expect } from 'vitest';

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(async () => ({
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null })
        }
    }))
}));

vi.mock('@/modules/core/database/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null })
        }
    }
}));

vi.mock('@/modules/core/iam/services/platform-roles', () => ({
    requireSuperAdmin: vi.fn().mockResolvedValue(null),
    isSuperAdmin: vi.fn().mockResolvedValue(true)
}));

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: vi.fn().mockResolvedValue('test-org-id')
}));

vi.mock('@/modules/core/iam/services/org-roles', () => ({
    requireOrgRole: vi.fn().mockResolvedValue(null)
}));

describe('Phase 1 Assistant Intents', () => {
    it('processes sample inputs without throwing', async () => {
        // Mock Inputs
        const tests = [
            "Crear brief para cliente demo",
            "Crear cotizacin web",
            "Recordar pago 1001",
            "Que hay port hacer pendientes", // Typo intended to test keyword match
            "Crear nueva rutina de onboarding"
        ];

        for (const text of tests) {
            const result = await processAssistantRequest({ text });
            expect(result).toBeDefined();
        }
    });
});

// Since we can't easily run TS files with imports in this environment without ts-node setup,
// this file mainly serves as a compile-check and logic verification reference.
// To run it, we would need to add a script entry or use the debug page.
