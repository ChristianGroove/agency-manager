
import { processAssistantRequest } from "../assistant-engine";
import { ConversationStore } from "../conversation/store";

async function runVoiceTests() {
    console.log("=== STARTING PHASE 3 VOICE READINESS TEST ===");

    // Scenario 1: Filler Words Normalization
    console.log("\n--- SCENARIO 1: Filler Words ---");
    let res = await processAssistantRequest({ text: "Mmm este... quisiera eh... crear brief", user_id: 'uV1', space_id: 's1' });
    console.log(`[Turn 1] User: "Mmm este... crear brief" -> Assistant: "${res.narrative_log}"`); // Should ask for Client

    // Scenario 2: Correction Interruption
    console.log("\n--- SCENARIO 2: Interruption/Correction ---");

    // 1. Initial request
    res = await processAssistantRequest({ text: "Crear cotización nueva", user_id: 'uV2', space_id: 's1' });
    // Engine defaults 'demo_client_id' -> Asks Confirm
    console.log(`[Turn 1] Assistant: "${res.narrative_log}"`);

    // 2. Interruption: "No wait, change items"
    // Note: Our logic treats non-confirm as Correction/Param Input.
    // The engine's heuristic is simple: it passes "Cambiar items a SEO" as the input for *missing param* check.
    // Since 'items' is already filled (with mock), we need to see if logic updates it.
    // Current Engine Phase 3 implementation logic: 
    // "If waiting_confirmation and input != yes/no -> state.status = collecting -> processStateTransition"
    // IntentResolver check: missing_parameter is NULL (completed). 
    // processStateTransition: returns "is_ready" -> execute? 
    // WAIT. If we just loop back, it attempts to EXECUTE with old params because "is_ready" is true!
    // FIX NEEDED in Engine: If we go back to collecting, we need to INVALIDATE confirmation or UPDATE params.

    // Let's test what happens currently.
    res = await processAssistantRequest({ text: "Bueno pero cambia el precio a 2000", user_id: 'uV2', space_id: 's1' });
    console.log(`[Turn 2] User Interrupt: "Cambia el precio..." -> Assistant: "${res.narrative_log}"`);

    console.log("\n=== TEST COMPLETE ===");
}

// runVoiceTests();
