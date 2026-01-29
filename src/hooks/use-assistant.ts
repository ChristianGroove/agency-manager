
"use client"

import { useState, useCallback, useRef } from 'react';
import { sendMessage } from '@/modules/assistant/actions';
import { AssistantResult } from '@/modules/assistant/types';

export type Message = {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    suggestedAction?: any; // For Confirmation Cards
    timestamp: number;
}

export type AssistantStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

export function useAssistant() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [status, setStatus] = useState<AssistantStatus>('idle');
    const [isOpen, setIsOpen] = useState(false);

    // Mock Voice Simulation
    const listeningTimeout = useRef<NodeJS.Timeout | null>(null);

    const addMessage = (role: 'user' | 'assistant', text: string, action?: any) => {
        const msg: Message = {
            id: Math.random().toString(36).substr(2, 9),
            role,
            text,
            suggestedAction: action,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, msg]);
        return msg;
    };

    const submitMessage = async (text: string, mode: 'text' | 'voice' = 'text') => {
        if (!text.trim()) return;

        setStatus('thinking');
        addMessage('user', text);

        try {
            const result = await sendMessage(text, mode);

            setStatus(mode === 'voice' ? 'speaking' : 'idle');

            // If voice, simulate speaking time then go idle
            if (mode === 'voice') {
                setTimeout(() => setStatus('idle'), 3000);
            }

            // Suggestions handling
            let action = undefined;
            // We need to parse narrative log if it contains special triggers or if we update the Result type to return action data
            // For now, let's assume result.narrative_log is the text.
            // If the Engine returns a confirmation request, it's usually just text in the log.
            // Phase 6 Goal: Rich UI. We might want to parse the log or update Engine to return metadata.
            // For MVP UI, we'll just display text.

            addMessage('assistant', result.narrative_log, result.data); // data might contain payload if we tweaked Engine?

        } catch (e) {
            console.error(e);
            addMessage('assistant', "⚠️ Error de conexión.");
            setStatus('idle');
        }
    };

    const toggleVoice = () => {
        if (status === 'listening') {
            // Stop listening -> Send
            if (listeningTimeout.current) clearTimeout(listeningTimeout.current);
            setStatus('thinking');
            // Mock input
            submitMessage("Crear brief para cliente demo", 'voice');
        } else {
            setStatus('listening');
            // Mock auto-stop
            listeningTimeout.current = setTimeout(() => {
                submitMessage("Crear brief para cliente demo", 'voice');
            }, 3000);
        }
    };

    return {
        messages,
        status,
        isOpen,
        setIsOpen,
        submitMessage,
        toggleVoice
    };
}
