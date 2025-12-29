
import { NextResponse } from 'next/server'
import { getCurrentOrganizationId, getOrganizationModules } from '@/modules/core/organizations/actions'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
    try {
        const orgId = await getCurrentOrganizationId()
        if (!orgId) return NextResponse.json({ error: 'No org found' })

        const modules = await getOrganizationModules(orgId)

        // Also get raw org data
        const supabase = await createClient()
        const { data: org } = await supabase.from('organizations').select('*').eq('id', orgId).single()

        return NextResponse.json({
            orgId,
            modules,
            manual_overrides: org.manual_module_overrides,
            product_id: org.subscription_product_id
        })
    } catch (e: any) {
        return NextResponse.json({ error: e.message })
    }
}
