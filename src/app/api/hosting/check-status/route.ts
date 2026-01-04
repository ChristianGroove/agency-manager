
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    let url = searchParams.get('url')

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Normalize URL
    if (!url.startsWith('http')) {
        url = `https://${url}`
    }

    const start = Date.now()
    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout

        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            cache: 'no-store'
        })

        clearTimeout(timeoutId)

        const latency = Date.now() - start

        if (response.ok || response.status < 400) {
            return NextResponse.json({
                status: 'online',
                latency,
                code: response.status
            })
        } else {
            return NextResponse.json({
                status: 'online', // Server responded, but with error (e.g. 404/500), mostly still considered "up" compared to DNS failure
                latency,
                code: response.status,
                warning: `Status code ${response.status}`
            })
        }
    } catch (error: any) {
        return NextResponse.json({
            status: 'offline',
            error: error.message
        }, { status: 200 }) // Return 200 to frontend so it can process the JSON offline status
    }
}
