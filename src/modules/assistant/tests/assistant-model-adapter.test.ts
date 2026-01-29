
import { processAssistantRequest } from "../assistant-engine";
import { getModel } from "../models/model-registry";

async function runModelTests() {
    console.log("=== STARTING PHASE 3.5 MODEL ADAPTER TEST ===");

    // 1. Verify Model Integrity
    const model = getModel('mock');
    console.log(`[Test] Loaded Model ID: ${model.id}`);

    // 2. Direct Model Query (Unit Test)
    const output = await model.generateResponse({
        message: "Crear brief para cliente demo",
        space_id: "test",
        organization_id: "test",
        context: { allowedActions: [] }
    });

    console.log(`[Test] Direct Output: ${output.text}`);
    if (output.suggestedAction?.type !== 'create_brief') {
        console.error("FAIL: Model did not suggest CREATE_BRIEF");
    } else {
        console.log("PASS: Model suggested CREATE_BRIEF");
    }

    // 3. Engine Integration (Integration Test)
    // Should behave exactly like before, but logs should show "Asking Model..."
    console.log("\n--- ENGINE INTEGRATION ---");
    const res = await processAssistantRequest({ text: "Crear brief para cliente demo", user_id: 'uM1', space_id: 's1' });
    console.log(`[Result] ${res.narrative_log}`);

    if (res.narrative_log.includes("Confirmas")) {
        console.log("PASS: Engine correctly processed Model Suggestion -> Confirmation Flow");
    } else {
        console.error("FAIL: Engine flow broken.");
    }

    console.log("\n=== TEST COMPLETE ===");
}

// runModelTests();
