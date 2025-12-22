import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const rateLimit = new Map<string, { count: number, lastReset: number }>()

export function middleware(request: NextRequest) {
    const url = request.nextUrl
    const hostname = request.headers.get('host') || ''
    const ip = request.headers.get('x-forwarded-for') || 'unknown'

    // Define the portal domain
    // In development, we might use localhost:3000, so we need a way to simulate it.
    // We can use an environment variable or just check for the specific production domain.
    // Also support 'mi.localhost' for local testing if configured in hosts file.
    const isPortalDomain = hostname === 'mi.pixy.com.co' || hostname.startsWith('mi.')

    // 1. Portal Domain Routing
    if (isPortalDomain) {
        // Rate Limiting Logic
        const now = Date.now()
        const windowMs = 60 * 1000 // 1 minute
        const limit = 60 // 60 requests per minute (1 per second)

        const record = rateLimit.get(ip) || { count: 0, lastReset: now }

        if (now - record.lastReset > windowMs) {
            record.count = 0
            record.lastReset = now
        }

        record.count++
        rateLimit.set(ip, record)

        if (record.count > limit) {
            return new NextResponse('Too Many Requests', { status: 429 })
        }

        // Routing Logic
        const path = url.pathname

        // Allow public assets
        if (path.startsWith('/_next') || path.startsWith('/static') || path.includes('.')) {
            return NextResponse.next()
        }

        // If path is just '/', maybe show a generic login or 404? 
        // Or if they have a token in path like mi.pixy.com.co/ABC1234
        if (path === '/') {
            // For now, maybe just 404 or a generic "Welcome to Client Portal" page
            // We can rewrite to a specific landing page if it exists
            return NextResponse.next()
        }

        // If path is like /ABC1234 (6 chars), rewrite to /portal/ABC1234
        // We can be more loose and just rewrite everything that isn't an API route
        if (!path.startsWith('/api')) {
            // Check if it looks like a token (alphanumeric)
            // Actually, we can just rewrite /:token to /portal/:token
            // But we need to be careful not to loop if we are already at /portal

            if (!path.startsWith('/portal')) {
                // Rewrite /token -> /portal/token
                return NextResponse.rewrite(new URL(`/portal${path}`, request.url))
            }
        }
    }

    // 2. Main Domain Routing (control.pixy.com.co)
    // We might want to BLOCK access to /portal routes from the main domain to enforce separation
    // But for now, let's just focus on the portal domain rewrite.

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}
