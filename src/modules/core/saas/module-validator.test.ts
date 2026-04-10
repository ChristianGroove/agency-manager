
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ModuleValidator } from './module-validator'
import { supabaseAdmin } from './supabase-admin'
import { ModuleDependency, SystemModule } from './module-validator'

// Mock dependencies
vi.mock('./supabase-admin', () => ({
    supabaseAdmin: {
        from: vi.fn(),
        rpc: vi.fn()
    }
}))

describe('ModuleValidator', () => {
    let validator: ModuleValidator

    beforeEach(() => {
        validator = new ModuleValidator()
        vi.clearAllMocks()
    })

    describe('validateModuleActivation', () => {
        it('should return valid if RPC returns valid', async () => {
            const mockRpc = vi.fn().mockResolvedValue({
                data: { valid: true },
                error: null
            })
            // @ts-ignore
            supabaseAdmin.rpc = mockRpc

            const result = await validator.validateModuleActivation('crm', 'org-123', [])

            expect(mockRpc).toHaveBeenCalledWith('validate_module_activation', {
                p_module_key: 'crm',
                p_organization_id: 'org-123',
                p_current_active_modules: []
            })
            expect(result.valid).toBe(true)
        })

        it('should handle RPC errors gracefully', async () => {
            const mockRpc = vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'RPC Error' }
            })
            // @ts-ignore
            supabaseAdmin.rpc = mockRpc

            const result = await validator.validateModuleActivation('crm', 'org-123', [])

            expect(result.valid).toBe(false)
            expect(result.error).toBe('RPC Error')
        })
    })

    describe('createActivationPlan', () => {
        it('should create a plan with dependencies', async () => {
            // Mock validate (step 1)
            const mockValidate = vi.spyOn(validator, 'validateModuleActivation')
                .mockResolvedValueOnce({ valid: true }) // First call for target
                .mockResolvedValue({ valid: true })     // Subsequent calls for deps

            // Mock auto-resolve (step 2)
            const mockAutoResolve = vi.spyOn(validator, 'autoResolveDependencies')
                .mockResolvedValue(['core'])

            // Mock cost calculation (step 4)
            const mockFrom = vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    in: vi.fn().mockReturnValue({
                        eq: vi.fn().mockResolvedValue({ data: [{ key: 'crm', price_monthly: 29 }] })
                    })
                })
            })
            // @ts-ignore
            supabaseAdmin.from = mockFrom

            const plan = await validator.createActivationPlan('crm', 'org-123', [])

            expect(plan.target_module).toBe('crm')
            expect(plan.modules_to_enable).toContain('crm')
            expect(plan.modules_to_enable).toContain('core')
            expect(plan.warnings).toHaveLength(1) // "Will automatically enable..."
            expect(plan.total_cost).toBe(29)
        })
    })

    describe('createDeactivationPlan', () => {
        it('should detect orphaned modules', async () => {
            // Mock orphans
            const mockGetOrphans = vi.spyOn(validator, 'getOrphanedModules')
                .mockResolvedValue(['crm'])

            // Mock module check (core check)
            // We need to mock private method getSystemModule indirectly or assume it's used via public API
            // Since getSystemModule is private, we can't easy mock it without casting to any or changing visibility
            // For this test, let's assume getSystemModule returns a non-core module
            // But wait, createDeactivationPlan calls getSystemModule internally via this.getSystemModule
            // We can mock the supabaseAdmin call it makes

            const mockFrom = vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: { key: 'core', is_core: false } })
                    })
                })
            })
            // @ts-ignore
            supabaseAdmin.from = mockFrom

            const plan = await validator.createDeactivationPlan('core', ['core', 'crm'])

            expect(plan.modules_to_disable).toContain('crm')
            expect(plan.warnings[0]).toContain('will also disable 1 dependent modules')
        })
    })
})
