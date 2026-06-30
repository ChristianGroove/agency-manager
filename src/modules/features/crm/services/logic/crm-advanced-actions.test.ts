import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    LeadsService: vi.fn(),
    leadsService: {
        calculateScore: vi.fn(),
        updateProfile: vi.fn(),
    },
    CRMAdvancedService: vi.fn(),
    advancedService: {
        createTask: vi.fn(),
        sendEmail: vi.fn(),
    },
    revalidatePath: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: mocks.createClient,
}))

vi.mock('@/modules/core/organizations/organization-actions', () => ({
    getCurrentOrganizationId: mocks.getCurrentOrganizationId,
}))

vi.mock('next/cache', () => ({
    revalidatePath: mocks.revalidatePath,
}))

vi.mock('../contact-service', () => ({
    ContactService: mocks.LeadsService,
}))

vi.mock('./services/crm-advanced.service', () => ({
    CRMAdvancedService: mocks.CRMAdvancedService,
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

function createSupabaseMock(options: {
    user?: { id: string } | null
    uploadResult?: unknown
    publicUrl?: string
} = {}) {
    const upload = vi.fn(async () => options.uploadResult ?? { error: null })
    const getPublicUrl = vi.fn(() => ({
        data: { publicUrl: options.publicUrl ?? 'https://cdn.example.test/file.pdf' },
    }))

    return {
        auth: {
            getUser: vi.fn(async () => ({
                data: { user: options.user === undefined ? { id: 'user-current' } : options.user },
                error: null,
            })),
        },
        storage: {
            from: vi.fn(() => ({
                upload,
                getPublicUrl,
            })),
        },
    }
}

beforeEach(() => {
    mocks.LeadsService.mockImplementation(function () {
        return mocks.leadsService
    })
    mocks.CRMAdvancedService.mockImplementation(function () {
        return mocks.advancedService
    })
})

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.LeadsService.mockReset()
    mocks.leadsService.calculateScore.mockReset()
    mocks.leadsService.updateProfile.mockReset()
    mocks.CRMAdvancedService.mockReset()
    mocks.advancedService.createTask.mockReset()
    mocks.advancedService.sendEmail.mockReset()
    mocks.revalidatePath.mockReset()
})

describe('crm advanced actions', () => {
    it('updates leads without changing the success contract', async () => {
        const supabase = createSupabaseMock()
        mocks.createClient.mockResolvedValue(supabase)
        mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
        mocks.leadsService.updateProfile.mockResolvedValue({ id: 'lead-current', name: 'Ada' })

        const { updateLead } = await import('./crm-advanced-actions')
        const result = await updateLead('lead-current', { name: 'Ada' } as any)

        expect(result).toEqual({ success: true, data: { id: 'lead-current', name: 'Ada' } })
        expect(mocks.LeadsService).toHaveBeenCalledWith(supabase, 'org-current', 'user-current')
        expect(mocks.leadsService.updateProfile).toHaveBeenCalledWith('lead-current', { name: 'Ada' })
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/crm')
    })

    it('does not expose lead update failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.createClient.mockResolvedValue(createSupabaseMock())
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        mocks.leadsService.updateProfile.mockRejectedValue(new Error('lead-secret-id update denied with db-token-secret'))

        const { updateLead } = await import('./crm-advanced-actions')
        const result = await updateLead('lead-secret-id', { name: 'Client Secret' } as any)

        expect(result).toEqual({ success: false, error: 'No se pudo completar la accion de CRM' })
        expect(mocks.revalidatePath).not.toHaveBeenCalled()

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('lead-secret-id')
        expect(logText).not.toContain('db-token-secret')
        expect(logText).not.toContain('Client Secret')
        expect(logText).not.toContain('update denied')
        expect(logText).toContain('Error')
    })

    it('does not expose delegated task failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.createClient.mockResolvedValue(createSupabaseMock())
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        mocks.advancedService.createTask.mockRejectedValue(new Error('task-secret-id failed for assignee-secret-id'))

        const { createLeadTask } = await import('./crm-advanced-actions')
        const result = await createLeadTask({
            title: 'Follow secret lead',
            lead_id: 'lead-secret-id',
            assigned_to: 'assignee-secret-id',
        } as any)

        expect(result).toEqual({ success: false, error: 'No se pudo completar la accion de CRM' })
        expect(mocks.CRMAdvancedService).toHaveBeenCalledWith(expect.any(Object), 'org-secret-id', 'user-current')
        expect(mocks.revalidatePath).not.toHaveBeenCalled()

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('task-secret-id')
        expect(logText).not.toContain('assignee-secret-id')
        expect(logText).not.toContain('lead-secret-id')
        expect(logText).not.toContain('Follow secret lead')
    })

    it('keeps safe file validation messages public in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.createClient.mockResolvedValue(createSupabaseMock())

        const { uploadLeadFile } = await import('./crm-advanced-actions')
        const result = await uploadLeadFile(new FormData())

        expect(result).toEqual({ success: false, error: 'No file selected' })
    })

    it('does not expose storage upload failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        const supabase = createSupabaseMock({
            user: { id: 'user-secret-id' },
            uploadResult: {
                error: {
                    code: '42501',
                    message: 'storage denied user-secret-id with bucket-token-secret',
                },
            },
        })
        mocks.createClient.mockResolvedValue(supabase)
        const formData = new FormData()
        formData.set('file', new File(['secret file body'], 'contract-secret.pdf', { type: 'application/pdf' }))

        const { uploadLeadFile } = await import('./crm-advanced-actions')
        const result = await uploadLeadFile(formData)

        expect(result).toEqual({ success: false, error: 'No se pudo subir el archivo' })
        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('user-secret-id')
        expect(logText).not.toContain('bucket-token-secret')
        expect(logText).not.toContain('contract-secret.pdf')
        expect(logText).not.toContain('storage denied')
        expect(logText).toContain('42501')
    })

    it('does not expose lead scoring failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.createClient.mockResolvedValue(createSupabaseMock())
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        mocks.leadsService.calculateScore.mockRejectedValue(new Error('score failed for lead-secret-id with model-secret'))

        const { calculateLeadScore } = await import('./crm-advanced-actions')
        const result = await calculateLeadScore('lead-secret-id')

        expect(result).toEqual({ success: false, error: 'No se pudo calcular el puntaje del lead' })
        expect(mocks.revalidatePath).not.toHaveBeenCalled()

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('lead-secret-id')
        expect(logText).not.toContain('model-secret')
        expect(logText).not.toContain('score failed')
    })

    it('does not expose lead email failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.createClient.mockResolvedValue(createSupabaseMock())
        mocks.getCurrentOrganizationId.mockResolvedValue('org-secret-id')
        mocks.advancedService.sendEmail.mockRejectedValue(new Error('email provider rejected recipient-secret@example.test with api-secret'))

        const { sendLeadEmail } = await import('./crm-advanced-actions')
        const result = await sendLeadEmail({
            lead_id: 'lead-secret-id',
            to_email: 'recipient-secret@example.test',
            subject: 'Secret quote',
            body_html: '<p>secret</p>',
        } as any)

        expect(result).toEqual({ success: false, error: 'No se pudo enviar el email del lead' })
        expect(mocks.revalidatePath).not.toHaveBeenCalled()

        const logText = collectConsoleCalls(errorSpy)
        expect(logText).not.toContain('recipient-secret@example.test')
        expect(logText).not.toContain('api-secret')
        expect(logText).not.toContain('Secret quote')
    })
})
