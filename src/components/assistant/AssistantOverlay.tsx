
"use client"

import React, { useEffect, useRef } from 'react';
import { useAssistant } from '@/hooks/use-assistant';
import { Visualizer } from './Visualizer';
import { ChatMessage } from './ChatMessage';
import { Mic, Send, X, Sparkles, MessageSquare } from 'lucide-react';

export function AssistantOverlay() {
    const { messages, status, isOpen, setIsOpen, submitMessage, toggleVoice } = useAssistant();
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Keyboard Shortcut (Cmd+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
                setTimeout(() => inputRef.current?.focus(), 100);
            }
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, setIsOpen]);

    const handleSend = () => {
        if (inputRef.current?.value) {
            submitMessage(inputRef.current.value);
            inputRef.current.value = '';
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSend();
    };

    if (!isOpen) return (
        <button
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-tr from-pink-500 to-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
        >
            <Sparkles className="w-6 h-6 animate-pulse" />
        </button>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:items-end sm:justify-end sm:p-6 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Main Surface */}
            <div className="w-full h-full sm:h-[600px] sm:w-[400px] bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-white/20 dark:border-gray-700 shadow-2xl rounded-none sm:rounded-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-white/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center text-white">
                            <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Pixy Assistant</h3>
                            <p className="text-xs text-gray-500">{status === 'idle' ? 'Ready to help' : status === 'listening' ? 'Listening...' : status === 'thinking' ? 'Thinking...' : 'Speaking...'}</p>
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-black/20">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-60">
                            <Sparkles className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-sm text-gray-500">
                                Ask me to create briefs, quotes, or flows.<br />
                                Try <em>"Crear brief para cliente Corotos"</em>
                            </p>
                        </div>
                    )}
                    {messages.map(msg => (
                        <ChatMessage
                            key={msg.id}
                            message={msg}
                            onActionConfirm={(action) => submitMessage("Simòn, confirmo", 'voice')}
                        // Mocking confirmation via voice simulation for now
                        />
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Visualizer Area (Only active if not idle) */}
                <div className={`transition-all duration-300 ${status !== 'idle' ? 'h-[60px] opacity-100' : 'h-0 opacity-0 overflow-hidden'}`}>
                    <Visualizer status={status} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white/80 dark:bg-gray-900/80 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 ring-1 ring-transparent focus-within:ring-indigo-500 transition-shadow">
                        <input
                            ref={inputRef}
                            type="text"
                            className="flex-1 bg-transparent border-none focus:outline-none text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400"
                            placeholder="Type or speak..."
                            onKeyPress={handleKeyPress}
                        />
                        <button
                            onClick={toggleVoice}
                            className={`p-2 rounded-full transition-all ${status === 'listening' ? 'bg-red-500 text-white animate-pulse' : 'text-gray-500 hover:text-indigo-600'}`}
                        >
                            <Mic className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleSend}
                            className="p-2 rounded-full text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="text-center mt-2">
                        <span className="text-[10px] text-gray-400">Powered by Pixy Intelligence™ v2.0 • Phase 6 UI</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
