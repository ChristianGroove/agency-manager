import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getPortalCatalog } from '@/modules/core/portal/actions'

export async function GET() {
    const results: string[] = []
    const log = (msg: string) => results.push(`[${new Date().toISOString().split('T')[1].split('.')[0]}] ${msg}`)
    const error = (msg: string) => results.push(`❌ COMPROBACIÓN FAIL: ${msg}`)
    const success = (msg: string) => results.push(`✅ COMPROBACIÓN PASS: ${msg}`)

    try {
        log('Iniciando prueba de aislamiento automatizada...')

        // 1. Setup Test Organizations
        const orgAName = `Test Org A ${Date.now()}`
        const orgBName = `Test Org B ${Date.now()}`

        log(`Creando organizaciones de prueba: ${orgAName}, ${orgBName}`)

        const { data: orgA, error: errA } = await supabaseAdmin.from('organizations').insert({ name: orgAName, slug: `test-org-a-${Date.now()}` }).select().single()
        if (errA) throw new Error(`Error creando Org A: ${errA.message}`)

        const { data: orgB, error: errB } = await supabaseAdmin.from('organizations').insert({ name: orgBName, slug: `test-org-b-${Date.now()}` }).select().single()
        if (errB) throw new Error(`Error creando Org B: ${errB.message}`)

        // 2. Setup Services
        log('Creando servicios en ambas organizaciones...')
        const { data: serviceA, error: sErrA } = await supabaseAdmin.from('services').insert({
            organization_id: orgA.id,
            name: 'Service Only For A',
            description: 'Should be visible to A',
            is_catalog_item: true,
            is_visible_in_portal: true,
            base_price: 100,
            status: 'active'
        }).select().single()
        if (sErrA) throw new Error(`Error creando Service A: ${sErrA.message}`)

        const { data: serviceB, error: sErrB } = await supabaseAdmin.from('services').insert({
            organization_id: orgB.id,
            name: 'Service Only For B',
            description: 'Should NOT be visible to A',
            is_catalog_item: true,
            is_visible_in_portal: true,
            base_price: 200,
            status: 'active'
        }).select().single()
        if (sErrB) throw new Error(`Error creando Service B: ${sErrB.message}`)

        // 3. Setup Client in Org A with Portal Token
        log('Creando cliente en Org A...')

        // Fetch a valid user for FK constraint
        const { data: { users }, error: uErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 })
        if (uErr || !users || users.length === 0) throw new Error(`No se pudo obtener un usuario para el test: ${uErr?.message}`)
        const userId = users[0].id

        const portalToken = `test-token-${Date.now()}`
        const { data: clientA, error: cErrA } = await supabaseAdmin.from('clients').insert({
            organization_id: orgA.id,
            name: 'Client A',
            email: `client-a-${Date.now()}@test.com`,
            portal_short_token: portalToken,
            user_id: userId
            // status field not in schema type definition
        }).select().single()
        if (cErrA) throw new Error(`Error creando Client A: ${cErrA.message}`)

        // 4. EXECUTE TEST: getPortalCatalog
        log(`Ejecutando getPortalCatalog con token de Cliente A (${portalToken})...`)
        let catalog = []
        try {
            catalog = await getPortalCatalog(portalToken) || []
        } catch (e: any) {
            throw new Error(`getPortalCatalog falló: ${e.message}`)
        }

        // 5. Verify Results
        log(`Catálogo recuperado: ${catalog.length} servicios`)

        const hasServiceA = catalog.some((s: any) => s.id === serviceA.id)
        const hasServiceB = catalog.some((s: any) => s.id === serviceB.id)

        if (hasServiceA) {
            success('Client A puede ver Service A')
        } else {
            error('Client A NO puede ver Service A (Falso Negativo)')
        }

        if (!hasServiceB) {
            success('Client A NO puede ver Service B (Aislamiento Correcto)')
        } else {
            error('Client A PUEDE ver Service B (FAIL DE SEGURIDAD CRÍTICO)')
        }

        // 6. Cleanup
        log('Limpiando datos de prueba...')
        await supabaseAdmin.from('services').delete().in('id', [serviceA.id, serviceB.id])
        await supabaseAdmin.from('clients').delete().eq('id', clientA.id)
        await supabaseAdmin.from('organizations').delete().in('id', [orgA.id, orgB.id])
        log('Limpieza completada.')

    } catch (e: any) {
        error(`Excepción no controlada: ${e.message}`)
        console.error(e)
    }

    return NextResponse.json({
        success: !results.some(r => r.includes('FAIL')),
        log: results
    })
}
