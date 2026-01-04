import { ChannelType } from "@/types/messaging"

export interface SendMessageOptions {
    to: string;
    content: {
        type: 'text' | 'image' | 'template';
        text?: string;
        mediaUrl?: string;
        templateName?: string;
        templateLanguage?: string;
        templateVariables?: Record<string, string>;
    };
    metadata?: Record<string, unknown>;
}

export interface WebhookValidationResult {
    isValid: boolean;
    reason?: string;
    responseBody?: string; // For returning hub.challenge
}

export interface IncomingMessage {
    id: string;
    externalId: string;
    channel: ChannelType;
    from: string;
    senderName?: string;
    content: {
        type: 'text' | 'image' | 'unknown';
        text?: string;
        mediaUrl?: string;
        raw?: unknown;
    };
    timestamp: Date;
    metadata?: Record<string, unknown>;
}

export interface MessagingProvider {
    name: string;

    /**
     * Send a message through the provider
     */
    sendMessage(options: SendMessageOptions): Promise<{ success: boolean; messageId?: string; error?: string }>;

    /**
     * Validate an incoming webhook request signature
     */
    validateWebhook(request: Request): Promise<WebhookValidationResult>;

    /**
     * Parse a webhook payload into normalized messages
     */
    parseWebhook(payload: unknown): Promise<IncomingMessage[]>;
}
