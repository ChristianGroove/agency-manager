import { NextResponse } from "next/server"

export function isProductionRuntime() {
    return process.env.NODE_ENV === 'production' || !!process.env.VERCEL_ENV
}

export function requireCronSecret(req: Request) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return null
}
