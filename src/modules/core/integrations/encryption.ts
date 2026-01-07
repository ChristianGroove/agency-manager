
/**
 * Simple encryption/decryption helper for credentials
 * Currently uses Base64 for MVP/Simulation as per existing conventions.
 * In production this should use AES-256 (e.g. crypto module or Supabase Vault).
 */

export function encryptCredentials(data: any): any {
    if (!data) return {}
    try {
        const str = JSON.stringify(data)
        return { _encrypted: Buffer.from(str).toString('base64') }
    } catch (e) {
        console.error("[Encryption] Failed to encrypt:", e)
        return data // Fallback to raw if fail
    }
}

export function decryptCredentials(data: any): any {
    if (!data || typeof data !== 'object') return data

    // Check for our known encryption keys
    // We support both '_encrypted' (from integrations/actions) and 'encrypted' (legacy/other)
    const encryptedStr = data._encrypted || data.encrypted

    if (encryptedStr && typeof encryptedStr === 'string') {
        try {
            const decoded = Buffer.from(encryptedStr, 'base64').toString('utf-8')
            return JSON.parse(decoded)
        } catch (e) {
            console.error("[Encryption] Failed to decrypt:", e)
            return data // Return as-is if decryption fails (might be raw)
        }
    }

    // Return raw if not encrypted
    return data
}
