import { inngest } from "@/modules/infrastructure/automation/inngest/client"
import { taskVcsService } from "@/modules/features/tasks/services/task-vcs-service"

/**
 * Inngest Worker for GitHub VCS Events
 * Provides resilient asynchronous handling with automatic retries and deduplication
 */
export const processVcsGithubEvent = inngest.createFunction(
    {
        id: "process-vcs-github-event",
        name: "Process GitHub VCS Event",
        retries: 3
    },
    { event: "vcs/github.event" },
    async ({ event, step }) => {
        if (!event?.data?.connectionId || !event?.data?.organizationId) {
            return {
                success: false,
                error: 'Missing required connectionId or organizationId in event data'
            }
        }

        const { connectionId, organizationId, eventKey, payload } = event.data

        const result = await step.run("execute-vcs-event-logic", async () => {
            return await taskVcsService.processGithubEvent({
                provider: 'github',
                eventKey,
                connectionId,
                organizationId,
                payload
            })
        })

        return {
            success: true,
            connectionId,
            eventKey,
            result
        }
    }
)
