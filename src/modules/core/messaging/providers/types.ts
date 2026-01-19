import { ChannelType } from "@/types/messaging"

export interface InteractiveButton {
    id: string
    title: string  // Max 20 chars for WhatsApp
    payload?: string  // Custom data returned when clicked
}

export interface InteractiveListSection {
    title?: string
    rows: Array<{
        id: string
        title: string  // Max 24 chars
        description?: string  // Max 72 chars
    }>
}

export interface SendMessageOptions {
    to: string
    content: MessageContent
    metadata?: Record<string, unknown>
    credentials?: any // For multi-tenant support (passing specific connection credentials)
}

export type MessageContent =
    | TextContent
    | ImageContent
    | VideoContent
    | AudioContent
    | DocumentContent
    | TemplateContent
    | InteractiveButtonsContent
    | InteractiveListContent
    | InteractiveCTAContent
    | LocationRequestContent

export interface TextContent {
    type: 'text'
    text: string
}

export interface ImageContent {
    type: 'image'
    mediaUrl: string
    caption?: string
}

export interface VideoContent {
    type: 'video'
    mediaUrl: string
    caption?: string
}

export interface AudioContent {
    type: 'audio'
    mediaUrl: string
}

export interface DocumentContent {
    type: 'document'
    mediaUrl: string
    filename?: string
    caption?: string
}

export interface TemplateContent {
    type: 'template'
    templateName: string
    templateLanguage?: string
    templateVariables?: Record<string, string>
}

// WhatsApp Interactive: Reply Buttons (max 3 buttons)
export interface InteractiveButtonsContent {
    type: 'interactive_buttons'
    header?: {
        type: 'text' | 'image' | 'video' | 'document'
        text?: string
        mediaUrl?: string
    }
    body: string  // Main message text
    footer?: string  // Small footer text
    buttons: InteractiveButton[]  // Max 3 buttons
}

// WhatsApp Interactive: List Message
export interface InteractiveListContent {
    type: 'interactive_list'
    header?: string
    body: string
    footer?: string
    buttonText: string  // Text on the menu button, e.g. "Ver opciones"
    sections: InteractiveListSection[]  // Max 10 sections, 10 rows each
}

// WhatsApp Interactive: CTA URL Button
export interface InteractiveCTAContent {
    type: 'interactive_cta'
    header?: {
        type: 'text' | 'image' | 'video' | 'document'
        text?: string
        mediaUrl?: string
    }
    body: string
    footer?: string
    buttons: Array<{
        type: 'url' | 'phone'
        text: string
        url?: string  // For URL type
        phoneNumber?: string  // For phone type
    }>
}

// Request user's location
export interface LocationRequestContent {
    type: 'location_request'
    body: string  // Message asking for location
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
    buttonId?: string; // ID for interactive responses (buttons/lists)
    content: {
        type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'interactive' | 'unknown';
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
