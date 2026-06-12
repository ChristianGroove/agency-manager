function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function sanitizeAssistantLogDetails(details: Record<string, unknown> = {}) {
    const sensitiveKeys = new Set([
        'briefId',
        'clientId',
        'invoiceId',
        'logId',
        'organizationId',
        'spaceId',
        'tenantId',
        'userId',
    ])

    return Object.fromEntries(
        Object.entries(details).map(([key, value]) => {
            if (sensitiveKeys.has(key)) {
                return [`${key}Present`, Boolean(value)]
            }

            return [key, value]
        })
    )
}

export function summarizeAssistantError(error: unknown) {
    if (error instanceof Error) {
        return { name: error.name }
    }

    if (error && typeof error === 'object') {
        return {
            type: 'object',
            code: (error as { code?: unknown }).code,
            hasMessage: typeof (error as { message?: unknown }).message === 'string',
            hasDetails: typeof (error as { details?: unknown }).details === 'string',
            hasHint: typeof (error as { hint?: unknown }).hint === 'string',
        }
    }

    return { type: typeof error }
}

export function logAssistantInfo(label: string, details: Record<string, unknown> = {}) {
    if (!isDeployedRuntime()) {
        console.log(label, details)
        return
    }

    console.log(label, sanitizeAssistantLogDetails(details))
}

export function logAssistantError(label: string, error: unknown, details: Record<string, unknown> = {}) {
    if (!isDeployedRuntime()) {
        console.error(label, error, details)
        return
    }

    console.error(label, {
        ...sanitizeAssistantLogDetails(details),
        detail: summarizeAssistantError(error),
    })
}
