import { describe, expect, it } from 'vitest'
import { enforceScheduleWindow } from './marketing-utils'
const config = { mode: 'growth' as const, humanize: false, timezone: 'America/Bogota', schedule_window: { start: 9, end: 18 } }
describe('Marketing sending windows', () => {
    it('preserves an allowed instant and uses the configured zone, not the host', () => {
        const inside = new Date('2026-10-09T22:59:30Z')
        expect(enforceScheduleWindow(inside, config)).toBe(inside)
        expect(enforceScheduleWindow(new Date('2026-10-09T23:00:00Z'), config).toISOString()).toBe('2026-10-10T14:00:00.000Z')
    })
    it('waits for the next real opening when a DST jump skips the whole window', () => {
        expect(enforceScheduleWindow(new Date('2026-03-08T06:59:00Z'), { ...config, timezone: 'America/New_York', schedule_window: { start: 2, end: 3 } }).toISOString())
            .toBe('2026-03-09T06:00:00.000Z')
    })
    it('allows repeated local hours in the autumn window', () => {
        const date = new Date('2026-11-01T06:30:00Z')
        expect(enforceScheduleWindow(date, { ...config, timezone: 'America/New_York', schedule_window: { start: 1, end: 2 } })).toBe(date)
    })
})
