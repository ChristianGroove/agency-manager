
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ModuleValidator } from '../../lib/module-validator'
import { supabaseAdmin } from '../../lib/supabase-admin'

// --- Stateful Mock Engine ---
const MOCK_DB = {
    modules: [
        {
            key: 'core',
            name: 'Core System',
            dependencies: [],
            conflicts_with: [],
            price_monthly: 0,
            is_core: true
        },
        {
            key: 'crm',
            name: 'CRM Module',
            dependencies: [{ module_key: 'core', type: 'required' }],
            conflicts_with: [],
            price_monthly: 29
        },
        {
            key: 'analytics',
            name: 'Advanced Analytics',
            dependencies: [{ module_key: 'crm', type: 'required' }],
            conflicts_with: [],
            price_monthly: 49
        },
        {
            key: 'legacy_ui',
            name: 'Legacy UI',
            dependencies: [{ module_key: 'core', type: 'required' }],
            conflicts_with: ['modern_ui'],
            price_monthly: 0
        },
        {
            key: 'modern_ui',
            name: 'Modern UI',
            dependencies: [{ module_key: 'core', type: 'required' }],
            conflicts_with: ['legacy_ui'],
            price_monthly: 10
        }
    ],
    org_modules: new Set<string>() // Stores active module keys
}

// Mock Supabase with logic
vi.mock('../../lib/supabase-admin', () => ({
    supabaseAdmin: {
        from: vi.fn(),
        rpc: vi.fn()
    }
}))

describe('Integration Scenarios: Module System', () => {
    let validator: ModuleValidator

    beforeEach(() => {
        validator = new ModuleValidator()
        MOCK_DB.org_modules.clear()
        vi.clearAllMocks()
        setupStatefulMocks()
    })

    function setupStatefulMocks() {
        // Mock 'from' to return modules
        // @ts-ignore
        supabaseAdmin.from.mockImplementation((table) => {
            if (table === 'system_modules') {
                return {
                    select: () => ({
                        eq: (field: string, value: any) => ({
                            single: async () => ({
                                data: MOCK_DB.modules.find(m => m[field] === value),
                                error: null
                            })
                        }),
                        in: (field: string, values: any[]) => ({
                            eq: (f2: string, v2: any) => ({
                                data: MOCK_DB.modules.filter(m => values.includes(m[field])),
                                error: null
                            }),
                            // Simple .in mock
                            data: MOCK_DB.modules.filter(m => values.includes(m[field])),
                            error: null
                        })
                    })
                }
            }
            return { select: () => ({ eq: () => ({ single: () => ({ data: null }) }) }) }
        })

        // Mock 'rpc' for complex logic usually in PL/pgSQL
        // @ts-ignore
        supabaseAdmin.rpc.mockImplementation(async (fnName, params) => {
            if (fnName === 'validate_module_activation') {
                const { p_module_key, p_current_active_modules } = params
                const target = MOCK_DB.modules.find(m => m.key === p_module_key)
                if (!target) return { data: { valid: false, error: 'Module not found' } }

                // Check conflicts
                for (const conflict of target.conflicts_with || []) {
                    if (p_current_active_modules.includes(conflict)) {
                        return { data: { valid: false, error: `Conflict with ${conflict}` } }
                    }
                }
                return { data: { valid: true } }
            }

            if (fnName === 'auto_resolve_dependencies') {
                const { p_module_key, p_current_active_modules } = params
                const resolved: string[] = []
                const queue = [p_module_key]
                const visited = new Set<string>()

                while (queue.length > 0) {
                    const key = queue.shift()!
                    if (visited.has(key)) continue
                    visited.add(key)

                    // Add to resolved if it's not the target and not already active
                    if (key !== p_module_key && !p_current_active_modules.includes(key)) {
                        resolved.push(key)
                    }

                    const mod = MOCK_DB.modules.find(m => m.key === key)
                    if (mod) {
                        for (const dep of mod.dependencies || []) {
                            if (dep.type === 'required') {
                                queue.push(dep.module_key)
                            }
                        }
                    }
                }
                return { data: resolved, error: null }
            }

            if (fnName === 'get_orphaned_modules') {
                // Simple orphan logic for test: if disabling parent, find children
                const { p_module_to_disable, p_current_active_modules } = params
                const orphans = []
                // Find modules that depend on this one and are active
                for (const modKey of p_current_active_modules) {
                    if (modKey === p_module_to_disable) continue
                    const mod = MOCK_DB.modules.find(m => m.key === modKey)
                    const hasDep = mod?.dependencies.some((d: any) => d.module_key === p_module_to_disable)
                    if (hasDep) orphans.push(modKey)
                }
                return { data: orphans, error: null }
            }

            return { data: null, error: null }
        })
    }

    // --- SCENARIO 1: Deep Dependency Chain ---
    it('Scenario 1: Should resolve deep dependency chain (Analytics -> CRM -> Core)', async () => {
        // Core is already active (usually) but let's say nothing is active
        const currentModules: string[] = []

        const plan = await validator.createActivationPlan('analytics', 'org-test', currentModules)

        expect(plan.modules_to_enable).toContain('analytics')
        // Order matters for activation: Core -> CRM -> Analytics
        // But the set should contain all 3
        expect(plan.modules_to_enable).toContain('core')
        expect(plan.modules_to_enable).toContain('crm')
        expect(plan.modules_to_enable).toContain('analytics')

        // Cost should be sum of all new modules
        const totalCost = 0 + 29 + 49
        expect(plan.total_cost).toBe(totalCost)
    })

    // --- SCENARIO 2: Mutual Exclusion ---
    it('Scenario 2: Should prevent conflicting module activation', async () => {
        // Setup: Legacy UI is active
        const currentModules = ['core', 'legacy_ui']

        // Try to activate Modern UI (conflicts with Legacy UI)
        // Note: validateModuleActivation calls RPC, which we mocked to check conflicts
        const result = await validator.validateModuleActivation('modern_ui', 'org-test', currentModules)

        expect(result.valid).toBe(false)
        expect(result.error).toContain('Conflict with legacy_ui')
    })

    // --- SCENARIO 3: Cascading Disable ---
    it('Scenario 3: Should warn about orphans when disabling a dependency', async () => {
        // Setup: Core, CRM, Analytics all active
        const currentModules = ['core', 'crm', 'analytics']

        // Try to disable CRM (Analytics depends on it)
        const plan = await validator.createDeactivationPlan('crm', currentModules)

        // Should propose disabling CRM AND Analytics
        expect(plan.modules_to_disable).toContain('crm')
        expect(plan.modules_to_disable).toContain('analytics')
        expect(plan.modules_to_disable).not.toContain('core') // Core stays

        // Should have a warning
        expect(plan.warnings.some(w => w.includes('analytics'))).toBe(true)
    })
})
