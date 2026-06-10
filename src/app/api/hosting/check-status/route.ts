import { NextResponse } from 'next/server'
import { lookup } from 'dns/promises'
import { isIP } from 'net'

export const dynamic = 'force-dynamic'

const ALLOWED_PORTS = new Set(['', '80', '443'])
const PRIVATE_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

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

export function isPrivateOrReservedAddress(address: string) {
    const normalized = address.toLowerCase().replace(/^\[|\]$/g, '')

    if (isIP(normalized) === 4) {
        const parts = parseIPv4(normalized)
        if (!parts) return true

        return isPrivateOrReservedIPv4(parts)
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
            normalized.startsWith('fe80') ||
            normalized.startsWith('::ffff:127.') ||
            normalized.startsWith('::ffff:10.') ||
            normalized.startsWith('::ffff:192.168.')
        )
    }

    return true
}

export function normalizeHostingCheckUrl(rawUrl: string) {
    const trimmedUrl = rawUrl.trim()
    const url = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`
    return new URL(url)
}

async function validatePublicHostingUrl(url: URL) {
    if (!['http:', 'https:'].includes(url.protocol)) {
        return 'Unsupported URL protocol'
    }

    if (url.username || url.password) {
        return 'URL credentials are not allowed'
    }

    if (!ALLOWED_PORTS.has(url.port)) {
        return 'Unsupported URL port'
    }

    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    if (PRIVATE_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost')) {
        return 'Private hosts are not allowed'
    }

    if (isIP(hostname)) {
        return isPrivateOrReservedAddress(hostname) ? 'Private hosts are not allowed' : null
    }

    try {
        const addresses = await lookup(hostname, { all: true, verbatim: true })
        return addresses.some(result => isPrivateOrReservedAddress(result.address))
            ? 'Private hosts are not allowed'
            : null
    } catch {
        return null
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const rawUrl = searchParams.get('url')

    if (!rawUrl) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    let url: URL
    try {
        url = normalizeHostingCheckUrl(rawUrl)
    } catch {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    const validationError = await validatePublicHostingUrl(url)
    if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const start = Date.now()
    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout

        const response = await fetch(url.toString(), {
            method: 'HEAD',
            redirect: 'manual',
            signal: controller.signal,
            cache: 'no-store'
        })

        clearTimeout(timeoutId)

        const latency = Date.now() - start

        if (response.ok || response.status < 400) {
            return NextResponse.json({
                status: 'online',
                latency,
                code: response.status
            })
        } else {
            return NextResponse.json({
                status: 'online', // Server responded, but with error (e.g. 404/500), mostly still considered "up" compared to DNS failure
                latency,
                code: response.status,
                warning: `Status code ${response.status}`
            })
        }
    } catch (error: any) {
        return NextResponse.json({
            status: 'offline',
            error: error.message
        }, { status: 200 }) // Return 200 to frontend so it can process the JSON offline status
    }
}
