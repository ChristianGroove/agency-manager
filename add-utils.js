const fs = require('fs');
let serviceContent = fs.readFileSync('src/modules/features/messaging/services/conversation.service.ts', 'utf8');

const utils = `
const PUBLIC_CONVERSATION_ACTION_ERROR = "Conversation action failed"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function publicConversationActionError(error: unknown, fallback = PUBLIC_CONVERSATION_ACTION_ERROR) {
    if (isDeployedRuntime()) {
        return fallback
    }

    if (error instanceof Error && error.message) {
        return error.message
    }

    if (error && typeof error === 'object') {
        const message = (error as { message?: unknown }).message
        if (typeof message === 'string' && message.length > 0) {
            return message
        }
    }

    return fallback
}

function sanitizeConversationActionLogDetails(details: Record<string, unknown> = {}) {
    const sensitiveKeys = new Set([
        'conversationId',
        'leadId',
        'organizationId',
    ])

    return Object.fromEntries(
        Object.entries(details).map(([key, value]) => {
            if (sensitiveKeys.has(key)) {
                return [\`\${key}Present\`, Boolean(value)]
            }
            return [key, value]
        })
    )
}

function summarizeConversationActionError(error: unknown) {
    if (error instanceof Error) return { name: error.name }
    if (error && typeof error === 'object') {
        return { type: 'object', code: (error as { code?: unknown }).code, hasMessage: typeof (error as { message?: unknown }).message === 'string' }
    }
    return { type: typeof error }
}

function logConversationActionError(label: string, error: unknown, details: Record<string, unknown> = {}) {
    if (!isDeployedRuntime()) {
        if (Object.keys(details).length > 0) console.error(label, error, details)
        else console.error(label, error)
        return
    }
    console.error(label, { ...sanitizeConversationActionLogDetails(details), detail: summarizeConversationActionError(error) })
}
`

serviceContent = serviceContent.replace('export class ConversationService', utils + '\n\nexport class ConversationService');
fs.writeFileSync('src/modules/features/messaging/services/conversation.service.ts', serviceContent);
