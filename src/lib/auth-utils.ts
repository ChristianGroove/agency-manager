
/**
 * Gets the base URL for authentication redirects.
 * Ensures we use the production app URL even when triggered from background jobs
 * or server actions where local context might be misleading.
 */
export function getAuthRedirectBase() {
    let redirectBase = 'https://app.pixy.com.co'
    
    // Check for explicit environment variable
    if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
        redirectBase = process.env.NEXT_PUBLIC_APP_URL.startsWith('http')
            ? process.env.NEXT_PUBLIC_APP_URL
            : `https://${process.env.NEXT_PUBLIC_APP_URL}`
    } else if (process.env.NEXT_PUBLIC_APP_DOMAIN && !process.env.NEXT_PUBLIC_APP_DOMAIN.includes('localhost')) {
        // Fallback to domain if URL is not set
        redirectBase = `https://app.${process.env.NEXT_PUBLIC_APP_DOMAIN}`
    }
    
    return redirectBase
}
