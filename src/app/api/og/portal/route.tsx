import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { createClient } from "@/modules/core/database/supabase-server";

export const runtime = 'edge'

const DEFAULT_BRAND_NAME = 'Pixy'
const DEFAULT_PRIMARY_COLOR = '#f205e2'
const DEFAULT_SECONDARY_COLOR = '#9333ea'
const MAX_BRAND_NAME_LENGTH = 80
const ALLOWED_LOGO_PORTS = new Set(['', '80', '443'])
const PRIVATE_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', 'metadata.google.internal'])

type PortalBrandingSettings = {
    agency_name?: string | null
    logo_url?: string | null
    portal_logo_url?: string | null
    primary_color?: string | null
}

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

function isPrivatePortalLogoHost(hostname: string) {
    const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '')
    if (PRIVATE_HOSTNAMES.has(normalized) || normalized.endsWith('.localhost') || normalized.endsWith('.local')) {
        return true
    }

    const ipv4 = parseIPv4(normalized)
    if (ipv4) {
        return isPrivateOrReservedIPv4(ipv4)
    }

    return normalized.includes(':')
}

export function normalizePublicPortalLogoUrl(rawUrl?: string | null) {
    if (!rawUrl) return ''

    try {
        const url = new URL(rawUrl.trim())
        if (!['http:', 'https:'].includes(url.protocol)) return ''
        if (url.username || url.password) return ''
        if (!ALLOWED_LOGO_PORTS.has(url.port)) return ''
        if (isPrivatePortalLogoHost(url.hostname)) return ''

        return url.toString()
    } catch {
        return ''
    }
}

export function normalizePortalPrimaryColor(rawColor?: string | null) {
    const color = rawColor?.trim()
    return color && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)
        ? color
        : DEFAULT_PRIMARY_COLOR
}

export function resolvePortalBranding(settings?: PortalBrandingSettings | null) {
    const brandName = settings?.agency_name?.trim().slice(0, MAX_BRAND_NAME_LENGTH) || DEFAULT_BRAND_NAME
    const logoUrl = normalizePublicPortalLogoUrl(settings?.portal_logo_url) || normalizePublicPortalLogoUrl(settings?.logo_url)
    const primaryColor = normalizePortalPrimaryColor(settings?.primary_color)

    return { brandName, logoUrl, primaryColor }
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const token = searchParams.get('token')

        // Default values
        let brandName = DEFAULT_BRAND_NAME
        let logoUrl = ''
        let primaryColor = DEFAULT_PRIMARY_COLOR // brand-pink
        const secondaryColor = DEFAULT_SECONDARY_COLOR // purple-600

        if (token) {
            // Fetch organization branding via token
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)
            let query = (await createClient()).from('leads').select('organization_id')

            if (isUuid) {
                query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
            } else {
                query = query.eq('portal_short_token', token)
            }

            const { data: client } = await query.single()

            if (client?.organization_id) {
                const { data: settings } = await (await createClient())
                    .from('organization_settings')
                    .select('agency_name, logo_url, portal_logo_url, primary_color')
                    .eq('organization_id', client.organization_id)
                    .single()

                if (settings) {
                    const branding = resolvePortalBranding(settings)
                    brandName = branding.brandName
                    logoUrl = branding.logoUrl
                    primaryColor = branding.primaryColor
                }
            }
        }

        // Generate OG Image
        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                        fontFamily: 'system-ui, sans-serif',
                    }}
                >
                    {/* Card Container */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'white',
                            borderRadius: '32px',
                            padding: '60px 80px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        }}
                    >
                        {/* Logo */}
                        {logoUrl ? (
                            <img
                                src={logoUrl}
                                alt=""
                                width={120}
                                height={120}
                                style={{
                                    objectFit: 'contain',
                                    marginBottom: '24px',
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: '120px',
                                    height: '120px',
                                    borderRadius: '24px',
                                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '24px',
                                    fontSize: '48px',
                                    fontWeight: 'bold',
                                    color: 'white',
                                }}
                            >
                                {brandName.substring(0, 2).toUpperCase()}
                            </div>
                        )}

                        {/* Brand Name */}
                        <div
                            style={{
                                fontSize: '48px',
                                fontWeight: 'bold',
                                color: '#1f2937',
                                marginBottom: '8px',
                                textAlign: 'center',
                            }}
                        >
                            {brandName}
                        </div>

                        {/* Subtitle */}
                        <div
                            style={{
                                fontSize: '28px',
                                color: '#6b7280',
                                textAlign: 'center',
                            }}
                        >
                            Portal de Clientes
                        </div>
                    </div>

                    {/* Footer Badge */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: 'rgba(255, 255, 255, 0.9)',
                            fontSize: '18px',
                        }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        Acceso Seguro
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            }
        )
    } catch (error) {
        console.error('OG Image Generation Error:', error)

        // Fallback image
        return new ImageResponse(
            (
                <div
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #f205e2 0%, #9333ea 100%)',
                        fontFamily: 'system-ui, sans-serif',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'white',
                            borderRadius: '32px',
                            padding: '60px 80px',
                        }}
                    >
                        <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#1f2937' }}>
                            Portal de Clientes
                        </div>
                        <div style={{ fontSize: '28px', color: '#6b7280', marginTop: '8px' }}>
                            Acceso Seguro
                        </div>
                    </div>
                </div>
            ),
            { width: 1200, height: 630 }
        )
    }
}
