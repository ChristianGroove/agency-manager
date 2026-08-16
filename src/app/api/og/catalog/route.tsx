import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const DEFAULT_BRAND_NAME = 'Pixy Storefront'
const DEFAULT_PRIMARY_COLOR = '#4F46E5'
const DEFAULT_SECONDARY_COLOR = '#EC4899'
const ALLOWED_IMAGE_PORTS = new Set(['', '80', '443'])
const PRIVATE_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', 'metadata.google.internal'])

function parseIPv4(ip: string) {
  const parts = ip.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
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

function isPrivateHost(hostname: string) {
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

function sanitizeImageUrl(rawUrl?: string | null): string {
  if (!rawUrl) return ''
  try {
    const url = new URL(rawUrl.trim())
    if (!['http:', 'https:'].includes(url.protocol)) return ''
    if (url.username || url.password) return ''
    if (!ALLOWED_IMAGE_PORTS.has(url.port)) return ''
    if (isPrivateHost(url.hostname)) return ''
    return url.toString()
  } catch {
    return ''
  }
}

function sanitizeColor(rawColor?: string | null, fallback = DEFAULT_PRIMARY_COLOR): string {
  const color = rawColor?.trim()
  return color && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : fallback
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const title = searchParams.get('title')?.slice(0, 100) || 'Producto de Catálogo'
    const category = searchParams.get('category')?.slice(0, 50) || 'Catálogo General'
    const rawPrice = searchParams.get('price')
    const rawComparePrice = searchParams.get('comparePrice')
    const currency = searchParams.get('currency') || 'COP'
    const brand = searchParams.get('brand')?.slice(0, 60) || DEFAULT_BRAND_NAME
    const badge = searchParams.get('badge')?.slice(0, 30) || ''
    const classification = searchParams.get('classification') || 'service'
    const image = sanitizeImageUrl(searchParams.get('image'))
    const primaryColor = sanitizeColor(searchParams.get('primaryColor'), DEFAULT_PRIMARY_COLOR)
    const secondaryColor = sanitizeColor(searchParams.get('secondaryColor'), DEFAULT_SECONDARY_COLOR)

    // Format Prices
    let formattedPrice = ''
    if (rawPrice) {
      const num = Number(rawPrice)
      if (!isNaN(num)) {
        formattedPrice = `$${num.toLocaleString('es-CO')} ${currency}`
      } else {
        formattedPrice = rawPrice
      }
    }

    let formattedComparePrice = ''
    if (rawComparePrice) {
      const num = Number(rawComparePrice)
      if (!isNaN(num)) {
        formattedComparePrice = `$${num.toLocaleString('es-CO')}`
      } else {
        formattedComparePrice = rawComparePrice
      }
    }

    // Classification label
    let classLabel = 'Servicio'
    if (classification === 'physical') classLabel = 'Producto Físico'
    else if (classification === 'digital') classLabel = 'Producto Digital'
    else if (classification === 'subscription') classLabel = 'Suscripción'

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e1b4b 100%)',
            padding: '50px 60px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: '#ffffff',
            position: 'relative',
          }}
        >
          {/* Subtle Ambient Glow */}
          <div
            style={{
              position: 'absolute',
              top: '-100px',
              left: '-100px',
              width: '400px',
              height: '400px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${primaryColor}40 0%, transparent 70%)`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-100px',
              right: '-100px',
              width: '450px',
              height: '450px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${secondaryColor}30 0%, transparent 70%)`,
            }}
          />

          {/* Left Column: Product Information */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%',
              maxWidth: image ? '620px' : '1000px',
              zIndex: 10,
            }}
          >
            {/* Top Bar: Brand & Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 16px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#e2e8f0',
                }}
              >
                {brand}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  background: `${primaryColor}25`,
                  border: `1px solid ${primaryColor}60`,
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#ffffff',
                }}
              >
                {category}
              </div>

              {badge && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    background: `linear-gradient(135deg, ${secondaryColor} 0%, ${primaryColor} 100%)`,
                    fontSize: '14px',
                    fontWeight: '800',
                    color: '#ffffff',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  ★ {badge}
                </div>
              )}
            </div>

            {/* Middle: Title & Classification */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '20px 0' }}>
              <div
                style={{
                  fontSize: title.length > 40 ? '42px' : '52px',
                  fontWeight: '800',
                  lineHeight: 1.15,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                }}
              >
                {title}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '16px',
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontWeight: '600',
                  }}
                >
                  {classLabel}
                </span>
              </div>
            </div>

            {/* Bottom: Pricing & Call to Action */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
              {formattedPrice && (
                <div
                  style={{
                    fontSize: '44px',
                    fontWeight: '900',
                    color: '#38bdf8',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {formattedPrice}
                </div>
              )}

              {formattedComparePrice && (
                <div
                  style={{
                    fontSize: '26px',
                    fontWeight: '500',
                    color: '#64748b',
                    textDecoration: 'line-through',
                  }}
                >
                  {formattedComparePrice}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Product Image Thumbnail */}
          {image && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '450px',
                height: '450px',
                borderRadius: '28px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                padding: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden',
                zIndex: 10,
              }}
            >
              <img
                src={image}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '20px',
                }}
              />
            </div>
          )}
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error) {
    console.error('OG Image Catalog Route Error:', error)

    // Fallback Image
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
            background: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 100%)',
            fontFamily: 'system-ui, sans-serif',
            color: '#ffffff',
          }}
        >
          <div style={{ fontSize: '48px', fontWeight: '800', marginBottom: '16px' }}>
            Catálogo de Productos y Servicios
          </div>
          <div style={{ fontSize: '24px', color: '#94a3b8' }}>Pixy Storefront Portal</div>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }
}
