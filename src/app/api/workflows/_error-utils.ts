import { isProductionRuntime } from '@/app/api/_guards/request-guards'

export function logWorkflowRouteError(label: string, error: unknown) {
    if (!isProductionRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, error instanceof Error
        ? { name: error.name }
        : { type: typeof error })
}

function workflowRouteErrorMessage(error: unknown, fallback: string) {
    if (isProductionRuntime()) {
        return fallback
    }

    if (typeof error === 'string' && error) {
        return error
    }

    if (error instanceof Error && error.message) {
        return error.message
    }

    if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
        return (error as any).message
    }

    return fallback
}

export function workflowRouteErrorBody(error: unknown, publicError: string, developmentError?: string) {
    if (isProductionRuntime()) {
        return { error: publicError }
    }

    const message = workflowRouteErrorMessage(error, publicError)
    return developmentError
        ? { error: developmentError, details: message }
        : { error: message }
}
