/**
 * Gets the base URL for authentication redirects.
 * Dynamically resolves to localhost during local development if triggered from a request,
 * or process.env.NEXT_PUBLIC_APP_URL / production app URL otherwise.
 */
export function getAuthRedirectBase(requestHost?: string | null) {
    if (requestHost) {
        const isLocal = requestHost.includes('localhost') || requestHost.includes('127.0.0.1')
        if (isLocal || process.env.NODE_ENV === 'development') {
            const protocol = isLocal ? 'http' : 'https'
            return `${protocol}://${requestHost}`
        }
    }

    if (process.env.NODE_ENV === 'development') {
        return 'http://localhost:3000'
    }

    let redirectBase = 'https://app.pixy.com.co'

    if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
        redirectBase = process.env.NEXT_PUBLIC_APP_URL.startsWith('http')
            ? process.env.NEXT_PUBLIC_APP_URL
            : `https://${process.env.NEXT_PUBLIC_APP_URL}`
    } else if (process.env.NEXT_PUBLIC_APP_DOMAIN && !process.env.NEXT_PUBLIC_APP_DOMAIN.includes('localhost')) {
        redirectBase = `https://app.${process.env.NEXT_PUBLIC_APP_DOMAIN}`
    }

    return redirectBase
}
