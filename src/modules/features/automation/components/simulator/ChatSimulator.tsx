'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DeviceMockup } from './DeviceMockup';
import { ClientEngine, ChatMessage } from '../../simulator/client-engine';
import { Node, Edge } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatSimulatorProps {
    nodes: Node[];
    edges: Edge[];
    initialVariables: Record<string, any>;
}

export function ChatSimulator({ nodes, edges, initialVariables }: ChatSimulatorProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [status, setStatus] = useState<'idle' | 'running' | 'suspended' | 'completed'>('idle');
    const [engine, setEngine] = useState<ClientEngine | null>(null);
    const [inputValue, setInputValue] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initialize Engine
    useEffect(() => {
        startSimulation();
    }, [nodes, edges]); // Restart if logic changes? Maybe just on mount or explicit reset.

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const startSimulation = () => {
        setMessages([]);
        setStatus('idle');

        const newEngine = new ClientEngine(
            nodes,
            edges,
            initialVariables,
            (msg) => setMessages(prev => [...prev, msg]),
            (newStatus) => setStatus(newStatus)
        );
        setEngine(newEngine);
        newEngine.start();
    };

    const handleSend = () => {
        if (!inputValue.trim() || !engine) return;
        engine.resume({ content: inputValue });
        setInputValue('');
    };

    const handleButtonClick = (buttonId: string, buttonText: string) => {
        if (!engine) return;
        engine.resume({ content: buttonText, buttonId }); // Simulate button click
    };

    return (
        <div className="flex flex-col items-center gap-4 h-full">
            <div className="flex justify-between w-[300px]">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Estado: {status === 'running' ? 'Ejecutando...' : status === 'suspended' ? 'Esperando Input' : status === 'completed' ? 'Finalizado' : 'Listo'}
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={startSimulation} title="Reiniciar Simulación">
                    <RotateCcw size={14} />
                </Button>
            </div>

            <DeviceMockup>
                {/* Chat Background */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#e5ddd5] dark:bg-slate-900/50" ref={scrollRef}>
                    <div className="text-center text-[10px] text-gray-500 my-2 shadow-sm bg-white/50 inline-block px-2 py-1 rounded mx-auto">
                        Simulación de Chat
                    </div>

                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex flex-col max-w-[85%] text-sm shadow-sm",
                                msg.role === 'user' ? "self-end items-end" :
                                    msg.role === 'assistant' ? "self-start items-start" : "self-center items-center w-full"
                            )}
                        >
                            {/* System Messages */}
                            {msg.role === 'system' && (
                                <span className="text-[10px] text-gray-500 bg-gray-200/50 px-2 py-1 rounded-full mb-1">
                                    {msg.content}
                                </span>
                            )}

                            {/* Chat Bubbles */}
                            {msg.role !== 'system' && (
                                <div
                                    className={cn(
                                        "px-3 py-2 rounded-lg relative",
                                        msg.role === 'user'
                                            ? "bg-[#dcf8c6] dark:bg-emerald-700 text-slate-900 dark:text-white rounded-tr-none"
                                            : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-none"
                                    )}
                                >
                                    <div className="whitespace-pre-wrap">{msg.content}</div>
                                    <div className="text-[9px] text-gray-400 text-right mt-1 w-full">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            )}

                            {/* Interactive Buttons */}
                            {msg.role === 'assistant' && msg.metadata?.type === 'buttons' && (
                                <div className="flex flex-col gap-2 mt-2 w-full">
                                    {msg.metadata.buttons.map((btn: any) => (
                                        <button
                                            key={btn.id}
                                            disabled={status !== 'suspended'}
                                            onClick={() => handleButtonClick(btn.id, btn.title)}
                                            className="bg-white dark:bg-slate-800 text-sky-600 font-medium py-2 px-4 rounded shadow-sm text-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
                                        >
                                            {btn.title}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Input Area */}
                <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-2 flex gap-2">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Escribe un mensaje..."
                        className="h-9 bg-white dark:bg-slate-950 text-xs rounded-full"
                        disabled={status !== 'suspended' && status !== 'running'} // Allow typing while running? Usually wait for suspend.
                    />
                    <Button
                        size="icon"
                        onClick={handleSend}
                        disabled={status !== 'suspended' || !inputValue.trim()}
                        className="h-9 w-9 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white shrink-0"
                    >
                        <Send size={16} />
                    </Button>
                </div>
            </DeviceMockup>
        </div>
    );
}
