import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    decryptObject: vi.fn((value: unknown) => value),
    getCurrentOrganizationId: vi.fn(),
    revalidatePath: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('@/modules/infrastructure/integrations/encryption', () => ({
    decryptObject: mocks.decryptObject,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

function collectConsoleCalls(...spies: ReturnType<typeof vi.spyOn>[]) {
    return spies
        .flatMap(spy => spy.mock.calls as unknown[][])
        .map(call => call.map(value => {
            if (typeof value === 'string') return value
            if (value instanceof Error) return `${value.name}: ${value.message}`
            try {
                return JSON.stringify(value)
            } catch {
                return String(value)
            }
        }).join(' '))
        .join('\n')
}

function connectionQuery(result: unknown) {
    const query: any = {
        eq: vi.fn(() => query),
        in: vi.fn(() => query),
        limit: vi.fn(() => query),
        maybeSingle: vi.fn(async () => result),
        order: vi.fn(() => query),
        select: vi.fn(() => query),
    }

    return query
}

function templatesUpsertQuery(upsertSpy: ReturnType<typeof vi.fn>) {
    return {
        upsert: upsertSpy,
    }
}

function templatesDeleteQuery(template: unknown, deleteResult: unknown = { error: null }) {
    const deleteQuery: any = {
        eq: vi.fn(() => deleteQuery),
        then: (resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) =>
            Promise.resolve(deleteResult).then(resolve, reject),
    }

    const query: any = {
        delete: vi.fn(() => deleteQuery),
        eq: vi.fn(() => query),
        select: vi.fn(() => query),
        single: vi.fn(async () => ({ data: template, error: null })),
    }

    return query
}

function createConnectionResult() {
    return {
        data: {
            id: 'connection-secret-id',
            provider_key: 'whatsapp_cloud',
            credentials: {
                accessToken: 'meta-access-secret',
                phoneNumberId: 'phone-secret-id',
                wabaId: 'waba-secret-id',
            },
            metadata: {
                asset_id: 'metadata-phone-secret',
                waba_id: 'metadata-waba-secret',
            },
        },
        error: null,
    }
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.decryptObject.mockReset()
    mocks.decryptObject.mockImplementation((value: unknown) => value)
    mocks.getCurrentOrganizationId.mockReset()
    mocks.revalidatePath.mockReset()
})

describe('messaging template Meta actions logging', () => {
    it('does not expose Meta template sync credentials or template details in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const upsertSpy = vi.fn(async () => ({ error: null }))
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({
            data: [{
                id: 'meta-template-secret-id',
                name: 'secret_template_name',
                category: 'UTILITY',
                language: 'es',
                status: 'APPROVED',
                components: [{ type: 'BODY', text: 'secret template body' }],
            }],
        }), { status: 200 }))
        vi.stubGlobal('fetch', fetchMock)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        mocks.createClient.mockResolvedValue({
            from: vi.fn((table: string) => {
                if (table === 'integration_connections') return connectionQuery(createConnectionResult())
                if (table === 'messaging_templates') return templatesUpsertQuery(upsertSpy)
                throw new Error(`Unexpected table ${table}`)
            }),
        })

        const { syncTemplatesFromMeta } = await import('./templates')
        const result = await syncTemplatesFromMeta('channel-secret-id')

        expect(result).toEqual({ synced: 1, errors: [] })
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/waba-secret-id/message_templates'),
            expect.objectContaining({
                headers: { Authorization: 'Bearer meta-access-secret' },
            })
        )
        expect(upsertSpy).toHaveBeenCalledWith(expect.objectContaining({
            channel_id: 'connection-secret-id',
            meta_id: 'meta-template-secret-id',
            name: 'secret_template_name',
            organization_id: 'org-secret-id',
        }), expect.objectContaining({
            onConflict: 'organization_id,name,language',
        }))

        const logText = collectConsoleCalls(logSpy, errorSpy)
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('channel-secret-id')
        expect(logText).not.toContain('connection-secret-id')
        expect(logText).not.toContain('meta-access-secret')
        expect(logText).not.toContain('phone-secret-id')
        expect(logText).not.toContain('waba-secret-id')
        expect(logText).not.toContain('metadata-phone-secret')
        expect(logText).not.toContain('metadata-waba-secret')
        expect(logText).not.toContain('meta-template-secret-id')
        expect(logText).not.toContain('secret_template_name')
        expect(logText).not.toContain('secret template body')
        expect(logText).toContain('connectionIdPresent')
        expect(logText).toContain('metadataAssetIdPresent')
        expect(logText).toContain('metadataWabaIdPresent')
        expect(logText).toContain('templateNamesCount')
        expect(logText).toContain('wabaIdPresent')
    })

    it('does not expose Meta template sync API failures in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({
            error: {
                message: 'meta-access-secret failed for waba-secret-id and secret_template_name',
                type: 'OAuthException',
                code: 190,
            },
        }), { status: 400 }))
        vi.stubGlobal('fetch', fetchMock)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        mocks.createClient.mockResolvedValue({
            from: vi.fn((table: string) => {
                if (table === 'integration_connections') return connectionQuery(createConnectionResult())
                throw new Error(`Unexpected table ${table}`)
            }),
        })

        const { syncTemplatesFromMeta } = await import('./templates')
        await expect(syncTemplatesFromMeta('channel-secret-id')).rejects.toThrow()

        const logText = collectConsoleCalls(logSpy, errorSpy)
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('channel-secret-id')
        expect(logText).not.toContain('connection-secret-id')
        expect(logText).not.toContain('meta-access-secret')
        expect(logText).not.toContain('waba-secret-id')
        expect(logText).not.toContain('secret_template_name')
        expect(logText).toContain('OAuthException')
        expect(logText).toContain('190')
        expect(logText).toContain('hasMessage')
        expect(logText).toContain('wabaIdPresent')
    })

    it('does not expose Meta template deletion failures in production logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const fetchMock = vi.fn(async () => new Response(JSON.stringify({
            error: {
                message: 'failed deleting secret_template_name from waba-secret-id',
                type: 'GraphMethodException',
                code: 100,
            },
        }), { status: 400 }))
        vi.stubGlobal('fetch', fetchMock)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        mocks.createClient.mockResolvedValue({
            from: vi.fn((table: string) => {
                if (table === 'integration_connections') return connectionQuery(createConnectionResult())
                if (table === 'messaging_templates') {
                    return templatesDeleteQuery({
                        id: 'template-secret-id',
                        meta_id: 'meta-template-secret-id',
                        name: 'secret_template_name',
                    })
                }
                throw new Error(`Unexpected table ${table}`)
            }),
        })

        const { deleteTemplateFromMeta } = await import('./templates')
        const result = await deleteTemplateFromMeta('template-secret-id', 'channel-secret-id')

        expect(result).toEqual({ success: true })
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining('/waba-secret-id/message_templates?name=secret_template_name'),
            expect.objectContaining({
                method: 'DELETE',
                headers: { Authorization: 'Bearer meta-access-secret' },
            })
        )

        const logText = collectConsoleCalls(logSpy, errorSpy)
        expect(logText).not.toContain('org-secret-id')
        expect(logText).not.toContain('channel-secret-id')
        expect(logText).not.toContain('template-secret-id')
        expect(logText).not.toContain('meta-template-secret-id')
        expect(logText).not.toContain('secret_template_name')
        expect(logText).not.toContain('waba-secret-id')
        expect(logText).toContain('GraphMethodException')
        expect(logText).toContain('100')
        expect(logText).toContain('templateIdPresent')
        expect(logText).toContain('templateNamePresent')
        expect(logText).toContain('wabaIdPresent')
    })
})
