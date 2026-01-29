
export type InputMode = 'text' | 'voice';

export type InteractionTurn = {
    turn_id: string;
    space_id: string;
    user_id: string;
    input_mode: InputMode;
    raw_input: string;
    normalized_input: string;
    interrupted?: boolean;
    timestamp: number;
}

export type VoiceContext = {
    last_intent?: string; // Name of intent
    last_entity?: string; // Last referenced entity (e.g. "ACME")
    last_action?: string; // Last executed action
    expires_at: number;
}

export interface VoiceModelAdapter {
    onPartialInput(input: string): void;
    onFinalInput(input: string): Promise<void>;
    onInterrupt(): void;
}
