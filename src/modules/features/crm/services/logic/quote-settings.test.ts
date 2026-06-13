import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    revalidatePath: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

function sessionClient(queues: Record<string, any[]>, user: { id: string } | null = { id: 'user-1' }) {
    return {
        auth: {
            getUser: vi.fn(async () => ({ data: { user } })),
        },
        from: vi.fn((table: string) => {
            const queue = queues[table]
            if (!queue?.length) throw new Error(`Unexpected table ${table}`)
            return queue.shift()
        }),
    }
}

function selectEqLimit(result: { data?: unknown; error?: unknown }) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        limit: vi.fn(async () => result),
    }

    return query
}

function selectEqSingle(result: { data?: unknown; error?: unknown }) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function insertSelectSingle(result: { data?: unknown; error?: unknown }) {
    const query: any = {
        insert: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => result),
    }

    return query
}

function updateEq(result: { error?: unknown }) {
    const query: any = {
        update: vi.fn(() => query),
        eq: vi.fn(async () => result),
    }

    return query
}

function secretError(message = 'quote settings secret-value failure', code = '42501') {
    return {
        message,
        code,
        status: 403,
    }
}

const settings = {
    organization_id: 'org-current',
    vertical: 'custom',
    approve_label: 'Approve',
    reject_label: 'Reject',
    actions_config: {
        approve: { notify_team: true, send_message: true },
        reject: { ask_reason: true, reasons: ['Too expensive'] },
    },
    template_config: {
        header: 'Header',
        footer: 'Footer',
    },
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.revalidatePath.mockReset()
})

describe('quote settings actions', () => {
    it('loads quote settings without changing the success contract', async () => {
        const members = selectEqLimit({ data: [{ organization_id: 'org-current' }] })
        const quoteSettings = selectEqSingle({ data: settings, error: null })
        mocks.createClient.mockResolvedValue(sessionClient({
            organization_members: [members],
            quote_settings: [quoteSettings],
        }))

        const { getQuoteSettings } = await import('./quote-settings')
        const result = await getQuoteSettings()

        expect(result).toEqual({ success: true, settings })
        expect(members.eq).toHaveBeenCalledWith('user_id', 'user-1')
        expect(quoteSettings.eq).toHaveBeenCalledWith('organization_id', 'org-current')
    })

    it('does not expose quote settings initialization failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const members = selectEqLimit({ data: [{ organization_id: 'org-current' }] })
        const missingSettings = selectEqSingle({ data: null, error: secretError('missing settings', 'PGRST116') })
        const insert = insertSelectSingle({
            data: null,
            error: secretError('quote settings secret-value insert failed'),
        })
        mocks.createClient.mockResolvedValue(sessionClient({
            organization_members: [members],
            quote_settings: [missingSettings, insert],
        }))

        const { getQuoteSettings } = await import('./quote-settings')
        const result = await getQuoteSettings()

        expect(result).toEqual({ success: false, error: 'No se pudo cargar la configuracion de cotizaciones' })
        expect(consoleError).toHaveBeenCalledWith('[getQuoteSettings] Create Error:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not expose quote settings update failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const member = selectEqSingle({ data: { organization_id: 'org-current' } })
        const update = updateEq({ error: secretError('quote settings secret-value update failed') })
        mocks.createClient.mockResolvedValue(sessionClient({
            organization_members: [member],
            quote_settings: [update],
        }))

        const { updateQuoteSettings } = await import('./quote-settings')
        const result = await updateQuoteSettings({ approve_label: 'Approve now' })

        expect(result).toEqual({ success: false, error: 'No se pudo guardar la configuracion de cotizaciones' })
        expect(update.update).toHaveBeenCalledWith({ approve_label: 'Approve now' })
        expect(update.eq).toHaveBeenCalledWith('organization_id', 'org-current')
        expect(consoleError).toHaveBeenCalledWith('[updateQuoteSettings] Update Error:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })

    it('saves quote settings without changing the success contract', async () => {
        const member = selectEqSingle({ data: { organization_id: 'org-current' } })
        const update = updateEq({ error: null })
        mocks.createClient.mockResolvedValue(sessionClient({
            organization_members: [member],
            quote_settings: [update],
        }))

        const { updateQuoteSettings } = await import('./quote-settings')
        const result = await updateQuoteSettings({ reject_label: 'Not now' })

        expect(result).toEqual({ success: true })
        expect(update.update).toHaveBeenCalledWith({ reject_label: 'Not now' })
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/settings/quotes')
    })
})
