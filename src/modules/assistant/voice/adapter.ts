
import { VoiceModelAdapter } from "./types";

/**
 * Placeholder for future Personaplex integration.
 * Does nothing in Phase 3 but enforces the interface exists.
 */
export class PersonaplexAdapter implements VoiceModelAdapter {
    onPartialInput(input: string): void {
        console.log(`[Personaplex] Partial: ${input}`);
    }

    async onFinalInput(input: string): Promise<void> {
        console.log(`[Personaplex] Final: ${input}`);
        // Here we would call the Engine
    }

    onInterrupt(): void {
        console.log(`[Personaplex] Interrupted! Stopping audio generation.`);
    }
}
