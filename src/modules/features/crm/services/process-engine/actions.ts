"use server"

import { ProcessEngine } from "./engine"
import { ProcessContext, ProcessInstance, ProcessState } from "@/types/process-engine"

const PUBLIC_PROCESS_CONTEXT_ERROR = "No se pudo cargar el proceso"
const PUBLIC_PROCESS_TRANSITION_ERROR = "No se pudo cambiar el estado del proceso"

function isDeployedRuntime() {
    return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || !!process.env.VERCEL_ENV
}

function summarizeProcessActionError(error: unknown) {
    if (error instanceof Error) return { name: error.name }

    if (error && typeof error === 'object') {
        return {
            code: (error as any).code,
            status: (error as any).status,
            statusCode: (error as any).statusCode,
            hasMessage: typeof (error as any).message === 'string' && (error as any).message.length > 0,
        }
    }

    return { type: typeof error }
}

function logProcessActionError(label: string, error: unknown) {
    if (!isDeployedRuntime()) {
        console.error(label, error)
        return
    }

    console.error(label, summarizeProcessActionError(error))
}

function processActionErrorMessage(error: unknown, publicMessage: string) {
    if (isDeployedRuntime()) return publicMessage
    if (error instanceof Error) return error.message
    if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
        return error.message
    }
    if (typeof error === 'string' && error.length > 0) return error
    return publicMessage
}

export async function getProcessContextAction(leadId: string): Promise<{
    success: boolean,
    data?: { instance: ProcessInstance, state: ProcessState },
    error?: string
}> {
    try {
        const context = await ProcessEngine.getProcessContext(leadId)
        if (!context) return { success: false, error: "No active process" }
        return { success: true, data: context }
    } catch (error: any) {
        logProcessActionError("[getProcessContextAction] Error:", error)
        return { success: false, error: processActionErrorMessage(error, PUBLIC_PROCESS_CONTEXT_ERROR) }
    }
}

export async function transitionProcessAction(leadId: string, actionKey: string): Promise<{ success: boolean, error?: string }> {
    try {
        const context = await ProcessEngine.getProcessContext(leadId)
        if (!context) return { success: false, error: "No active process" }

        // Logic to interpret 'actionKey'. 
        // If the 'actionKey' is a state key (e.g. 'presentation'), we transition to it.
        // If it's a specific action command, we might need a command mappper.
        // For Phase 9, let's assume buttons pass the *Target State Key*.

        const result = await ProcessEngine.transition(context.instance.id, actionKey, 'user', 'UI Transition')
        if (!result.success) {
            logProcessActionError("[transitionProcessAction] Transition failed:", result.error)
            return {
                success: false,
                error: processActionErrorMessage(result.error, PUBLIC_PROCESS_TRANSITION_ERROR)
            }
        }
        return { success: true }
    } catch (error: any) {
        logProcessActionError("[transitionProcessAction] Error:", error)
        return { success: false, error: processActionErrorMessage(error, PUBLIC_PROCESS_TRANSITION_ERROR) }
    }
}
