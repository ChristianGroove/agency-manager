
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getOrganizationModules } from '@/modules/core/organizations/actions'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        // Fetch first org
        const { data: org } = await supabaseAdmin
            .from('organizations')
            .select('id, name, manual_module_overrides, subscription_product_id')
            .limit(1)
            .single()

        if (!org) return NextResponse.json({ error: 'No org found' })

        // Re-simulate logic manually to see what's happening
        const manual = org.manual_module_overrides || []

        let productModules: string[] = []
        if (org.subscription_product_id) {
            const { data: prod } = await supabaseAdmin
                .from('saas_products')
                .select(`
                    modules:saas_product_modules (
                        system_module:system_modules!module_id ( key )
                    )
                `)
                .eq('id', org.subscription_product_id)
                .single()

            if (prod) {
                productModules = prod.modules.map((m: any) => m.system_module?.key).filter(Boolean)
            }
        }

        const calculated = Array.from(new Set([...manual, ...productModules]))

        return NextResponse.json({
            org_id: org.id,
            name: org.name,
            manual_overrides: manual,
            subscription_product_id: org.subscription_product_id,
            product_modules: productModules,
            FINAL_CALCULATED: calculated
        })

    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack })
    }
}
