import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions'

const META_API_VERSION = 'v22.0'
const META_GRAPH_URL = 'https://graph.facebook.com'

/**
 * Resolves Meta credentials from the active WhatsApp connection
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

    console.log('[resolveCallingCredentials] DB Lookup for org:', orgId, 'Found:', !!connection, 'Error:', error?.message);

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

    if (!accessToken) {
        console.error('[resolveCallingCredentials] âŒ Missing Meta access token');
        throw new Error('Missing Meta access token');
    }
    if (!phoneNumberId) {
        console.error('[resolveCallingCredentials] âŒ Missing Phone Number ID');
        throw new Error('Missing Phone Number ID');
    }

    console.log('[resolveCallingCredentials] âœ… Resolved:', { phoneNumberId, hasToken: !!accessToken });
    return { accessToken, phoneNumberId }
}

/**
 * GET /api/meta/calling
 * Fetches current calling settings from Meta Graph API
 * Uses: GET /{phone-number-id}/settings to read calling config
 */
export async function GET() {
    try {
        const { accessToken, phoneNumberId } = await resolveCallingCredentials()

        // Query the phone number node for calling fields
        const response = await fetch(
            `${META_GRAPH_URL}/${META_API_VERSION}/${phoneNumberId}?fields=id,display_phone_number,calling`,
            {
                headers: { 'Authorization': `Bearer ${accessToken}` },
                cache: 'no-store'
            }
        )

        const data = await response.json()
        console.log('[Calling GET] Response:', JSON.stringify(data))

        if (!response.ok) {
            console.error('[Calling GET] Meta API error:', data)

            // If calling not available, return defaults
            if (response.status === 400 || response.status === 404) {
                return NextResponse.json({
                    enabled: false,
                    iconVisibility: 'HIDE',
                    source: 'default',
                    note: 'Calling API may not be available for this phone number'
                })
            }

            return NextResponse.json({
                enabled: false,
                iconVisibility: 'HIDE',
                source: 'error',
                error: data?.error?.message || 'Unknown error'
            })
        }

        // Parse the calling object from the response
        const calling = data.calling || {}
        const isEnabled = calling.status === 'ENABLED'
        const iconVis = calling.call_icon_visibility || (isEnabled ? 'DEFAULT' : 'DISABLED')

        return NextResponse.json({
            enabled: isEnabled,
            iconVisibility: iconVis === 'DEFAULT' ? 'DEFAULT' : 'HIDE',
            callingData: calling,
            phoneNumberId: data.id,
            displayPhone: data.display_phone_number,
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
 * Toggles calling via: POST /{phone-number-id}/settings
 * Body to Meta: { calling: { status: 'ENABLED' | 'DISABLED', call_icon_visibility: 'DEFAULT' | 'DISABLED' } }
 * 
 * Actions:
 *   { action: 'toggle', enabled: boolean }
 *   { action: 'icon', visibility: 'DEFAULT' | 'HIDE' }
 */
export async function POST(req: NextRequest) {
    try {
        const { accessToken, phoneNumberId } = await resolveCallingCredentials()
        const body = await req.json()
        const { action, enabled, visibility } = body

        if (action === 'toggle' || action === undefined) {
            const targetEnabled = enabled ?? body.enabled
            if (typeof targetEnabled !== 'boolean') {
                return NextResponse.json({ error: 'Missing "enabled" field' }, { status: 400 })
            }

            // POST /{phone-number-id}/settings with calling object
            const callingPayload: any = {
                status: targetEnabled ? 'ENABLED' : 'DISABLED'
            }
            // When enabling, also show call icon by default
            if (targetEnabled) {
                callingPayload.call_icon_visibility = 'DEFAULT'
            }

            console.log('[Calling POST toggle] Sending:', JSON.stringify({ calling: callingPayload }))

            const response = await fetch(
                `${META_GRAPH_URL}/${META_API_VERSION}/${phoneNumberId}/settings`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        calling: callingPayload
                    })
                }
            )

            const data = await response.json()
            console.log('[Calling POST toggle] Response:', JSON.stringify(data))

            if (!response.ok) {
                console.error('[Calling POST toggle] Meta error:', data)
                return NextResponse.json({
                    success: false,
                    error: data?.error?.message || 'Meta API error',
                    meta_error: data?.error
                }, { status: response.status })
            }

            return NextResponse.json({
                success: true,
                status: targetEnabled ? 'ENABLED' : 'DISABLED',
                meta_response: data
            })
        }

        if (action === 'icon') {
            // Set call icon visibility independently
            const targetVisibility = visibility || 'DEFAULT'
            if (!['DEFAULT', 'HIDE'].includes(targetVisibility)) {
                return NextResponse.json({ error: 'visibility must be DEFAULT or HIDE' }, { status: 400 })
            }

            // Meta uses 'DEFAULT' for visible, 'DISABLED' for hidden
            const metaVisibility = targetVisibility === 'DEFAULT' ? 'DEFAULT' : 'DISABLED'

            console.log('[Calling POST icon] Sending:', JSON.stringify({ calling: { call_icon_visibility: metaVisibility } }))

            const response = await fetch(
                `${META_GRAPH_URL}/${META_API_VERSION}/${phoneNumberId}/settings`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        calling: {
                            call_icon_visibility: metaVisibility
                        }
                    })
                }
            )

            const data = await response.json()
            console.log('[Calling POST icon] Response:', JSON.stringify(data))

            if (!response.ok) {
                console.error('[Calling POST icon] Meta error:', data)
                return NextResponse.json({
                    success: false,
                    error: data?.error?.message || 'Meta API error',
                    meta_error: data?.error
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

