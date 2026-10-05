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
        processBitbucketEvent: vi.fn(),
    }
})

vi.mock('@/modules/infrastructure/automation/inngest/client', () => ({
    inngest: {
        createFunction: mocks.createFunction,
    },
}))

vi.mock('@/modules/features/tasks/services/task-vcs-service', () => ({
    taskVcsService: {
        processBitbucketEvent: mocks.processBitbucketEvent,
    },
}))

afterEach(() => {
    vi.restoreAllMocks()
    mocks.processBitbucketEvent.mockReset()
})

describe('Inngest Worker: processVcsBitbucketEvent', () => {
    it('registers the function with proper ID, retries, and event trigger', async () => {
        await import('./vcs-bitbucket')

        const config = mocks.capturedConfig()
        const trigger = mocks.capturedTrigger()

        expect(config).toBeDefined()
        expect(config.id).toBe('process-vcs-bitbucket-event')
        expect(config.name).toBe('Process Bitbucket VCS Event')
        expect(config.retries).toBe(3)
        expect(trigger).toEqual({ event: 'vcs/bitbucket.event' })
    })

    it('executes taskVcsService.processBitbucketEvent via step.run with correct parameters', async () => {
        await import('./vcs-bitbucket')
        const handler = mocks.capturedHandler()

        const mockServiceResult = {
            processed: true,
            summary: 'Processed push with 1 ticket associations.',
        }
        mocks.processBitbucketEvent.mockResolvedValue(mockServiceResult)

        const eventData = {
            connectionId: 'conn-bb-456',
            organizationId: 'org-tenant-99',
            eventKey: 'repo:push',
            payload: {
                repository: { full_name: 'team/repo' },
                push: { changes: [] },
            },
            requestUuid: 'uuid-trace-1234',
        }

        const mockStep = {
            run: vi.fn(async (stepId: string, stepCallback: () => Promise<any>) => {
                return await stepCallback()
            }),
        }

        const result = await handler({
            event: {
                id: 'bb-conn-bb-456-uuid-trace-1234',
                name: 'vcs/bitbucket.event',
                data: eventData,
            },
            step: mockStep,
        })

        expect(mockStep.run).toHaveBeenCalledWith('execute-vcs-event-logic', expect.any(Function))
        expect(mocks.processBitbucketEvent).toHaveBeenCalledWith({
            provider: 'bitbucket',
            eventKey: 'repo:push',
            connectionId: 'conn-bb-456',
            organizationId: 'org-tenant-99',
            payload: eventData.payload,
        })

        expect(result).toEqual({
            success: true,
            connectionId: 'conn-bb-456',
            eventKey: 'repo:push',
            result: mockServiceResult,
        })
    })

    it('propagates error when service throws, enabling Inngest automatic retry mechanism', async () => {
        await import('./vcs-bitbucket')
        const handler = mocks.capturedHandler()

        const dbError = new Error('Database connection failed during event processing')
        mocks.processBitbucketEvent.mockRejectedValue(dbError)

        const mockStep = {
            run: vi.fn(async (_stepId: string, stepCallback: () => Promise<any>) => {
                return await stepCallback()
            }),
        }

        const eventData = {
            connectionId: 'conn-bb-retry',
            organizationId: 'org-tenant-99',
            eventKey: 'pullrequest:created',
            payload: {},
        }

        await expect(
            handler({
                event: {
                    id: 'bb-conn-bb-retry-evt-1',
                    name: 'vcs/bitbucket.event',
                    data: eventData,
                },
                step: mockStep,
            })
        ).rejects.toThrow('Database connection failed during event processing')

        expect(mockStep.run).toHaveBeenCalledWith('execute-vcs-event-logic', expect.any(Function))
    })

    it('handles unhandled event key or non-processed payloads gracefully without throwing', async () => {
        await import('./vcs-bitbucket')
        const handler = mocks.capturedHandler()

        const ignoredResult = { processed: false, summary: 'Ignored event: unknown:event' }
        mocks.processBitbucketEvent.mockResolvedValue(ignoredResult)

        const mockStep = {
            run: vi.fn(async (_stepId: string, stepCallback: () => Promise<any>) => {
                return await stepCallback()
            }),
        }

        const result = await handler({
            event: {
                name: 'vcs/bitbucket.event',
                data: {
                    connectionId: 'conn-unknown',
                    organizationId: 'org-tenant-99',
                    eventKey: 'unknown:event',
                    payload: {},
                },
            },
            step: mockStep,
        })

        expect(result).toEqual({
            success: true,
            connectionId: 'conn-unknown',
            eventKey: 'unknown:event',
            result: ignoredResult,
        })
    })

    it('gracefully returns failure when event.data is missing required IDs', async () => {
        await import('./vcs-bitbucket')
        const handler = mocks.capturedHandler()

        const mockStep = {
            run: vi.fn(),
        }

        // Test with missing connectionId
        const resMissingConn = await handler({
            event: {
                name: 'vcs/bitbucket.event',
                data: {
                    connectionId: '',
                    organizationId: 'org-tenant-99',
                    eventKey: 'repo:push',
                    payload: {},
                },
            },
            step: mockStep,
        })

        expect(resMissingConn).toEqual({
            success: false,
            error: 'Missing required connectionId or organizationId in event data',
        })
        expect(mockStep.run).not.toHaveBeenCalled()

        // Test with missing event.data entirely
        const resMissingData = await handler({
            event: {
                name: 'vcs/bitbucket.event',
            },
            step: mockStep,
        })

        expect(resMissingData.success).toBe(false)
        expect(mockStep.run).not.toHaveBeenCalled()
    })
})
