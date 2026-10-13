import { afterEach, expect, it, vi } from 'vitest'
import { HelpDiagnostics } from './diagnostics'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs() })

it('emits only fixed metadata once and never the storage warning body', async () => {
    vi.stubEnv('PIXY_HELP_DIAGNOSTICS_ENABLED', 'true')
    const log = vi.spyOn(console, 'info').mockImplementation(() => {})
    const trace = new HelpDiagnostics()
    trace.organizationId = 'not a tenant: sensitive text'
    trace.articleIds = ['inbox.notes', 'sensitive arbitrary text']
    trace.mode = 'v2'
    trace.selectionUsed = true
    await trace.measure('selection', async () => undefined)
    trace.complete({ success: true, storageError: 'private storage error' })
    trace.complete({ success: false })
    expect(log).toHaveBeenCalledTimes(1)
    const record = JSON.parse(log.mock.calls[0][1])
    expect(record).toMatchObject({ organization_id: null, article_ids: ['inbox.notes'], storage_warning: true, outcome: 'answered' })
    expect(JSON.stringify(record)).not.toMatch(/sensitive|private|question|response|prompt/)
})

it('is off by default and does not interfere when the logging sink fails', () => {
    vi.stubEnv('PIXY_HELP_DIAGNOSTICS_ENABLED', 'false')
    const log = vi.spyOn(console, 'info').mockImplementation(() => { throw new Error('sink failed') })
    new HelpDiagnostics().complete({ success: true })
    expect(log).not.toHaveBeenCalled()
    vi.stubEnv('PIXY_HELP_DIAGNOSTICS_ENABLED', 'true')
    expect(() => new HelpDiagnostics().complete({ success: true })).not.toThrow()
})

it('classifies failed model calls without logging provider details', async () => {
    vi.stubEnv('PIXY_HELP_DIAGNOSTICS_ENABLED', 'true')
    const log = vi.spyOn(console, 'info').mockImplementation(() => {})
    const trace = new HelpDiagnostics()
    await expect(trace.measure('generation', async () => { throw new Error('secret provider payload') })).rejects.toThrow()
    trace.complete({ success: false })
    const record = JSON.parse(log.mock.calls[0][1])
    expect(record.failure_stage).toBe('generation')
    expect(JSON.stringify(record)).not.toContain('secret')
})
