
"use server"

import { processAssistantRequest } from "./assistant-engine"
import { AssistantResult } from "./types"

export async function sendMessage(text: string, mode: 'text' | 'voice' = 'text'): Promise<AssistantResult> {
    // In a real app, we would get user_id/space_id from session/headers here
    // For now we assume the Engine resolves context or we pass it if needed.
    // However, context-resolver uses `cookies` or `headers` usually. 
    // Let's assume `processAssistantRequest` handles context resolution internally via `resolveAssistantContext`.

    return await processAssistantRequest({
        text,
        input_mode: mode
    })
}
