
// src/modules/assistant/voice/permissions.ts

// Mock Configuration for Spaces
const SPACE_VOICE_CONFIG: Record<string, { enabled: boolean; allowedActions: string[] }> = {
    's1': {
        enabled: true,
        allowedActions: ['create_brief', 'create_quote', 'list_pending_actions']
    },
    'demo_space': {
        enabled: true,
        allowedActions: ['*']
    }
};

export class VoicePermissions {
    static checkVoiceAccess(spaceId: string): { allowed: boolean; reason?: string } {
        const config = SPACE_VOICE_CONFIG[spaceId];

        if (!config) {
            return { allowed: false, reason: "Este espacio no tiene la voz configurada." };
        }

        if (!config.enabled) {
            return { allowed: false, reason: "La interacción por voz está desactivada en este espacio." };
        }

        return { allowed: true };
    }

    static isActionAllowedByVoice(spaceId: string, actionName: string): boolean {
        const config = SPACE_VOICE_CONFIG[spaceId];
        if (!config || !config.enabled) return false;

        if (config.allowedActions.includes('*')) return true;
        return config.allowedActions.includes(actionName);
    }
}
