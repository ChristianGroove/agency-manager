import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    supabaseAdmin: {
        from: vi.fn(),
    },
    getCurrentOrganizationId: vi.fn(),
    getActiveModules: vi.fn(),
    requireOrgRole: vi.fn(),
    revalidatePath: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: mocks.supabaseAdmin,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('@/modules/core/saas/saas-actions', () => ({
    getActiveModules: mocks.getActiveModules,
}))

vi.mock('@/modules/core/iam/services/org-roles', () => ({
    requireOrgRole: mocks.requireOrgRole,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

vi.mock('react', () => ({
    cache: (fn: any) => fn,
}))

function secretError(message = 'settings secret-value failure') {
    return {
        message,
        code: '42501',
        status: 403,
    }
}

function createQueuedClient(queues: Record<string, any[]>) {
    return {
        from: vi.fn((table: string) => {
            const queue = queues[table]
            if (!queue?.length) throw new Error(`Unexpected table ${table}`)
            return queue.shift()
        }),
    }
}

function selectMaybeSingle(result: { data?: unknown; error?: unknown }) {
    const query: any = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        maybeSingle: vi.fn(async () => result),
    }

    return query
}

function updateEq(error: unknown = null) {
    const query: any = {
        update: vi.fn(() => query),
        eq: vi.fn(async () => ({ error })),
    }

    return query
}

function directUpsert(error: unknown = null) {
    return {
        upsert: vi.fn(async () => ({ error })),
    }
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.supabaseAdmin.from.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.getActiveModules.mockReset()
    mocks.requireOrgRole.mockReset()
    mocks.revalidatePath.mockReset()
})

async function importSettingsCrud() {
    mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
    mocks.requireOrgRole.mockResolvedValue(undefined)
    mocks.getActiveModules.mockResolvedValue(['module_invoicing'])
    return import('./crud')
}

async function importBrandingActions() {
    mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
    mocks.requireOrgRole.mockResolvedValue(undefined)
    return import('./branding')
}

describe('settings actions sanitized errors', () => {
    it('does not expose settings fetch failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const settings = selectMaybeSingle({
            data: null,
            error: secretError('settings secret-value fetch failed'),
        })
        mocks.createClient.mockResolvedValue(createQueuedClient({
            organization_settings: [settings],
        }))

        const { getSettings } = await importSettingsCrud()
        const result = await getSettings()

        expect(result).toBeNull()
        expect(consoleError).toHaveBeenCalledWith('[getSettings] Error:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not return payment secrets from settings reads', async () => {
        const settings = selectMaybeSingle({
            data: {
                id: 'settings-1',
                organization_id: 'org-current',
                agency_name: 'Pixy Client',
                wompi_public_key: 'pub_test_123',
                wompi_integrity_secret: 'wompi-secret-value',
                stripe_private_key: 'stripe-secret-value',
            },
            error: null,
        })
        mocks.createClient.mockResolvedValue(createQueuedClient({
            organization_settings: [settings],
        }))

        const { getSettings } = await importSettingsCrud()
        const result = await getSettings()
        const resultText = JSON.stringify(result)

        expect(result).toMatchObject({
            id: 'settings-1',
            wompi_public_key: 'pub_test_123',
            wompi_integrity_secret: '',
            wompi_integrity_secret_present: true,
            stripe_private_key: '',
            stripe_private_key_present: true,
        })
        expect(resultText).not.toContain('wompi-secret-value')
        expect(resultText).not.toContain('stripe-secret-value')
    })

    it('updates settings without changing the success contract', async () => {
        const update = updateEq()
        mocks.createClient.mockResolvedValue(createQueuedClient({
            organization_settings: [update],
        }))

        const { updateSettings } = await importSettingsCrud()
        const result = await updateSettings({
            id: 'settings-1',
            invoice_prefix: 'PX',
            stripe_private_key: 'should-not-update-without-module',
        })

        expect(result).toEqual({ success: true })
        expect(update.update).toHaveBeenCalledWith(expect.objectContaining({
            invoice_prefix: 'PX',
            updated_at: expect.any(String),
        }))
        expect(update.update.mock.calls[0][0]).not.toHaveProperty('stripe_private_key')
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/settings')
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/', 'layout')
    })

    it('preserves existing payment secrets when client settings submit blanks or placeholders', async () => {
        const update = updateEq()
        mocks.createClient.mockResolvedValue(createQueuedClient({
            organization_settings: [update],
        }))

        const { updateSettings } = await importSettingsCrud()
        const result = await updateSettings({
            id: 'settings-1',
            wompi_public_key: 'pub_test_123',
            wompi_integrity_secret: '',
            wompi_integrity_secret_present: true,
            stripe_private_key: '●●●●●●●●',
            stripe_private_key_present: true,
        })

        expect(result).toEqual({ success: true })
        expect(update.update).toHaveBeenCalledWith(expect.objectContaining({
            wompi_public_key: 'pub_test_123',
            updated_at: expect.any(String),
        }))
        expect(update.update.mock.calls[0][0]).not.toHaveProperty('wompi_integrity_secret')
        expect(update.update.mock.calls[0][0]).not.toHaveProperty('wompi_integrity_secret_present')
        expect(update.update.mock.calls[0][0]).not.toHaveProperty('stripe_private_key')
        expect(update.update.mock.calls[0][0]).not.toHaveProperty('stripe_private_key_present')
    })

    it('does not expose settings update failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const update = updateEq(secretError('settings secret-value update failed'))
        mocks.createClient.mockResolvedValue(createQueuedClient({
            organization_settings: [update],
        }))

        const { updateSettings } = await importSettingsCrud()
        const result = await updateSettings({
            id: 'settings-secret-id',
            invoice_prefix: 'PX',
        })

        expect(result).toEqual({ error: 'No se pudo actualizar la configuracion' })
        expect(consoleError).toHaveBeenCalledWith('[updateSettings] Error:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not expose organization branding update failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const upsert = directUpsert(secretError('branding secret-value update failed'))
        mocks.createClient.mockResolvedValue(createQueuedClient({
            organization_settings: [upsert],
        }))

        const { updateOrganizationBranding } = await importBrandingActions()

        await expect(updateOrganizationBranding({
            portal_title: 'Pixy',
        })).rejects.toThrow('No se pudo actualizar la marca')
        expect(consoleError).toHaveBeenCalledWith('[updateOrganizationBranding] Error:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })

    it('does not expose document branding update failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const update = updateEq(secretError('document branding secret-value update failed'))
        mocks.createClient.mockResolvedValue(createQueuedClient({
            organization_settings: [update],
        }))

        const { updateDocumentBranding } = await importBrandingActions()
        const result = await updateDocumentBranding({
            document_primary_color: '#111111',
        })

        expect(result).toEqual({ error: 'No se pudo actualizar la marca de documentos' })
        expect(consoleError).toHaveBeenCalledWith('[updateDocumentBranding] Error:', expect.objectContaining({
            code: '42501',
            hasMessage: true,
        }))
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })
})
