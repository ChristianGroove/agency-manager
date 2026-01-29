
import { AssistantModel } from "./assistant-model.interface";
import { MockAssistantModel } from "./mock-model";
import { ClawdbotAssistantModel } from "./clawdbot-model";
import { PersonaplexAssistantModel } from "./personaplex-model";

const MOCK_MODEL = new MockAssistantModel();
const CLAWDBOT_MODEL = new ClawdbotAssistantModel();
const PERSONAPLEX_MODEL = new PersonaplexAssistantModel();

export const AssistantModelRegistry = {
    mock: MOCK_MODEL,
    clawdbot: CLAWDBOT_MODEL,
    personaplex: PERSONAPLEX_MODEL
} as const;

// Feature Flags
const CLAWDBOT_SPACES = ['s1', 'demo_space'];
const PERSONAPLEX_SPACES = ['s1']; // Only s1 has voice for now

export function getModel(modelId: string = 'mock', spaceId?: string): AssistantModel {
    if (modelId === 'mock') return MOCK_MODEL;

    // Phase 5: Voice Preference
    if (modelId === 'personaplex') {
        if (spaceId && PERSONAPLEX_SPACES.includes(spaceId)) {
            return PERSONAPLEX_MODEL;
        }
        console.warn(`[Registry] Personaplex not enabled for ${spaceId}. Fallback.`);
        return MOCK_MODEL;
    }

    // Phase 4: Clawdbot Preference
    if (modelId === 'clawdbot') {
        if (spaceId && CLAWDBOT_SPACES.includes(spaceId)) {
            return CLAWDBOT_MODEL;
        }
        return MOCK_MODEL;
    }

    return MOCK_MODEL;
}
