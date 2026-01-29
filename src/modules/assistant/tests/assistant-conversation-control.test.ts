
import { processAssistantRequest } from "../assistant-engine";
import { ConversationStore } from "../conversation/store";

// Mock Sleep for readability in logs
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function runConversationTests() {
    console.log("=== STARTING PHASE 2 CONVERSATION CONTROL TEST ===");

    // Scenario 1: Cancellation Flow
    // User: "Crear cliente" (Missing name) -> Assistant: "¿Nombre?" -> User: "Cancelar"

    console.log("\n--- SCENARIO 1: Cancellation ---");
    // Clear Store first
    // Note: Store is singleton in memory, so it persists across calls in same process.

    let res = await processAssistantRequest({ text: "Crear cliente", user_id: 'u1', space_id: 's1' });
    console.log(`[Turn 1] User: "Crear cliente" -> Assistant: "${res.narrative_log}"`);

    res = await processAssistantRequest({ text: "Cancelar", user_id: 'u1', space_id: 's1' });
    console.log(`[Turn 2] User: "Cancelar" -> Assistant: "${res.narrative_log}"`);

    // Scenario 2: Happy Path with Confirmation
    // User: "Crear brief para cliente demo" (Complete) -> Assistant: "Confirm?" -> User: "Sí"

    console.log("\n--- SCENARIO 2: Confirmation Flow ---");
    res = await processAssistantRequest({ text: "Crear brief para cliente demo", user_id: 'u1', space_id: 's1' });
    console.log(`[Turn 1] User: "Crear brief..." -> Assistant: "${res.narrative_log}"`);

    // Check if waiting confirmation
    if (res.narrative_log.includes("Confirmas")) {
        res = await processAssistantRequest({ text: "Sí", user_id: 'u1', space_id: 's1' });
        console.log(`[Turn 2] User: "Sí" -> Assistant: "${res.narrative_log}"`);
    } else {
        console.error("FAIL: Did not ask for confirmation.");
    }

    console.log("\n=== TEST COMPLETE ===");
}

// runConversationTests();
