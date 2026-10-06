import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
    let capturedConfig: any = null
    let capturedTrigger: any = null
    let capturedHandler: any = null

    return {
        capturedConfig: () => capturedConfig,
        capturedTrigger: () => capturedTrigger,
        capturedHandler: () => capturedHandler,
        createFunction: vi.fn((config: any, trigger: any, handler: any) => {
            capturedConfig = config
            capturedTrigger = trigger
            capturedHandler = handler
            return {
                id: config.id,
                name: config.name,
                config,
                trigger,
                fn: handler,
            }
        }),
        processGithubEvent: vi.fn(),
    }
})

vi.mock('@/modules/infrastructure/automation/inngest/client', () => ({
    inngest: {
        createFunction: mocks.createFunction,
    },
}))

vi.mock('@/modules/features/tasks/services/task-vcs-service', () => ({
    taskVcsService: {
        processGithubEvent: mocks.processGithubEvent,
    },
}))

afterEach(() => {
    vi.restoreAllMocks()
    mocks.processGithubEvent.mockReset()
})

describe('Inngest Worker: processVcsGithubEvent', () => {
    it('registers the function with proper ID, retries, and event trigger', async () => {
        await import('./vcs-github')

        const config = mocks.capturedConfig()
        const trigger = mocks.capturedTrigger()

        expect(config).toBeDefined()
        expect(config.id).toBe('process-vcs-github-event')
        expect(config.name).toBe('Process GitHub VCS Event')
        expect(config.retries).toBe(3)
        expect(trigger).toEqual({ event: 'vcs/github.event' })
    })

    it('executes taskVcsService.processGithubEvent via step.run with correct parameters', async () => {
        await import('./vcs-github')
        const handler = mocks.capturedHandler()

        const mockServiceResult = {
            processed: true,
            summary: 'Processed push with 1 ticket associations.',
        }
        mocks.processGithubEvent.mockResolvedValue(mockServiceResult)

        const eventData = {
            connectionId: 'conn-gh-456',
            organizationId: 'org-tenant-99',
            eventKey: 'push',
            payload: {
                repository: { full_name: 'team/repo' },
                commits: [],
            },
        }

        const mockStep = {
            run: vi.fn(async (stepId: string, stepCallback: () => Promise<any>) => {
                return await stepCallback()
            }),
        }

        const result = await handler({
            event: {
                id: 'gh-conn-gh-456',
                name: 'vcs/github.event',
                data: eventData,
            },
            step: mockStep,
        })

        expect(mockStep.run).toHaveBeenCalledWith('execute-vcs-event-logic', expect.any(Function))
        expect(mocks.processGithubEvent).toHaveBeenCalledWith({
            provider: 'github',
            eventKey: 'push',
            connectionId: 'conn-gh-456',
            organizationId: 'org-tenant-99',
            payload: eventData.payload,
        })

        expect(result).toEqual({
            success: true,
            connectionId: 'conn-gh-456',
            eventKey: 'push',
            result: mockServiceResult,
        })
    })

    it('returns error when connectionId is missing in event.data', async () => {
        await import('./vcs-github')
        const handler = mocks.capturedHandler()

        const mockStep = { run: vi.fn() }

        const result = await handler({
            event: {
                name: 'vcs/github.event',
                data: {
                    organizationId: 'org-123',
                },
            },
            step: mockStep,
        })

        expect(result).toEqual({
            success: false,
            error: 'Missing required connectionId or organizationId in event data',
        })
        expect(mockStep.run).not.toHaveBeenCalled()
    })

    it('returns error when organizationId is missing in event.data', async () => {
        await import('./vcs-github')
        const handler = mocks.capturedHandler()

        const mockStep = { run: vi.fn() }

        const result = await handler({
            event: {
                name: 'vcs/github.event',
                data: {
                    connectionId: 'conn-123',
                },
            },
            step: mockStep,
        })

        expect(result).toEqual({
            success: false,
            error: 'Missing required connectionId or organizationId in event data',
        })
        expect(mockStep.run).not.toHaveBeenCalled()
    })

    it('propagates error when step.run throws', async () => {
        await import('./vcs-github')
        const handler = mocks.capturedHandler()

        const mockStep = {
            run: vi.fn(async () => {
                throw new Error('Database connection failed')
            }),
        }

        await expect(
            handler({
                event: {
                    name: 'vcs/github.event',
                    data: {
                        connectionId: 'conn-123',
                        organizationId: 'org-456',
                        eventKey: 'push',
                        payload: {},
                    },
                },
                step: mockStep,
            })
        ).rejects.toThrow('Database connection failed')
    })
})
