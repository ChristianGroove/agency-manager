
import { processAssistantRequest } from "../assistant-engine";
import { rateLimiter } from "./rate-limiter";
import { getModel } from "./model-registry";

async function runClawdbotTests() {
    console.log("=== STARTING PHASE 4 CLAWDBOT TEST ===");

    // 1. Feature Flag Test
    console.log("\n--- TEST 1: Feature Flag (Space 's1' = Enabled) ---");
    const modelEnabled = getModel('clawdbot', 's1');
    console.log(`Requested 'clawdbot' for 's1' -> Got ID: ${modelEnabled.id}`);
    if (modelEnabled.id.includes('clawdbot')) console.log("PASS: Feature Flag Enabled");
    else console.error("FAIL: Should have got Clawdbot");

    console.log("\n--- TEST 2: Feature Flag (Space 'other' = Disabled) ---");
    const modelDisabled = getModel('clawdbot', 'other');
    console.log(`Requested 'clawdbot' for 'other' -> Got ID: ${modelDisabled.id}`);
    if (modelDisabled.id.includes('mock')) console.log("PASS: Feature Flag Disabled (Fallback to Mock)");
    else console.error("FAIL: Should have fallen back to Mock");

    // 2. Integration Test (Mocked API)
    console.log("\n--- TEST 3: Full Integration (Crear Cotización) ---");
    // Ensure rate limit is clear
    rateLimiter.reset();

    const res = await processAssistantRequest({ text: "Crear cotización web", user_id: 'uC1', space_id: 's1' });
    console.log(`[Result] ${res.narrative_log}`);

    // We expect Clawdbot (mock client) to suggest create_quote -> Engine asks Confirmation
    if (res.narrative_log.includes("Confirmas")) {
        console.log("PASS: Clawdbot suggested action -> Engine triggered Confirmation");
    } else {
        console.error("FAIL: Flow broken.");
    }

    // 3. Rate Limit Test
    console.log("\n--- TEST 4: Rate Limit ---");
    // Exhaust limit (Mock limit is 50, let's just force it)
    // We can interact with rateLimiter directly or loop
    for (let i = 0; i < 55; i++) rateLimiter.checkLimit('s1');

    const resLimit = await processAssistantRequest({ text: "Hola", user_id: 'uC1', space_id: 's1' });
    if (resLimit.narrative_log.includes("límite diario")) {
        console.log("PASS: Rate Limit blocked request.");
    } else {
        console.error("FAIL: Rate Limit did not trigger.");
    }

    console.log("\n=== TEST COMPLETE ===");
}

// runClawdbotTests();
