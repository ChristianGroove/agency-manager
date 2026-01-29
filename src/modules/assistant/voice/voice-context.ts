
import { VoiceContext } from "./types";

// In-Memory Short-Term Memory for Voice Context
// This is even shorter than ConversationState (2 mins vs 5 mins)
// It resets mostly on every new turn unless chained.

class InMemoryVoiceContextManager {
    private store: Map<string, VoiceContext> = new Map();
    private TTL_MS = 2 * 60 * 1000; // 2 Minutes

    private getKey(userId: string, spaceId: string): string {
        return `${spaceId}:${userId}:voice`;
    }

    get(userId: string, spaceId: string): VoiceContext | null {
        const key = this.getKey(userId, spaceId);
        const ctx = this.store.get(key);

        if (!ctx) return null;
        if (Date.now() > ctx.expires_at) {
            this.store.delete(key);
            return null;
        }
        return ctx;
    }

    set(userId: string, spaceId: string, context: Partial<VoiceContext>) {
        const key = this.getKey(userId, spaceId);
        const existing = this.get(userId, spaceId) || { expires_at: 0 };

        const updated: VoiceContext = {
            ...existing,
            ...context,
            expires_at: Date.now() + this.TTL_MS
        };

        this.store.set(key, updated);
    }

    clear(userId: string, spaceId: string) {
        this.store.delete(this.getKey(userId, spaceId));
    }
}

export const VoiceContextManager = new InMemoryVoiceContextManager();
