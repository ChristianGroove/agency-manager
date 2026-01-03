
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PERF_PREFIX = 'perf_test_'
const MODULE_COUNT = 100
const DEP_CHAIN_LENGTH = 10

async function runStressTest() {
    console.log('🚀 Starting Module System Stress Test...')

    try {
        // 1. Clean up previous runs
        await cleanup()

        // 2. Seed data
        console.log(`\n🌱 Seeding ${MODULE_COUNT} modules...`)
        const modules: any[] = []

        // Create base modules
        for (let i = 0; i < MODULE_COUNT; i++) {
            modules.push({
                key: `${PERF_PREFIX}${i}`,
                name: `Perf Module ${i}`,
                description: 'Generated for stress testing',
                category: 'core',
                // status: 'beta', <--- Removed
                dependencies: [], // Will populate chain next
                is_core: false,
                is_premium: false,
                price_monthly: 0,
                display_order: 999
            })
        }

        // Create dependency chains (0->1->2->...->N)
        // This stress tests the recursive resolution
        for (let i = 0; i < DEP_CHAIN_LENGTH; i++) {
            modules[i].dependencies = [{
                module_key: `${PERF_PREFIX}${i + 1}`,
                type: 'required',
                reason: 'Chain test'
            }]
        }

        const { error: seedError } = await supabase
            .from('system_modules')
            .insert(modules)

        if (seedError) throw seedError
        console.log('✅ Seeding complete.')

        // 3. Benchmark: Auto Resolve Dependencies
        console.log('\n⏱️ Benchmarking Auto-Resolution (Recursive)...')
        const startResolve = performance.now()

        // Resolve dependencies for module 0 (which depends on 1, which depends on 2...)
        const { data: resolved, error: resolveError } = await supabase
            .rpc('auto_resolve_dependencies', {
                p_module_key: `${PERF_PREFIX}0`,
                p_current_active_modules: []
            })

        const endResolve = performance.now()

        if (resolveError) throw resolveError

        console.log(`Resolution Result: Found ${resolved?.length} dependencies`)
        console.log(`Time taken: ${(endResolve - startResolve).toFixed(2)}ms`)

        if ((endResolve - startResolve) > 500) {
            console.warn('⚠️ WARNING: Resolution took > 500ms')
        } else {
            console.log('✅ Performance is within acceptable limits (<500ms)')
        }

        // 4. Benchmark: Validation
        console.log('\n⏱️ Benchmarking Validation...')
        const startValid = performance.now()

        const { error: validError } = await supabase
            .rpc('validate_module_activation', {
                p_module_key: `${PERF_PREFIX}0`,
                p_organization_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
                p_current_active_modules: []
            })

        const endValid = performance.now()

        if (validError && validError.message !== 'Organization not found') {
            // We expect validation to pass or fail on logic, not crash
        }

        console.log(`Validation Time: ${(endValid - startValid).toFixed(2)}ms`)


    } catch (error) {
        console.error('❌ Test failed:', error)
    } finally {
        await cleanup()
    }
}

async function cleanup() {
    // Delete all modules starting with prefix
    // Note: This requires RLS allowing delete or Service Role
    const { error } = await supabase
        .from('system_modules')
        .delete()
        .ilike('key', `${PERF_PREFIX}%`)

    if (error) console.error('Cleanup error:', error)
    else console.log('🧹 Cleanup complete.')
}

runStressTest()
