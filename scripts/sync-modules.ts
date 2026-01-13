/**
 * MODULE SYNC SCRIPT
 * 
 * Compares MODULE_ROUTES (code) with system_modules (database)
 * and reports discrepancies.
 * 
 * Run with: npx tsx scripts/sync-modules.ts
 */

import { createClient } from '@supabase/supabase-js'
import { MODULE_ROUTES } from '../src/lib/module-config'

// Initialize Supabase Admin
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

interface SyncReport {
    inCodeOnly: string[]      // In MODULE_ROUTES but not in DB
    inDbOnly: string[]        // In DB but not in MODULE_ROUTES
    synced: string[]          // Present in both
    totalCode: number
    totalDb: number
}

async function syncModules(): Promise<SyncReport> {
    console.log('🔄 Starting Module Sync Check...\n')

    // 1. Get all module keys from code
    const codeModuleKeys = MODULE_ROUTES.map(r => r.key)
    console.log(`📦 Found ${codeModuleKeys.length} modules in MODULE_ROUTES`)

    // 2. Get all module keys from database
    const { data: dbModules, error } = await supabase
        .from('system_modules')
        .select('key, name')

    if (error) {
        console.error('❌ Error fetching from database:', error)
        throw error
    }

    const dbModuleKeys = dbModules?.map(m => m.key) || []
    console.log(`🗄️  Found ${dbModuleKeys.length} modules in system_modules\n`)

    // 3. Find discrepancies
    const inCodeOnly = codeModuleKeys.filter(k => !dbModuleKeys.includes(k))
    const inDbOnly = dbModuleKeys.filter(k => !codeModuleKeys.includes(k))
    const synced = codeModuleKeys.filter(k => dbModuleKeys.includes(k))

    // 4. Report
    console.log('='.repeat(50))
    console.log('SYNC REPORT')
    console.log('='.repeat(50))

    if (inCodeOnly.length === 0 && inDbOnly.length === 0) {
        console.log('\n✅ All modules are in sync!\n')
    } else {
        if (inCodeOnly.length > 0) {
            console.log('\n⚠️  Modules in CODE but NOT in DATABASE:')
            inCodeOnly.forEach(k => {
                const route = MODULE_ROUTES.find(r => r.key === k)
                console.log(`   - ${k} (${route?.label || 'unknown'})`)
            })
        }

        if (inDbOnly.length > 0) {
            console.log('\n⚠️  Modules in DATABASE but NOT in CODE:')
            inDbOnly.forEach(k => {
                const mod = dbModules?.find(m => m.key === k)
                console.log(`   - ${k} (${mod?.name || 'unknown'})`)
            })
        }
    }

    console.log('\n' + '='.repeat(50))
    console.log(`Summary: ${synced.length} synced, ${inCodeOnly.length} code-only, ${inDbOnly.length} db-only`)
    console.log('='.repeat(50) + '\n')

    return {
        inCodeOnly,
        inDbOnly,
        synced,
        totalCode: codeModuleKeys.length,
        totalDb: dbModuleKeys.length
    }
}

async function createMissingInDb(keys: string[]): Promise<void> {
    if (keys.length === 0) {
        console.log('No modules to create in DB.')
        return
    }

    console.log(`\n🔧 Creating ${keys.length} missing modules in database...`)

    for (const key of keys) {
        const route = MODULE_ROUTES.find(r => r.key === key)
        if (!route) continue

        const moduleData = {
            key: route.key,
            name: route.label,
            description: route.description || `Module for ${route.label}`,
            category: mapCategoryToDbCategory(route.category),
            is_core: route.isCore || false,
            compatible_verticals: ['*'], // Default to all
            icon: 'box', // Default icon
            color: '#6366f1', // Default color
            version: '1.0.0',
            display_order: 100
        }

        const { error } = await supabase
            .from('system_modules')
            .upsert(moduleData, { onConflict: 'key' })

        if (error) {
            console.log(`   ❌ Failed to create ${key}: ${error.message}`)
        } else {
            console.log(`   ✅ Created ${key}`)
        }
    }
}

function mapCategoryToDbCategory(category: string): string {
    const map: Record<string, string> = {
        'core': 'core',
        'crm': 'vertical_specific',
        'operations': 'vertical_specific',
        'finance': 'add_on',
        'config': 'core'
    }
    return map[category] || 'add_on'
}

// Main execution
async function main() {
    const args = process.argv.slice(2)
    const shouldFix = args.includes('--fix')

    try {
        const report = await syncModules()

        if (shouldFix && report.inCodeOnly.length > 0) {
            await createMissingInDb(report.inCodeOnly)
            console.log('\n✅ Sync complete!')
        } else if (report.inCodeOnly.length > 0) {
            console.log('💡 Run with --fix to create missing modules in database')
        }

        process.exit(0)
    } catch (error) {
        console.error('Sync failed:', error)
        process.exit(1)
    }
}

main()
