import { NextRequest, NextResponse } from 'next/server'
import { runMarketingCycle } from '@/modules/features/broadcasts/marketing-runner'
import { isProductionRuntime, requireCronSecret } from '@/app/api/_guards/request-guards'

export const dynamic = 'force-dynamic' // Ensure no caching for Cron
export const maxDuration = 60 // Allow longer processing (Vercel max for Hobby)

const PUBLIC_MARKETING_ERROR = 'Marketing runner failed'

function logMarketingError(label: string, error: unknown) {
    if (!isProductionRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, error instanceof Error
        ? { name: error.name }
        : { type: typeof error })
}

function sanitizeMarketingResult(result: any) {
    if (!isProductionRuntime() || !result || result.success !== false || typeof result.error !== 'string') {
        return result
    }

    return { ...result, error: PUBLIC_MARKETING_ERROR }
}

export async function GET(req: NextRequest) {
    const unauthorized = requireCronSecret(req)
    if (unauthorized) return unauthorized

    try {
        const result = await runMarketingCycle()
        return NextResponse.json(sanitizeMarketingResult(result))
    } catch (error: any) {
        logMarketingError('Marketing Runner Failed:', error)
        return NextResponse.json({ success: false, error: PUBLIC_MARKETING_ERROR }, { status: 500 })
    }
}

// Allow POST for manual triggers from UI that might send a body (future proof)
export async function POST(req: NextRequest) {
    return GET(req)
}
