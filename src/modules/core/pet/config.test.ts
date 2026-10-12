import { describe, expect, it } from 'vitest'
import { DEFAULT_PET_SETTINGS, normalizePetColor, resolveDashboardPetConfig, resolvePetPalette } from './config'
import { petSettingsSchema, readPetSettings } from './schema'
import type { BrandingConfig } from '@/types/branding'

const pixyId = '11111111-1111-4111-8111-111111111111'
const tenantId = '22222222-2222-4222-8222-222222222222'
const enabled = { ...DEFAULT_PET_SETTINGS, enabled: true, pixyOrganizationId: pixyId }

describe('pet configuration trust boundary', () => {
    it.each([undefined, null, {}, { version: 2, enabled: true }, { enabled: true }, { version: 1, enabled: 'true' }])('fails closed for missing or invalid config %j', input => {
        expect(readPetSettings(input).enabled).toBe(false)
    })
    it.each([
        { color: 'var(--primary)' }, { color: '#fff; background:url(x)' }, { speed: Infinity },
        { speed: -1 }, { desktopSize: 10000 }, { shape: 'custom' }, { script: 'alert(1)' },
    ])('rejects unsafe or unbounded parameters %j', input => {
        expect(petSettingsSchema.safeParse({ ...enabled, ...input }).success).toBe(false)
    })
    it('never enables a pet without organization context or a master switch', () => {
        expect(resolveDashboardPetConfig(enabled, null).enabled).toBe(false)
        expect(resolveDashboardPetConfig({ ...enabled, enabled: false, audience: 'all' }, tenantId).enabled).toBe(false)
    })
    it('limits the pilot to the selected ID and allows expansion explicitly', () => {
        expect(resolveDashboardPetConfig(enabled, pixyId).enabled).toBe(true)
        expect(resolveDashboardPetConfig(enabled, tenantId).enabled).toBe(false)
        expect(resolveDashboardPetConfig({ ...enabled, audience: 'all' }, tenantId).enabled).toBe(true)
    })
    it('uses Pixy colors for Pixy and resolves each tenant color independently', () => {
        const branding = { colors: { primary: '#abc', secondary: '' } } as BrandingConfig
        const pixy = resolveDashboardPetConfig(enabled, pixyId)
        expect(resolvePetPalette(pixy, branding).color).toBe(enabled.color)
        const tenant = resolveDashboardPetConfig({ ...enabled, audience: 'all' }, tenantId)
        expect(resolvePetPalette(tenant, branding)).toEqual({ color: '#AABBCC', trimColor: enabled.trimColor, screenColor: enabled.screenColor })
        expect(resolvePetPalette(tenant, null).color).toBe(enabled.color)
    })
    it('normalizes HEX and safely rejects unsupported CSS colors', () => {
        expect(normalizePetColor(' #abc ', '#000000')).toBe('#AABBCC')
        expect(normalizePetColor('oklch(0.5 0.3 0)', '#000000')).toBe('#000000')
    })
})
