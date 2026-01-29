
// src/modules/assistant/voice/session.ts

export type VoiceSessionStatus = 'idle' | 'listening' | 'processing' | 'speaking';

export interface VoiceSession {
    sessionId: string;
    userId: string;
    spaceId: string;
    status: VoiceSessionStatus;
    startedAt: number;
    expiresAt: number;
    metadata: Record<string, any>;
}

// In-Memory Store for Voice Sessions (Ephemaral, Real-time)
class InMemoryVoiceSessionManager {
    private sessions: Map<string, VoiceSession> = new Map();
    private TTL_MS = 5 * 60 * 1000; // 5 Minutes max session life

    createSession(userId: string, spaceId: string): VoiceSession {
        // Cleanup old sessions for this user/space
        this.cleanup(userId, spaceId);

        const id = `vs_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const session: VoiceSession = {
            sessionId: id,
            userId,
            spaceId,
            status: 'idle',
            startedAt: Date.now(),
            expiresAt: Date.now() + this.TTL_MS,
            metadata: {}
        };

        this.sessions.set(userId, session); // Index by User for quick lookup
        return session;
    }

    getSession(userId: string): VoiceSession | null {
        const session = this.sessions.get(userId);
        if (!session) return null;

        if (Date.now() > session.expiresAt) {
            this.sessions.delete(userId);
            return null;
        }

        return session;
    }

    updateStatus(userId: string, status: VoiceSessionStatus) {
        const session = this.getSession(userId);
        if (session) {
            session.status = status;
            session.expiresAt = Date.now() + this.TTL_MS; // Heartbeat
            this.sessions.set(userId, session);
        }
    }

    cleanup(userId: string, spaceId: string) {
        // logic to remove specific session if needed, for MVP we overwrite key
        this.sessions.delete(userId);
    }
}

export const VoiceSessionManager = new InMemoryVoiceSessionManager();
