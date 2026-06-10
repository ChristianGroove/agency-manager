import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/modules/core/database/supabase-server'
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions'

const META_API_VERSION = 'v22.0'
const META_GRAPH_URL = 'https://graph.facebook.com'
const META_CALLING_PUBLIC_ERROR = 'Meta Calling request failed'

class CallingRouteError extends Error {
    constructor(message: string, public status = 500) {
        super(message)
    }
}

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || !!process.env.VERCEL_ENV
}

function summarizeCallingError(error: unknown) {
    if (error instanceof Error) {
        return { name: error.name }
    }

    if (error && typeof error === 'object') {
        const graphError = 'error' in error ? (error as any).error : error
        return {
            type: typeof error,
            code: graphError?.code,
            subcode: graphError?.error_subcode || graphError?.subcode,
            metaType: graphError?.type,
        }
    }

    return { type: typeof error }
}

function logCallingError(label: string, error: unknown) {
    if (!isDeployedRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, summarizeCallingError(error))
}

function logCallingResponse(label: string, data: unknown) {
    if (!isDeployedRuntime()) {
        console.log(label, JSON.stringify(data))
        return
    }

    const payload = data && typeof data === 'object' ? data as Record<string, any> : {}
    console.log(label, {
        hasCalling: !!payload.calling,
        hasDisplayPhone: !!payload.display_phone_number,
        phoneNumberId: payload.id ? 'present' : 'missing',
        success: typeof payload.success === 'boolean' ? payload.success : undefined,
    })
}

function publicCallingError(error: unknown, fallback: string) {
    if (error instanceof CallingRouteError && (!isDeployedRuntime() || error.status < 500)) {
        return error.message
    }

    if (isDeployedRuntime()) {
        return fallback
    }

    return error instanceof Error ? error.message : fallback
}

function publicMetaGraphError(data: unknown) {
    if (isDeployedRuntime()) {
        return META_CALLING_PUBLIC_ERROR
    }

    if (data && typeof data === 'object') {
        const message = (data as any).error?.message
        if (typeof message === 'string' && message.length > 0) {
            return message
        }
    }

    return META_CALLING_PUBLIC_ERROR
}

function metaCallingFailurePayload(data: unknown) {
    const payload: Record<string, unknown> = {
        success: false,
        error: publicMetaGraphError(data),
    }

    if (!isDeployedRuntime() && data && typeof data === 'object') {
        const graphError = (data as any).error
        if (graphError) payload.meta_error = graphError
    }

    return payload
}

function callingErrorResponse(error: unknown, fallback: Record<string, unknown> = {}) {
    const isExpected = error instanceof CallingRouteError
    const message = publicCallingError(error, 'Internal server error')

    if (!isExpected) {
        logCallingError('[Calling API] Error:', error)
    }

    return NextResponse.json(
        { error: message, ...fallback },
        { status: isExpected ? error.status : 500 }
    )
}

/**
 * Resolves Meta credentials from the active WhatsApp connection
 */
async function resolveCallingCredentials() {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
        throw new CallingRouteError('Unauthorized', 401)
    }

    const orgId = await getCurrentOrganizationId()
    if (!orgId) throw new CallingRouteError('No active organization', 403)

    const { data: connection, error } = await supabase
        .from('integration_connections')
        .select('*')
        .eq('organization_id', orgId)
        .in('provider_key', ['meta_whatsapp', 'whatsapp_cloud'])
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (!isDeployedRuntime()) {
        console.log('[resolveCallingCredentials] DB Lookup for org:', orgId, 'Found:', !!connection, 'Error:', error?.message);
    } else {
        console.log('[resolveCallingCredentials] DB Lookup:', { found: !!connection, hasError: !!error });
    }

    if (error || !connection) {
        throw new CallingRouteError('No active WhatsApp connection found', 404)
    }

    // Decrypt credentials
    const { decryptObject } = await import('@/modules/infrastructure/integrations/encryption')
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
        throw new CallingRouteError('Missing Meta access token', 500);
    }
    if (!phoneNumberId) {
        console.error('[resolveCallingCredentials] âŒ Missing Phone Number ID');
        throw new CallingRouteError('Missing Phone Number ID', 500);
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
        logCallingResponse('[Calling GET] Response:', data)

        if (!response.ok) {
            logCallingError('[Calling GET] Meta API error:', data)

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
                error: publicMetaGraphError(data)
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
        return callingErrorResponse(error, { enabled: false, iconVisibility: 'HIDE', source: 'error' })
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

            console.log('[Calling POST toggle] Sending:', { calling: callingPayload })

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
            logCallingResponse('[Calling POST toggle] Response:', data)

            if (!response.ok) {
                logCallingError('[Calling POST toggle] Meta error:', data)
                return NextResponse.json(metaCallingFailurePayload(data), { status: response.status })
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

            console.log('[Calling POST icon] Sending:', { calling: { call_icon_visibility: metaVisibility } })

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
            logCallingResponse('[Calling POST icon] Response:', data)

            if (!response.ok) {
                logCallingError('[Calling POST icon] Meta error:', data)
                return NextResponse.json(metaCallingFailurePayload(data), { status: response.status })
            }

            return NextResponse.json({
                success: true,
                iconVisibility: targetVisibility,
                meta_response: data
            })
        }

        return NextResponse.json({ error: 'Unknown action. Use "toggle" or "icon".' }, { status: 400 })
    } catch (error: any) {
        return callingErrorResponse(error)
    }
}

