/**
 * Auth Link Utilities
 * 
 * Provides functions to handle and transform Supabase authentication links
 * into secure, manual-verification links that thrive in corporate email environments.
 */

/**
 * Transforms a Supabase-generated action_link into a secure Pixy confirm link.
 * 
 * Instead of sending the user directly to Supabase's redirector (which bots click),
 * we send them to our /auth/confirm page with the token_hash.
 */
export function getSecureAuthLink(
    actionLink: string, 
    type: string, 
    redirectBase: string,
    next: string = '/dashboard'
): string {
    try {
        const url = new URL(actionLink);
        
        // Supabase links can use token_hash, token, or code
        const tokenHash = url.searchParams.get('token_hash') || url.searchParams.get('token');
        const code = url.searchParams.get('code');
        
        const targetUrl = new URL(`${redirectBase}/auth/confirm`);
        
        if (tokenHash) {
            targetUrl.searchParams.set('token_hash', tokenHash);
            targetUrl.searchParams.set('type', type);
        } else if (code) {
            targetUrl.searchParams.set('code', code);
        } else {
            // If we can't find a token, return original link as fallback
            console.warn('[getSecureAuthLink] No token found in action link, using original.');
            return actionLink;
        }
        
        targetUrl.searchParams.set('next', next);
        
        return targetUrl.toString();
    } catch (e) {
        console.error('[getSecureAuthLink] Error parsing action link:', e);
        return actionLink;
    }
}
