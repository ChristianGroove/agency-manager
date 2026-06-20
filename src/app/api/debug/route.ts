import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const orgId = searchParams.get('orgId') || 'd2669679-dacf-4fe0-89cc-29094cba0e05'
        
        const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
        
        // Count leads in June
        const { count: countJun } = await sb.from('leads').select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .gte('created_at', '2026-06-01T00:00:00Z')
            
        // Count leads today
        const { count: countHoy } = await sb.from('leads').select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .gte('created_at', '2026-06-20T00:00:00Z')
            
        // RPC today
        const { data: rpcHoy } = await sb.rpc('get_advanced_crm_reports', {
            p_org_id: orgId,
            p_start_date: '2026-06-20T00:00:00Z',
            p_end_date: '2026-06-20T23:59:59Z'
        })
        
        // RPC 15 days
        const { data: rpc15d } = await sb.rpc('get_advanced_crm_reports', {
            p_org_id: orgId,
            p_start_date: '2026-06-05T00:00:00Z',
            p_end_date: '2026-06-20T23:59:59Z'
        })

        return NextResponse.json({
            status: 'ok',
            counts: { june: countJun, today: countHoy },
            rpc_today_summary: rpcHoy?.summary,
            rpc_15d_summary: rpc15d?.summary,
            rpc_today_trend: rpcHoy?.activity_trend?.slice(-3),
            rpc_15d_trend: rpc15d?.activity_trend?.slice(-3)
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
