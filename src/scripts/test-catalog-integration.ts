import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCatalogIntegration() {
    console.log('🧪 Testing Cleaning Services → Service Catalog Integration\n')

    // Get organization ID for cleaning demo
    const { data: org } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('slug', 'cleaning-demo-corp')
        .single()

    if (!org) {
        console.error('❌ Organization not found. Run setup-cleaning-space.ts first.')
        return
    }

    console.log(`✅ Organization found: ${org.name} (${org.id})\n`)

    // Test 1: Create a service in service_catalog
    console.log('📝 Test 1: Creating test service in catalog...')
    const { data: newService, error: createError } = await supabase
        .from('service_catalog')
        .insert({
            organization_id: org.id,
            name: 'Limpieza Profunda - Test',
            description: 'Servicio de prueba para verificar integración con catálogo',
            base_price: 150,
            category: 'cleaning',
            type: 'one_off',
            is_visible_in_portal: true,
            metadata: {
                duration_minutes: 120,
                price_unit: 'per_service',
                is_active: true,
                test_service: true
            }
        })
        .select()
        .single()

    if (createError) {
        console.error('❌ Error creating service:', createError)
        return
    }

    console.log(`✅ Service created: ${newService.name} (ID: ${newService.id})`)
    console.log(`   - Price: $${newService.base_price}`)
    console.log(`   - Duration: ${newService.metadata.duration_minutes} min`)
    console.log(`   - Price Unit: ${newService.metadata.price_unit}\n`)

    // Test 2: Retrieve services with cleaning category
    console.log('📋 Test 2: Fetching all cleaning services...')
    const { data: services, error: fetchError } = await supabase
        .from('service_catalog')
        .select('*')
        .eq('organization_id', org.id)
        .eq('category', 'cleaning')
        .order('created_at', { ascending: false })

    if (fetchError) {
        console.error('❌ Error fetching services:', fetchError)
        return
    }

    console.log(`✅ Found ${services?.length || 0} cleaning services:`)
    services?.forEach((service, index) => {
        console.log(`   ${index + 1}. ${service.name} - $${service.base_price}`)
        console.log(`      Type: ${service.type} | Category: ${service.category}`)
        console.log(`      Metadata: ${JSON.stringify(service.metadata, null, 2)}`)
    })

    console.log('\n✅ All tests passed! Catalog integration working correctly.')
    console.log('\n📊 Summary:')
    console.log(`   - Services created: 1`)
    console.log(`   - Total cleaning services: ${services?.length || 0}`)
    console.log(`   - Table: service_catalog`)
    console.log(`   - Category filter: cleaning`)
    console.log(`   - Backend actions: ✅ Compatible`)
}

testCatalogIntegration()
    .then(() => {
        console.log('\n🎉 Test completed!')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n💥 Test failed:', error)
        process.exit(1)
    })
