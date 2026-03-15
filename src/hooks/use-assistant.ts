
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

    // State management
    const listeningTimeout = useRef<NodeJS.Timeout | null>(null);
    const isLoadingRef = useRef(false);

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
        const trimmedText = text.trim();
        if (!trimmedText || isLoadingRef.current) return;

        setStatus('thinking');
        isLoadingRef.current = true;
        addMessage('user', trimmedText);

        try {
            const result = await sendMessage(trimmedText, mode);

            setStatus(mode === 'voice' ? 'speaking' : 'idle');

            // If voice, simulate speaking time then go idle
            if (mode === 'voice') {
                setTimeout(() => setStatus('idle'), 3000);
            }

            addMessage('assistant', result.narrative_log, result.data);

        } catch (e) {
            console.error(e);
            addMessage('assistant', "⚠️ Error de conexión.");
            setStatus('idle');
        } finally {
            isLoadingRef.current = false;
        }
    };

    const toggleVoice = () => {
        if (status === 'listening') {
            setStatus('idle');
            if (listeningTimeout.current) clearTimeout(listeningTimeout.current);
        } else {
            setStatus('listening');
            // Baseline for real voice input integration
            console.log("[Assistant] Voice listening triggered...");
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
