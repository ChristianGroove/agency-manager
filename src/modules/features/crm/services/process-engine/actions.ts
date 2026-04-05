"use server"

import { ProcessEngine } from "./engine"
import { ProcessContext, ProcessInstance, ProcessState } from "@/types/process-engine"

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
        return { success: false, error: error.message }
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
        return { success: result.success, error: result.error }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
