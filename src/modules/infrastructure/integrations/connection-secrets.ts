import { supabaseAdmin } from '@/modules/core/database/supabase-admin'
import { decryptObject } from './encryption'

/** Server-only: call with credentials from an already authorized connection row.
 * Never accept a client-supplied secret reference. Background callers must scope
 * their connection lookup to the job's organization before resolving credentials.
 */
export async function resolveConnectionCredentials(value: any): Promise<Record<string, any>> {
    const credentials = typeof value === 'string' ? JSON.parse(value) : value
    if (!credentials?._private) return decryptObject(credentials) || {}
    const { data, error } = await supabaseAdmin.from('integration_connection_secrets')
        .select('credentials').eq('connection_id', credentials._private).single()
    if (error || !data) throw new Error('Connection credentials unavailable')
    const decrypted = decryptObject(data.credentials)
    if (!decrypted) throw new Error('Connection credentials unavailable')
    return decrypted
}
export function assertRawCredentialInput(value: any) {
    if (!value || typeof value !== 'object' || value._private || value._encrypted) {
        throw new Error('Provide credentials, not a stored credential reference')
    }
}
