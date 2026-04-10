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

type StripeWebhookEvent = {
    name: "stripe/webhook.received";
    data: {
        event: any;
    };
};

type WhatsAppReceivedEvent = {
    name: "whatsapp/message.received";
    data: {
        incomingMessage: any;
    };
};

type Events = {
    "automation.execute": AutomationExecuteEvent;
    "contract.generated": ContractGeneratedEvent;
    "whatsapp/message.received": WhatsAppReceivedEvent;
    "stripe/webhook.received": StripeWebhookEvent;
};


// 2. Create Client
export const inngest = new Inngest({
    id: "agency-manager", // App ID
    schemas: new EventSchemas<Events>(),
});
