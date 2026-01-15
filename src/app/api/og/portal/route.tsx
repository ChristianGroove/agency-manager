import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const token = searchParams.get('token')

        // Default values
        let brandName = 'Pixy'
        let logoUrl = ''
        let primaryColor = '#f205e2' // brand-pink
        let secondaryColor = '#9333ea' // purple-600

        if (token) {
            // Fetch organization branding via token
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)
            let query = supabaseAdmin.from('clients').select('organization_id')

            if (isUuid) {
                query = query.or(`portal_short_token.eq.${token},portal_token.eq.${token}`)
            } else {
                query = query.eq('portal_short_token', token)
            }

            const { data: client } = await query.single()

            if (client?.organization_id) {
                const { data: settings } = await supabaseAdmin
                    .from('organization_settings')
                    .select('agency_name, logo_url, portal_logo_url, primary_color')
                    .eq('organization_id', client.organization_id)
                    .single()

                if (settings) {
                    brandName = settings.agency_name || 'Pixy'
                    logoUrl = settings.portal_logo_url || settings.logo_url || ''
                    if (settings.primary_color) {
                        primaryColor = settings.primary_color
                    }
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
