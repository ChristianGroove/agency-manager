import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createClient: vi.fn(),
    getCurrentOrganizationId: vi.fn(),
    revalidatePath: vi.fn(),
    taskService: {
        createTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        getTasksForLead: vi.fn(),
        getMyTasks: vi.fn(),
        getTodaysTasks: vi.fn(),
        getOverdueTasks: vi.fn(),
        getTaskStats: vi.fn(),
    },
    CRMTasksLegacyService: vi.fn(),
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

vi.mock('./services/crm-tasks-legacy.service', () => ({
    CRMTasksLegacyService: mocks.CRMTasksLegacyService,
}))

function sessionClient(user: { id: string } | null = { id: 'user-1' }) {
    return {
        auth: {
            getUser: vi.fn(async () => ({ data: { user } })),
        },
    }
}

afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
    mocks.createClient.mockReset()
    mocks.getCurrentOrganizationId.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.CRMTasksLegacyService.mockReset()
    Object.values(mocks.taskService).forEach((fn) => fn.mockReset())
})

async function importTaskActions(user: { id: string } | null = { id: 'user-1' }) {
    mocks.createClient.mockResolvedValue(sessionClient(user))
    mocks.getCurrentOrganizationId.mockResolvedValue('org-current')
    mocks.CRMTasksLegacyService.mockImplementation(function () {
        return mocks.taskService
    })
    return import('./task-actions')
}

describe('CRM logic task actions', () => {
    it('creates tasks without changing the success contract', async () => {
        const task = { id: 'task-1', title: 'Follow up', organization_id: 'org-current' }
        mocks.taskService.createTask.mockResolvedValue(task)

        const { createTask } = await importTaskActions()
        const input = {
            lead_id: 'lead-1',
            title: 'Follow up',
            due_date: '2026-06-10T00:00:00.000Z',
        }
        const result = await createTask(input)

        expect(result).toEqual({ success: true, task })
        expect(mocks.CRMTasksLegacyService).toHaveBeenCalledWith(expect.anything(), 'org-current', 'user-1')
        expect(mocks.taskService.createTask).toHaveBeenCalledWith(input)
        expect(mocks.revalidatePath).toHaveBeenCalledWith('/crm')
    })

    it('does not expose task mutation failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.taskService.updateTask.mockRejectedValue(new Error('task secret-value update failed'))

        const { updateTask } = await importTaskActions()
        const result = await updateTask('task-secret-id', { status: 'completed' })

        expect(result).toEqual({ success: false, error: 'No se pudo completar la accion de tareas CRM' })
        expect(mocks.taskService.updateTask).toHaveBeenCalledWith('task-secret-id', { status: 'completed' })
        expect(consoleError).toHaveBeenCalledWith('Error updating CRM task:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
        expect(mocks.revalidatePath).not.toHaveBeenCalled()
    })

    it('keeps unauthorized task failures user-facing without exposing logs', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

        const { getTasksForLead } = await importTaskActions(null)
        const result = await getTasksForLead('lead-1')

        expect(result).toEqual({ success: false, error: 'Unauthorized' })
        expect(mocks.CRMTasksLegacyService).not.toHaveBeenCalled()
        expect(consoleError).toHaveBeenCalledWith('Error fetching lead CRM tasks:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('Unauthorized')
    })

    it('does not expose task stats failures in deployed runtimes', async () => {
        vi.stubEnv('VERCEL_ENV', 'production')
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
        mocks.taskService.getTaskStats.mockRejectedValue(new Error('task secret-value stats failed'))

        const { getTaskStats } = await importTaskActions()
        const result = await getTaskStats()

        expect(result).toEqual({ success: false, error: 'No se pudo completar la accion de tareas CRM' })
        expect(mocks.taskService.getTaskStats).toHaveBeenCalled()
        expect(consoleError).toHaveBeenCalledWith('Error fetching CRM task stats:', { name: 'Error' })
        expect(JSON.stringify(consoleError.mock.calls)).not.toContain('secret-value')
    })
})
