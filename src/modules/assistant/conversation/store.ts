
import { ConversationState } from "./types";

export interface IConversationStore {
    get(userId: string, spaceId: string): Promise<ConversationState | null>;
    save(state: ConversationState): Promise<void>;
    delete(userId: string, spaceId: string): Promise<void>;
}

// In-Memory implementation for Phase 2 MVP (resets on server restart)
// In production, replace with Redis or Supabase Table
class InMemoryConversationStore implements IConversationStore {
    private store: Map<string, ConversationState> = new Map();
    private TTL_MS = 5 * 60 * 1000; // 5 Minutes

    private getKey(userId: string, spaceId: string): string {
        return `${spaceId}:${userId}`;
    }

    async get(userId: string, spaceId: string): Promise<ConversationState | null> {
        const key = this.getKey(userId, spaceId);
        const state = this.store.get(key);

        if (!state) return null;

        if (Date.now() > state.expires_at) {
            this.store.delete(key);
            return null;
        }

        return state;
    }

    async save(state: ConversationState): Promise<void> {
        const key = this.getKey(state.user_id, state.space_id);
        // Refresh expiry
        state.expires_at = Date.now() + this.TTL_MS;
        state.last_interaction_at = Date.now();
        this.store.set(key, state);
    }

    async delete(userId: string, spaceId: string): Promise<void> {
        const key = this.getKey(userId, spaceId);
        this.store.delete(key);
    }
}

export const ConversationStore = new InMemoryConversationStore();
