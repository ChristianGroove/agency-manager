const SENSITIVE_PAYMENT_DETAIL_KEY_PATTERN =
    /(secret|private|password|token|api[_-]?key|access[_-]?key|client[_-]?secret|authorization|bearer|signature|integrity)/i

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function sanitizePaymentMethodDetails(details: unknown): Record<string, unknown> {
    if (!isPlainObject(details)) return {}

    return Object.entries(details).reduce<Record<string, unknown>>((safeDetails, [key, value]) => {
        if (SENSITIVE_PAYMENT_DETAIL_KEY_PATTERN.test(key)) return safeDetails

        if (Array.isArray(value)) {
            safeDetails[key] = value.map((item) => (
                isPlainObject(item) ? sanitizePaymentMethodDetails(item) : item
            ))
            return safeDetails
        }

        safeDetails[key] = isPlainObject(value) ? sanitizePaymentMethodDetails(value) : value
        return safeDetails
    }, {})
}

export function sanitizePaymentMethodForClient<T extends { details?: unknown }>(method: T): T {
    return {
        ...method,
        details: sanitizePaymentMethodDetails(method.details),
    }
}

export function sanitizePaymentMethodsForClient<T extends { details?: unknown }>(methods: T[] | null | undefined): T[] {
    return (methods || []).map(sanitizePaymentMethodForClient)
}
