import { NextRequest, NextResponse } from 'next/server'
import { runMarketingCycle } from '@/modules/core/broadcasts/marketing-runner'

export const dynamic = 'force-dynamic' // Ensure no caching for Cron
export const maxDuration = 60 // Allow longer processing (Vercel max for Hobby)

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization')

    // Simple Bearer check for cron security (or use shared secret)
    // For DEV/Demo updates, we might skip strict check or use a known secret
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

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
