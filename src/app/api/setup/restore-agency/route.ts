
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const targetName = searchParams.get('name') || 'Pixy Agency' // Default to what we see in screenshot

    try {
        // Find by Name
        const { data: orgs } = await supabaseAdmin
            .from('organizations')
            .select('*')
            .ilike('name', `%${targetName}%`) // Case insensitive fuzzy match

        if (!orgs || orgs.length === 0) {
            return NextResponse.json({ error: `No organization found matching name: ${targetName}` })
        }

        const results = []

        for (const org of orgs) {
            const currentModules = (org.manual_module_overrides as string[]) || []
            const newModules = currentModules.filter(m => m !== 'module_cleaning' && m !== 'vertical_cleaning')

            if (currentModules.length !== newModules.length) {
                // Apply Fix
                const { error } = await supabaseAdmin
                    .from('organizations')
                    .update({ manual_module_overrides: newModules })
                    .eq('id', org.id)

                results.push({
                    name: org.name,
                    id: org.id,
                    status: error ? 'Failed' : 'FIXED',
                    removed: 'module_cleaning'
                })
            } else {
                results.push({
                    name: org.name,
                    id: org.id,
                    status: 'Skipped (Clean)',
                })
            }
        }

        return NextResponse.json({
            success: true,
            results
        })

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
