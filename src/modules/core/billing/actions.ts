'use server'

import { checkAndGenerateCycles } from "@/lib/billing-automation"
import { revalidatePath } from "next/cache"

export async function runBillingCycleCheck() {
    try {
        const result = await checkAndGenerateCycles()

        if (result.success && result.count && result.count > 0) {
            revalidatePath('/', 'layout')
        }

        // Fix serialization of Error objects which normally stringify to {}
        if (!result.success && result.error && result.error instanceof Error) {
            return {
                ...result,
                error: {
                    message: result.error.message,
                    name: result.error.name,
                    cause: (result.error as any).cause
                }
            }
        }

        return JSON.parse(JSON.stringify(result))
    } catch (error: any) {
        console.error("Server Action Error (Billing Check):", error)
        return { success: false, error: error.message || "Unknown Server Action Error" }
    }
}
