import { NextRequest, NextResponse } from 'next/server'
import { runMarketingCycle } from '@/modules/features/broadcasts/marketing-runner'
import { requireAuthenticatedUserOrCronSecret } from '@/modules/core/security/api-route-guards'

export const dynamic = 'force-dynamic' // Ensure no caching for Cron
export const maxDuration = 60 // Allow longer processing (Vercel max for Hobby)

function getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error)
}

export async function GET(req: NextRequest) {
    const guard = await requireAuthenticatedUserOrCronSecret(req)
    if (guard) return guard

    try {
        const result = await runMarketingCycle()
        return NextResponse.json(result)
    } catch (error: unknown) {
        console.error('Marketing Runner Failed:', error)
        return NextResponse.json({ success: false, error: getErrorMessage(error) }, { status: 500 })
    }
}

// Allow POST for manual triggers from UI that might send a body (future proof)
export async function POST(req: NextRequest) {
    return GET(req)
}
