import { NextRequest, NextResponse } from 'next/server'
import { transcribeAudio } from '@/modules/features/messaging/messaging-actions'
import { getCurrentOrganizationId } from '@/modules/core/organizations/organization-actions'
import { createClient } from '@/modules/core/database/supabase-server'
import { lookup } from 'dns/promises'
import { isIP } from 'net'
import { aiRouteErrorMessage, logAiRouteError } from '../_error-utils'

const MAX_AUDIO_URL_LENGTH = 2_048
const PUBLIC_TRANSCRIBE_ERROR = 'Audio transcription failed'
const ALLOWED_AUDIO_PORTS = new Set(['', '80', '443'])
const PRIVATE_AUDIO_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', 'metadata.google.internal'])

function parseIPv4(ip: string) {
    const parts = ip.split('.').map(part => Number(part))
    if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) {
        return null
    }

    return parts
}

function isPrivateOrReservedIPv4(parts: number[]) {
    const [a, b] = parts
    return (
        a === 0 ||
        a === 10 ||
        a === 127 ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 192 && b === 0) ||
        (a === 198 && (b === 18 || b === 19)) ||
        a >= 224
    )
}

export function isPrivateOrReservedAudioAddress(address: string) {
    const normalized = address.toLowerCase().replace(/^\[|\]$/g, '')

    if (isIP(normalized) === 4) {
        const parts = parseIPv4(normalized)
        return !parts || isPrivateOrReservedIPv4(parts)
    }

    if (isIP(normalized) === 6) {
        const mappedIPv4 = normalized.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)
        if (mappedIPv4) {
            const parts = parseIPv4(mappedIPv4[1])
            return !parts || isPrivateOrReservedIPv4(parts)
        }

        return (
            normalized === '::' ||
            normalized === '::1' ||
            normalized.startsWith('fc') ||
            normalized.startsWith('fd') ||
            normalized.startsWith('fe80')
        )
    }

    return true
}

export async function validatePublicAudioUrl(rawUrl: string) {
    if (rawUrl.length > MAX_AUDIO_URL_LENGTH) {
        return { error: 'Audio URL is too long' }
    }

    let url: URL
    try {
        url = new URL(rawUrl.trim())
    } catch {
        return { error: 'Invalid audio URL' }
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
        return { error: 'Unsupported audio URL protocol' }
    }

    if (url.username || url.password) {
        return { error: 'Audio URL credentials are not allowed' }
    }

    if (!ALLOWED_AUDIO_PORTS.has(url.port)) {
        return { error: 'Unsupported audio URL port' }
    }

    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    if (PRIVATE_AUDIO_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
        return { error: 'Private audio hosts are not allowed' }
    }

    if (isIP(hostname)) {
        return isPrivateOrReservedAudioAddress(hostname)
            ? { error: 'Private audio hosts are not allowed' }
            : { url }
    }

    try {
        const addresses = await lookup(hostname, { all: true, verbatim: true })
        return addresses.some(result => isPrivateOrReservedAudioAddress(result.address))
            ? { error: 'Private audio hosts are not allowed' }
            : { url }
    } catch {
        return { error: 'Unable to verify audio host' }
    }
}

export async function POST(req: NextRequest) {
    try {
        const { audioUrl, messageId } = await req.json()

        if (typeof audioUrl !== 'string' || !audioUrl.trim()) {
            return NextResponse.json(
                { success: false, error: 'audioUrl is required' },
                { status: 400 }
            )
        }

        if (messageId !== undefined && (typeof messageId !== 'string' || !messageId.trim())) {
            return NextResponse.json(
                { success: false, error: 'messageId must be a non-empty string' },
                { status: 400 }
            )
        }

        const orgId = await getCurrentOrganizationId()
        if (!orgId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const audioValidation = await validatePublicAudioUrl(audioUrl)
        if ('error' in audioValidation) {
            return NextResponse.json({ success: false, error: audioValidation.error }, { status: 400 })
        }

        const normalizedMessageId = typeof messageId === 'string' ? messageId.trim() : undefined
        if (normalizedMessageId) {
            const supabase = await createClient()
            const { data: message, error: messageError } = await supabase
                .from('messages')
                .select('id, conversation_id')
                .eq('id', normalizedMessageId)
                .single()

            if (messageError || !message?.conversation_id) {
                return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 })
            }

            const { data: conversation, error: conversationError } = await supabase
                .from('conversations')
                .select('id')
                .eq('id', message.conversation_id)
                .eq('organization_id', orgId)
                .single()

            if (conversationError || !conversation) {
                return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 })
            }
        }

        const result = await transcribeAudio(audioValidation.url.toString(), normalizedMessageId)

        return NextResponse.json(result)

    } catch (error: unknown) {
        logAiRouteError('[Transcribe API] Error:', error)
        return NextResponse.json(
            { success: false, error: aiRouteErrorMessage(error, PUBLIC_TRANSCRIBE_ERROR) },
            { status: 500 }
        )
    }
}
