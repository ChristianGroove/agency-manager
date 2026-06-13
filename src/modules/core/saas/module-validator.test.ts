import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ModuleValidator } from './module-validator'

const mockFrom = vi.fn()
const mockRpc = vi.fn()

// Mock dependencies
vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(async () => ({
        from: mockFrom,
        rpc: mockRpc
    }))
}))

describe('ModuleValidator', () => {
    let validator: ModuleValidator

    beforeEach(() => {
        validator = new ModuleValidator()
        vi.clearAllMocks()
    })

    describe('validateModuleActivation', () => {
        it('should return valid if RPC returns valid', async () => {
            mockRpc.mockResolvedValueOnce({
                data: { valid: true },
                error: null
            })

            const result = await validator.validateModuleActivation('crm', 'org-123', [])

            expect(mockRpc).toHaveBeenCalledWith('validate_module_activation', {
                p_module_key: 'crm',
                p_organization_id: 'org-123',
                p_current_active_modules: []
            })
            expect(result.valid).toBe(true)
        })

        it('should handle RPC errors gracefully', async () => {
            mockRpc.mockResolvedValueOnce({
                data: null,
                error: { message: 'RPC Error' }
            })

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
            mockFrom.mockReturnValueOnce({
                select: vi.fn().mockReturnValue({
                    in: vi.fn().mockReturnValue({
                        eq: vi.fn().mockResolvedValue({ data: [{ key: 'crm', price_monthly: 29 }] })
                    })
                })
            })

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

            mockFrom.mockReturnValueOnce({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        single: vi.fn().mockResolvedValue({ data: { key: 'core', is_core: false } })
                    })
                })
            })

            const plan = await validator.createDeactivationPlan('core', ['core', 'crm'])

            expect(plan.modules_to_disable).toContain('crm')
            expect(plan.warnings[0]).toContain('will also disable 1 dependent modules')
        })
    })
})
