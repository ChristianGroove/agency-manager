import { Inngest, EventSchemas } from "inngest";

// 1. Define Events Schema
type AutomationExecuteEvent = {
    name: "automation.execute";
    data: {
        executionId: string;
        organizationId: string;
        workflowId: string;
        workflowVersionId?: string;
        triggerData?: any; // Webhook payload or manual context
    };
};

type Events = {
    "automation.execute": AutomationExecuteEvent;
};

// 2. Create Client
export const inngest = new Inngest({
    id: "agency-manager", // App ID
    schemas: new EventSchemas<Events>(),
});
