import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { checkRateLimit, checkPortalRateLimit } from '@/lib/security/rate-limit'
import { applySecurityHeaders } from '@/lib/security/headers'

export async function middleware(request: NextRequest) {
    // Skip middleware for Webhooks (Stateless, handled by route signature checks)
    if (request.nextUrl.pathname.startsWith('/api/webhooks')) {
        return NextResponse.next()
    }

    // 0. SECURITY SHIELD: Rate Limiting & Headers
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'

    // Portal-specific rate limiting (stricter)
    if (request.nextUrl.pathname.startsWith('/portal')) {
        const { success } = checkPortalRateLimit(ip)
        if (!success) {
            return new NextResponse('Too Many Requests - Portal access limited', { status: 429 })
        }
    }

    // Skip RL for static assets (handled by matcher) and internal APIs if needed
    if (!request.nextUrl.pathname.startsWith('/_next')) {
        const { success } = checkRateLimit(ip)
        if (!success) {
            return new NextResponse('Too Many Requests', { status: 429 })
        }
    }

    // 0.5 SUBDOMAIN ROUTING: Multi-Tenant Architecture
    const hostname = request.headers.get('host') || ''
    const currentHost = process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ROOT_DOMAIN
        ? hostname.replace(`.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`, '')
        : hostname.replace(`.localhost:3000`, '')

    const isMainDomain = currentHost === 'www' || currentHost === 'app' || currentHost === hostname || currentHost === 'localhost:3000'

    // DEPRECATION: Redirect 'control' to 'app'
    if (currentHost === 'control') {
        const url = request.nextUrl.clone()
        url.host = process.env.NEXT_PUBLIC_APP_URL || 'app.pixy.com.co'
        return NextResponse.redirect(url, 308)
    }

    // Prepare Request Headers (to pass context to Server Components)
    const requestHeaders = new Headers(request.headers)

    if (!isMainDomain) {
        // We are on a Tenant Subdomain
        requestHeaders.set('x-tenant-slug', currentHost)
    } else {
        // We are on Main Domain
        requestHeaders.delete('x-tenant-slug')
    }

    // 1. Core Supabase Auth Session Handling (Initialize Response with modified headers)
    let response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    })

    // Apply WAF Headers
    applySecurityHeaders(response.headers)

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    applySecurityHeaders(response.headers) // Re-apply on refresh
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    applySecurityHeaders(response.headers) // Re-apply on refresh
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    // 2. Custom Security Checks (Only for authenticated users)
    if (user) {
        // Exclude specific paths from checks
        if (!request.nextUrl.pathname.startsWith('/suspended') &&
            !request.nextUrl.pathname.startsWith('/auth') &&
            !request.nextUrl.pathname.startsWith('/api')) {

            // PERF: Run profile and membership checks IN PARALLEL
            const adminClient = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            )

            const [profileResult, membershipResult] = await Promise.all([
                supabase
                    .from('profiles')
                    .select('platform_role')
                    .eq('id', user.id)
                    .single(),
                adminClient
                    .from('organization_members')
                    .select('organization:organizations!inner(status)')
                    .eq('user_id', user.id)
            ])

            const profile = profileResult.data

            if (profile?.platform_role !== 'super_admin') {
                const memberships = membershipResult.data

                // Block ONLY if the user has memberships AND NONE of them are active.
                // If the user has 0 memberships (new user), we don't block (they need to accept invite).
                if (memberships && memberships.length > 0) {
                    const hasActiveOrg = memberships.some((m: any) => m.organization?.status === 'active')

                    if (!hasActiveOrg) {
                        const url = request.nextUrl.clone()
                        url.pathname = '/suspended'
                        return NextResponse.redirect(url)
                    }
                }
            }
        }
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
