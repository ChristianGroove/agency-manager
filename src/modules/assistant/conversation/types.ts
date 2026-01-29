
export type ConversationStatus = 'idle' | 'collecting_params' | 'waiting_confirmation';

export type ConversationState = {
    space_id: string;
    user_id: string;
    active_intent?: string; // Name of the intent
    pending_parameters: Record<string, any>; // Collected so far
    missing_parameters: string[]; // What we still need
    status: ConversationStatus;
    expires_at: number; // Timestamp
    last_interaction_at: number;
}

export type ConversationInput = {
    text: string;
    user_id: string;
    space_id: string;
}
