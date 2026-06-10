import { describe, expect, it } from 'vitest'
import { resolvePortalInsightsAccess } from './access'

describe('resolvePortalInsightsAccess', () => {
    it('lets explicit disabled override block all insights', () => {
        const access = resolvePortalInsightsAccess([
            { name: 'Meta Ads', status: 'active', insights_access: 'ALL' },
        ], { override: false, access_level: 'ALL' })

        expect(access).toEqual({ show: false, mode: { organic: false, ads: false } })
    })

    it('uses explicit access level when manual override is enabled', () => {
        const access = resolvePortalInsightsAccess([], { override: true, access_level: 'ADS' })

        expect(access).toEqual({ show: true, mode: { organic: false, ads: true } })
    })

    it('derives automatic access from active services and normalized keywords', () => {
        const access = resolvePortalInsightsAccess([
            { name: 'Contenido organico mensual', status: 'active', insights_access: 'NONE' },
            { name: 'Pauta Meta', status: 'active', insights_access: 'NONE' },
            { name: 'Google Ads pausado', status: 'paused', insights_access: 'ADS' },
        ])

        expect(access).toEqual({ show: true, mode: { organic: true, ads: true } })
    })
})
