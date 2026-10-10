import { describe, it, expect, vi } from 'vitest'
import { applyAudienceFilters, deliveryConfigSchema, normalizeDelay, normalizeMarketingPhone } from './marketing-contracts'

describe('Marketing contracts', () => {
    it('does not silently expand an imported list into the full CRM on legacy REST queries', () => {
        expect(() => applyAudienceFilters({}, { list_id: '21000000-0000-4000-8000-000000000001' })).toThrow('listas requieren')
        expect(() => applyAudienceFilters({}, { list_id: 'invalid' })).toThrow()
    })
    it('normalizes the old duration format without producing an invalid date', () => {
        expect(normalizeDelay({duration:'3',unit:'days'})).toEqual({value:3,unit:'days'})
        expect(normalizeDelay({value:2,unit:'hours'})).toEqual({value:2,unit:'hours'})
        expect(()=>normalizeDelay({duration:'abc',unit:'days'})).toThrow()
        expect(()=>normalizeDelay({value:-1,unit:'minutes'})).toThrow()
    })
    it('normalizes international numbers but does not pretend to verify WhatsApp registration', () => {
        expect(normalizeMarketingPhone('+57 (300) 670-5958')).toBe('573006705958')
        expect(normalizeMarketingPhone('3504076800')).toBeNull()
        expect(normalizeMarketingPhone('123')).toBeNull()
        expect(normalizeMarketingPhone('573006705958<script>')).toBeNull()
    })
    it('uses upper and lower zero score bounds and all preview filters', () => {
        const q:any = {}; for (const fn of ['eq','not','gte','lte','overlaps']) q[fn]=vi.fn(()=>q)
        applyAudienceFilters(q,{score_min:0,score_max:0,status:'open',has_phone:true,tags:['clientes'],
            last_activity_after:'2026-10-01T00:00:00Z',assigned_to:'7b8c6a7d-8541-4570-9c55-10cd84ad9b26'})
        expect(q.gte).toHaveBeenCalledWith('score',0)
        expect(q.lte).toHaveBeenCalledWith('score',0)
        expect(q.gte).toHaveBeenCalledWith('last_activity_at','2026-10-01T00:00:00Z')
        expect(q.eq).toHaveBeenCalledWith('assigned_to','7b8c6a7d-8541-4570-9c55-10cd84ad9b26')
    })
    it('rejects unsupported filters rather than silently producing a different audience', () => {
        expect(()=>applyAudienceFilters({}, {organization_id:'other-tenant'})).toThrow()
    })
    it('validates IANA zones and rejects inverted or empty sending windows', () => {
        const base = { mode: 'growth', humanize: true, timezone: 'America/Bogota', schedule_window: { start: 9, end: 18 } }
        expect(deliveryConfigSchema.parse(base)).toEqual(base)
        expect(() => deliveryConfigSchema.parse({ ...base, timezone: 'Server Local' })).toThrow()
        expect(() => deliveryConfigSchema.parse({ ...base, schedule_window: { start: 18, end: 9 } })).toThrow()
        expect(() => deliveryConfigSchema.parse({ ...base, schedule_window: { start: 9, end: 9 } })).toThrow()
    })
})
