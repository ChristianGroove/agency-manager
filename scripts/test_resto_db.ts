import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
    const orgId = '9cce6d27-8616-40be-baf9-607de5e01ca1'

    // 1. Probar Error creando cliente
    const { data: newClient, error: clientError } = await supabaseAdmin
        .from('clients')
        .insert({
            organization_id: orgId,
            name: 'Test Customer ' + Date.now(),
            phone: '3000000001',
            type: 'lead',
            status: 'lead'
        })
        .select()
        .single()
    console.log('Client Insert Error:', clientError?.message || clientError?.details || clientError?.hint || clientError)

    if (newClient) {
        console.log('Cliente creado con éxito!', newClient.id)
        await supabaseAdmin.from('clients').delete().eq('id', newClient.id)
    }

    // 2. Ver columnas del Catálogo para entender por qué price es undefined/NaN
    const { data: items } = await supabaseAdmin.from('service_catalog').select('*').limit(1)
    console.log('Catalog Columns:', Object.keys(items?.[0] || {}))
    if (items && items.length > 0) {
        console.log('Sample Item Price Value (base_price):', items[0].base_price)
        console.log('Sample Item Price Value (price):', (items[0] as any).price)
    }
}

main().catch(console.error)
