import { isProductionRuntime } from '@/app/api/_guards/request-guards'

export function logAssistantIntentError(label: string, error: unknown) {
    if (!isProductionRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, error instanceof Error
        ? { name: error.name }
        : { type: typeof error })
}

function assistantIntentErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error && error.message) {
        return error.message
    }

    if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
        return (error as any).message
    }

    return fallback
}

export function assistantIntentFailureBody(fallback: string, error: unknown) {
    if (isProductionRuntime()) {
        return { error: fallback }
    }

    return {
        error: fallback,
        details: assistantIntentErrorMessage(error, fallback),
    }
}
