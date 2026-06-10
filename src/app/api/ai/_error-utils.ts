import { isProductionRuntime } from '@/app/api/_guards/request-guards'

export function logAiRouteError(label: string, error: unknown) {
    if (!isProductionRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, error instanceof Error
        ? { name: error.name }
        : { type: typeof error })
}

export function aiRouteErrorMessage(error: unknown, fallback: string) {
    if (isProductionRuntime()) {
        return fallback
    }

    if (error instanceof Error && error.message) {
        return error.message
    }

    if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
        return (error as any).message
    }

    return fallback
}
