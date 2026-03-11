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
        
        // Supabase links usually have the token_hash in searchParams for verifyOtp flow
        // Or in some cases it might be a direct link we need to parse.
        let tokenHash = url.searchParams.get('token_hash');
        
        // Fallback: If no token_hash, try to extract it from 'code' if it's a PKCE link
        // (Though we prefer token_hash for verifyOtp as it's more robust for custom pages)
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
