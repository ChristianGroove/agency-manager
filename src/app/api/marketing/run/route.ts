import { NextRequest, NextResponse } from 'next/server'
import { runMarketingCycle } from '@/modules/features/broadcasts/marketing-runner'
import { requireCronSecret } from '@/modules/core/security/api-route-guards'

export const dynamic = 'force-dynamic' // Ensure no caching for Cron
export const maxDuration = 60 // Allow longer processing (Vercel max for Hobby)

export async function GET(req: NextRequest) {
    const guard = requireCronSecret(req)
    if (guard) return guard

    try {
        const result = await runMarketingCycle()
        return NextResponse.json(result)
    } catch (error: any) {
        console.error('Marketing Runner Failed:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// Allow POST for manual triggers from UI that might send a body (future proof)
export async function POST(req: NextRequest) {
    return GET(req)
}
