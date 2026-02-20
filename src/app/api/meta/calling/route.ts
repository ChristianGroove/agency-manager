import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentOrganizationId } from '@/modules/core/organizations/actions'

const META_API_VERSION = 'v24.0'
const META_GRAPH_URL = 'https://graph.facebook.com'

/**
 * Resolves Meta credentials from the active WhatsApp connection
 * Same pattern as resolveMetaCredentials in template-actions.ts
 */
async function resolveCallingCredentials() {
    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new Error('No active organization')

    const supabase = await createClient()

    const { data: connection, error } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('organization_id', orgId)
        .in('provider_key', ['meta_whatsapp', 'whatsapp_cloud'])
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (error || !connection) {
        throw new Error('No active WhatsApp connection found')
    }

    // Decrypt credentials
    const { decryptObject } = await import('@/modules/core/integrations/encryption')
    let creds = connection.credentials as any
    if (typeof creds === 'string') {
        try { creds = JSON.parse(creds) } catch { /* noop */ }
    }
    creds = decryptObject(creds)

    const metadata = (connection.metadata as any) || {}

    const accessToken = creds?.accessToken
        || creds?.access_token
        || process.env.META_API_TOKEN
        || process.env.META_ACCESS_TOKEN

    const phoneNumberId = creds?.phoneNumberId
        || creds?.phone_number_id
        || metadata?.asset_id
        || process.env.META_PHONE_NUMBER_ID

    if (!accessToken) throw new Error('Missing Meta access token')
    if (!phoneNumberId) throw new Error('Missing Phone Number ID')

    return { accessToken, phoneNumberId }
}

/**
 * GET /api/meta/calling
 * Fetches the current calling status from Meta Graph API
 */
export async function GET() {
    try {
        const { accessToken, phoneNumberId } = await resolveCallingCredentials()

        const response = await fetch(
            `${META_GRAPH_URL}/${META_API_VERSION}/${phoneNumberId}/whatsapp_business_calling_settings`,
            {
                headers: { 'Authorization': `Bearer ${accessToken}` },
                cache: 'no-store'
            }
        )

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}))
            // If 400 or the endpoint doesn't exist yet, return defaults
            if (response.status === 400 || response.status === 404) {
                return NextResponse.json({
                    enabled: false,
                    iconVisibility: 'HIDE',
                    source: 'default'
                })
            }
            console.error('[Calling GET] Meta API error:', errData)
            return NextResponse.json({
                enabled: false,
                iconVisibility: 'HIDE',
                source: 'error',
                error: errData?.error?.message || 'Unknown error'
            })
        }

        const data = await response.json()

        return NextResponse.json({
            enabled: data.voice_status === 'ENABLED' || data.status === 'ENABLED',
            iconVisibility: data.call_icon_visibility || 'HIDE',
            source: 'meta'
        })
    } catch (error: any) {
        console.error('[Calling GET] Error:', error.message)
        return NextResponse.json(
            { error: error.message, enabled: false, iconVisibility: 'HIDE', source: 'error' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/meta/calling
 * Toggles calling status or icon visibility
 * 
 * Body: { action: 'toggle', enabled: boolean }
 *    or { action: 'icon', visibility: 'DEFAULT' | 'HIDE' }
 */
export async function POST(req: NextRequest) {
    try {
        const { accessToken, phoneNumberId } = await resolveCallingCredentials()
        const body = await req.json()
        const { action, enabled, visibility } = body

        if (action === 'toggle' || action === undefined) {
            // Enable/disable calling
            const targetEnabled = enabled ?? body.enabled
            if (typeof targetEnabled !== 'boolean') {
                return NextResponse.json({ error: 'Missing "enabled" field' }, { status: 400 })
            }

            const response = await fetch(
                `${META_GRAPH_URL}/${META_API_VERSION}/${phoneNumberId}/whatsapp_business_calling_settings`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        voice_status: targetEnabled ? 'ENABLED' : 'DISABLED'
                    })
                }
            )

            const data = await response.json()

            if (!response.ok) {
                console.error('[Calling POST toggle] Meta error:', data)
                return NextResponse.json({
                    success: false,
                    error: data?.error?.message || 'Meta API error'
                }, { status: response.status })
            }

            return NextResponse.json({
                success: true,
                status: targetEnabled ? 'ENABLED' : 'DISABLED',
                meta_response: data
            })
        }

        if (action === 'icon') {
            // Set icon visibility
            const targetVisibility = visibility || 'DEFAULT'
            if (!['DEFAULT', 'HIDE'].includes(targetVisibility)) {
                return NextResponse.json({ error: 'visibility must be DEFAULT or HIDE' }, { status: 400 })
            }

            const response = await fetch(
                `${META_GRAPH_URL}/${META_API_VERSION}/${phoneNumberId}/whatsapp_business_calling_settings`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        call_icon_visibility: targetVisibility
                    })
                }
            )

            const data = await response.json()

            if (!response.ok) {
                console.error('[Calling POST icon] Meta error:', data)
                return NextResponse.json({
                    success: false,
                    error: data?.error?.message || 'Meta API error'
                }, { status: response.status })
            }

            return NextResponse.json({
                success: true,
                iconVisibility: targetVisibility,
                meta_response: data
            })
        }

        return NextResponse.json({ error: 'Unknown action. Use "toggle" or "icon".' }, { status: 400 })
    } catch (error: any) {
        console.error('[Calling POST] Error:', error.message)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
