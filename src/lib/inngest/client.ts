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

type ContractGeneratedEvent = {
    name: "contract.generated";
    data: {
        contractId: string;
        organizationId: string;
        clientId?: string;
        usage?: {
            input_tokens: number;
            output_tokens: number;
        };
    };
};

type Events = {
    "automation.execute": AutomationExecuteEvent;
    "contract.generated": ContractGeneratedEvent;
};

// 2. Create Client
export const inngest = new Inngest({
    id: "agency-manager", // App ID
    schemas: new EventSchemas<Events>(),
});
