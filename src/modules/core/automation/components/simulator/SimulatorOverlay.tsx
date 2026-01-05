import React, { useState, useEffect, useRef } from 'react';
import { DeviceMockup } from './DeviceMockup';
import { ClientEngine, ChatMessage } from '@/modules/core/automation/simulator/client-engine';
import { Button } from '@/components/ui/button';
import { RefreshCcw, X, Send, Paperclip, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Edge, Node } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';

interface SimulatorOverlayProps {
    open: boolean;
    onClose: () => void;
    nodes: Node[];
    edges: Edge[];
    initialVariables?: Record<string, any>;
}

export function SimulatorOverlay({ open, onClose, nodes, edges, initialVariables = {} }: SimulatorOverlayProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [engine, setEngine] = useState<ClientEngine | null>(null);
    const [status, setStatus] = useState<'idle' | 'running' | 'suspended' | 'completed'>('idle');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open) {
            startSimulation();
        } else {
            setEngine(null);
            setMessages([]);
            setStatus('idle');
        }
    }, [open]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, status]);

    const startSimulation = () => {
        setMessages([]);
        const newEngine = new ClientEngine(
            nodes,
            edges,
            initialVariables,
            (msg) => setMessages(prev => [...prev, msg]),
            (s) => setStatus(s)
        );
        setEngine(newEngine);
        newEngine.start();
    };

    const handleSendMessage = (text: string) => {
        if (!text.trim() || !engine) return;
        engine.resume({ content: text });
        setInput('');
    };

    const handleButtonClick = (btnId: string, btnTitle: string) => {
        if (!engine) return;
        engine.resume({ content: btnTitle, buttonId: btnId });
    };

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center sm:justify-end sm:px-12 pointer-events-none">
                    <motion.div
                        initial={{ x: 400, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 400, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="pointer-events-auto relative pt-12 pb-8"
                    >
                        {/* Control Bar floating above phone */}
                        <div className="absolute top-2 right-4 z-50 flex gap-2">
                            <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-full shadow-lg bg-white dark:bg-slate-800 hover:bg-slate-100"
                                onClick={startSimulation}
                                title="Restart"
                            >
                                <RefreshCcw size={14} />
                            </Button>
                            <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 rounded-full shadow-lg bg-white dark:bg-slate-800 hover:bg-slate-100"
                                onClick={onClose}
                                title="Close Simulator"
                            >
                                <X size={14} />
                            </Button>
                        </div>

                        <DeviceMockup className="shadow-2xl">
                            {/* WhatsApp-like Background */}
                            <div className="flex flex-col h-full bg-[#efeae2] relative">
                                {/* Doodle Pattern Overlay (Optional, simplified as CSS pattern) */}
                                <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
                                    style={{ backgroundImage: 'radial-gradient(#4a5568 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                                </div>

                                {/* Header (WhatsApp Style) */}
                                <div className="h-14 bg-[#075e54] flex items-center px-4 gap-3 shrink-0 z-10 text-white">
                                    <div className="h-8 w-8 bg-slate-200 rounded-full flex-shrink-0"></div>
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-sm">Empresa Demo</span>
                                        <span className="text-[10px] opacity-80">
                                            {status === 'running' ? 'Escribiendo...' : 'En línea'}
                                        </span>
                                    </div>
                                </div>

                                {/* Chat Area */}
                                <div
                                    ref={scrollRef}
                                    className="flex-1 overflow-y-auto p-4 space-y-2 z-10 scrollbar-thin scrollbar-thumb-slate-300"
                                >
                                    {/* System / Date Bubble */}
                                    <div className="flex justify-center my-2">
                                        <div className="bg-[#e1f3fb] text-[10px] text-slate-500 px-2 py-1 rounded shadow-sm">
                                            Hoy
                                        </div>
                                    </div>

                                    {messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={cn(
                                                "flex flex-col max-w-[80%] text-sm",
                                                msg.role === 'user'
                                                    ? "self-end items-end ml-auto"
                                                    : "self-start items-start mr-auto"
                                            )}
                                        >
                                            {/* Message Bubble */}
                                            <div
                                                className={cn(
                                                    "px-3 py-1.5 rounded-lg shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]",
                                                    msg.role === 'user'
                                                        ? "bg-[#d9fdd3] text-gray-900 rounded-tr-none" // WhatsApp User Green
                                                        : msg.role === 'system'
                                                            ? "bg-[#fff5c4] text-gray-600 text-xs shadow-none border border-yellow-200" // System Warning
                                                            : "bg-white text-gray-900 rounded-tl-none" // WhatsApp Bot White
                                                )}
                                            >
                                                {msg.role === 'system' ? (
                                                    <span className="italic block mb-1">System: {msg.content}</span>
                                                ) : (
                                                    <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                                                )}

                                                {/* Metadata / Time */}
                                                <div className="flex justify-end items-center gap-1 mt-1 opacity-60">
                                                    <span className="text-[10px]">
                                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {msg.role === 'user' && (
                                                        <span className="text-blue-500 text-[10px]">✓✓</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Render Buttons */}
                                            {msg.metadata?.type === 'buttons' && msg.metadata.buttons && (
                                                <div className="flex flex-col gap-2 mt-2 w-full">
                                                    {msg.metadata.buttons.map((btn: any) => (
                                                        <button
                                                            key={btn.id}
                                                            onClick={() => handleButtonClick(btn.id, btn.title)}
                                                            className="w-full bg-white text-[#00a884] font-medium py-2.5 rounded-lg shadow-sm hover:bg-slate-50 transition-colors text-sm"
                                                        >
                                                            {btn.title}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Input Area (WhatsApp Style) */}
                                <div className="p-2 bg-[#f0f2f5] flex items-center gap-2 z-10">
                                    <Button size="icon" variant="ghost" className="text-slate-500" disabled>
                                        <Smile size={24} />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="text-slate-500" disabled>
                                        <Paperclip size={24} />
                                    </Button>

                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(input)}
                                        placeholder="Escribe un mensaje"
                                        disabled={status === 'completed'}
                                        className="flex-1 bg-white border-none rounded-lg px-4 py-2 text-sm focus:outline-none placeholder:text-slate-400"
                                    />

                                    <Button
                                        size="icon"
                                        disabled={!input.trim() || status === 'completed'}
                                        onClick={() => handleSendMessage(input)}
                                        className={cn(
                                            "rounded-full w-10 h-10 shrink-0 transition-colors",
                                            input.trim() ? "bg-[#00a884] hover:bg-[#008f6f] text-white" : "bg-transparent text-slate-500"
                                        )}
                                    >
                                        <Send size={20} />
                                    </Button>
                                </div>
                            </div>
                        </DeviceMockup>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
