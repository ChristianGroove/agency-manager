import { describe, expect, it, vi } from 'vitest'

vi.mock('next/og', () => ({
    ImageResponse: class ImageResponse {
        constructor() {}
    },
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {},
}))

import {
    normalizePortalPrimaryColor,
    normalizePublicPortalLogoUrl,
    resolvePortalBranding,
} from './route'

describe('/api/og/portal branding sanitization', () => {
    it('keeps public HTTP image URLs on standard ports', () => {
        expect(normalizePublicPortalLogoUrl(' https://cdn.example.com/logo.png ')).toBe('https://cdn.example.com/logo.png')
        expect(normalizePublicPortalLogoUrl('http://cdn.example.com/logo.png')).toBe('http://cdn.example.com/logo.png')
    })

    it('drops logo URLs that could force internal or unsafe server-side fetches', () => {
        const unsafeUrls = [
            'javascript:alert(1)',
            'file:///etc/passwd',
            'http://localhost/logo.png',
            'http://127.0.0.1/logo.png',
            'http://10.0.0.8/logo.png',
            'http://192.168.1.10/logo.png',
            'http://[::1]/logo.png',
            'https://metadata.google.internal/logo.png',
            'https://cdn.example.com:8080/logo.png',
            'https://user:pass@cdn.example.com/logo.png',
        ]

        for (const unsafeUrl of unsafeUrls) {
            expect(normalizePublicPortalLogoUrl(unsafeUrl)).toBe('')
        }
    })

    it('allows only hex colors for generated CSS', () => {
        expect(normalizePortalPrimaryColor('#abc')).toBe('#abc')
        expect(normalizePortalPrimaryColor('#123abc')).toBe('#123abc')
        expect(normalizePortalPrimaryColor('red')).toBe('#f205e2')
        expect(normalizePortalPrimaryColor('url(http://localhost)')).toBe('#f205e2')
    })

    it('resolves branding with bounded names and safe logo precedence', () => {
        const branding = resolvePortalBranding({
            agency_name: ` ${'A'.repeat(120)} `,
            logo_url: 'https://cdn.example.com/default.png',
            portal_logo_url: 'http://localhost/internal.png',
            primary_color: 'rgb(1, 2, 3)',
        })

        expect(branding.brandName).toHaveLength(80)
        expect(branding.logoUrl).toBe('https://cdn.example.com/default.png')
        expect(branding.primaryColor).toBe('#f205e2')
    })
})
