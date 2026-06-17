import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    ProcessEngine: {
        getProcessContext: vi.fn(),
        transition: vi.fn(),
    },
}))

vi.mock('./engine', () => ({
    ProcessEngine: mocks.ProcessEngine,
}))

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.ProcessEngine.getProcessContext.mockReset()
    mocks.ProcessEngine.transition.mockReset()
})

function processContext() {
    return {
        instance: {
            id: 'process-1',
            lead_id: 'lead-1',
            type: 'sale',
            current_state: 'new',
            status: 'active',
        },
        state: {
            id: 'state-1',
            key: 'new',
            name: 'New',
            type: 'sale',
        },
    } as any
}

describe('CRM process engine actions', () => {
    it('gets process context without changing the success contract', async () => {
        const context = processContext()
        mocks.ProcessEngine.getProcessContext.mockResolvedValue(context)

        const { getProcessContextAction } = await import('./actions')
        const result = await getProcessContextAction('lead-1')

        expect(result).toEqual({ success: true, data: context })
        expect(mocks.ProcessEngine.getProcessContext).toHaveBeenCalledWith('lead-1')
    })

    it('keeps the no-active-process business response', async () => {
        mocks.ProcessEngine.getProcessContext.mockResolvedValue(null)

        const { transitionProcessAction } = await import('./actions')
        const result = await transitionProcessAction('lead-1', 'next')

        expect(result).toEqual({ success: false, error: 'No active process' })
        expect(mocks.ProcessEngine.transition).not.toHaveBeenCalled()
    })

    it('does not expose process context exceptions in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.ProcessEngine.getProcessContext.mockRejectedValue(new Error('process secret-value context failed'))

        const { getProcessContextAction } = await import('./actions')
        const result = await getProcessContextAction('lead-secret-id')

        expect(result).toEqual({ success: false, error: 'No se pudo cargar el proceso' })
        expect(consoleError).toHaveBeenCalledWith('[getProcessContextAction] Error:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not expose process transition failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.ProcessEngine.getProcessContext.mockResolvedValue(processContext())
        mocks.ProcessEngine.transition.mockResolvedValue({
            success: false,
            error: 'transition secret-value database failed',
        })

        const { transitionProcessAction } = await import('./actions')
        const result = await transitionProcessAction('lead-secret-id', 'closed')

        expect(result).toEqual({ success: false, error: 'No se pudo cambiar el estado del proceso' })
        expect(mocks.ProcessEngine.transition).toHaveBeenCalledWith('process-1', 'closed', 'user', 'UI Transition')
        expect(consoleError).toHaveBeenCalledWith('[transitionProcessAction] Transition failed:', { type: 'string' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('transitions processes without changing the success contract', async () => {
        mocks.ProcessEngine.getProcessContext.mockResolvedValue(processContext())
        mocks.ProcessEngine.transition.mockResolvedValue({ success: true })

        const { transitionProcessAction } = await import('./actions')
        const result = await transitionProcessAction('lead-1', 'qualified')

        expect(result).toEqual({ success: true })
        expect(mocks.ProcessEngine.transition).toHaveBeenCalledWith('process-1', 'qualified', 'user', 'UI Transition')
    })
})
