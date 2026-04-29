import { NextResponse } from 'next/server'
import { requireNonProductionRoute } from '@/modules/core/security/api-route-guards'

export async function GET() {
    const guard = requireNonProductionRoute()
    if (guard) return guard

    return NextResponse.json({ status: 'ok', timestamp: Date.now() })
}
