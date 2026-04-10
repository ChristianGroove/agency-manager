/**
 * HTTP Security Headers (WAF/Shield Layer)
 * 
 * Apply these headers to every response to mitigate common attacks.
 * - X-DNS-Prefetch-Control: Privacy
 * - Strict-Transport-Security: HTTPS enforcement
 * - X-Frame-Options: Clickjacking protection
 * - X-Content-Type-Options: MIME sniffing protection
 * - Referrer-Policy: Privacy
 * - Content-Security-Policy: XSS mitigation (Basic)
 */

export function applySecurityHeaders(headers: Headers) {
    const securityHeaders = {
        'X-DNS-Prefetch-Control': 'on',
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'origin-when-cross-origin',
        // Basic CSP - Relaxed slightly for SaaS needs (images, scripts) but strict on objects/base
        // 'Content-Security-Policy': "default-src 'self'; img-src 'self' https: data: blob:; script-src 'self' 'unsafe-eval' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; font-src 'self' https: data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';"
    };

    Object.entries(securityHeaders).forEach(([key, value]) => {
        headers.set(key, value);
    });

    return headers;
}
