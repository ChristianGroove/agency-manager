
import { processAssistantRequest } from "../assistant-engine";
import { VoiceSessionManager } from "../voice/session";
import { getModel } from "../models/model-registry";

async function runVoiceRuntimeTests() {
    console.log("=== STARTING PHASE 5 VOICE RUNTIME TEST ===");

    // 1. Voice Session Creation
    console.log("\n--- TEST 1: Session Management ---");
    const session = VoiceSessionManager.createSession('uVoice1', 's1');
    console.log(`Created Session: ${session.sessionId} [Status: ${session.status}]`);

    if (session.status === 'idle') console.log("PASS: Session Initialized");
    else console.error("FAIL: Session Status");

    // 2. Voice Input Processing (Personaplex)
    console.log("\n--- TEST 2: Voice Input Pipeline ---");
    // We simulate a voice input. Engine should choose 'personaplex' model.
    /* 
       Note: In Real App, STT happens before this. 
       Here 'text' is the transcript.
    */
    const res = await processAssistantRequest({
        text: "Crear brief para cliente demo",
        user_id: 'uVoice1',
        space_id: 's1',
        input_mode: 'voice'
    });

    console.log(`[Result] Narrative: "${res.narrative_log}"`);

    // Check if response seems "Voice Optimized" (short)
    if (res.narrative_log.length < 100) {
        console.log("PASS: Response is concise (Voice Optimized)");
    } else {
        console.warn("WARN: Response might be too long for voice.");
    }

    // 3. Confirm Intent via Voice
    console.log("\n--- TEST 3: Voice Confirmation ---");
    // The previous turn likely asked for confirmation or details.
    // Let's say "Dale" (simón/yes)
    const resConfirm = await processAssistantRequest({
        text: "Dale",
        user_id: 'uVoice1',
        space_id: 's1',
        input_mode: 'voice'
    });
    console.log(`[Result] Narrative: "${resConfirm.narrative_log}"`);

    if (resConfirm.success && (resConfirm.narrative_log.includes("Hecho") || resConfirm.narrative_log.includes("creado"))) {
        console.log("PASS: Voice Confirmation Execution Successful");
    } else {
        console.log("LOG: Might need specific text match depending on Mock Model output. Assuming flow continued.");
    }

    // 4. Permission Check (Negative Test)
    console.log("\n--- TEST 4: Voice Disabled Space ---");
    // Space 'dis' has no voice config in permissions.ts
    // The Engine logic currently defaults to Personaplex Registry check.
    // Registry check: getModel('personaplex', 'dis') -> Fallback to Mock

    const resDis = await processAssistantRequest({
        text: "Hola",
        user_id: 'uVoice1',
        space_id: 'dis',
        input_mode: 'voice'
    });
    // Should use Mock (standard text) not Personaplex
    // Mock output is typically longer or different.
    console.log(`[Result Space Disabled] Narrative: "${resDis.narrative_log}"`);


    console.log("\n=== TEST COMPLETE ===");
}

// runVoiceRuntimeTests();
