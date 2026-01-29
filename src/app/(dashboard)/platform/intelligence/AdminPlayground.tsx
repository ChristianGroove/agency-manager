'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // Assuming shadcn
import { Input } from '@/components/ui/input';
import { FlaskConical, Send, Terminal, Loader2 } from 'lucide-react';
import { sendMessage } from '@/modules/assistant/actions'; // Reusing the real action
import { AssistantResult } from '@/modules/assistant/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function AdminPlayground() {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<{ type: 'in' | 'out', content: any, timestamp: number }[]>([]);

    const handleRun = async () => {
        if (!input.trim()) return;
        setLoading(true);

        const prompt = input;
        setHistory(prev => [{ type: 'in', content: prompt, timestamp: Date.now() }, ...prev]);
        setInput('');

        try {
            // Force text mode for playground
            const result = await sendMessage(prompt, 'text');
            setHistory(prev => [{ type: 'out', content: result, timestamp: Date.now() }, ...prev]);
        } catch (e: any) {
            setHistory(prev => [{ type: 'out', content: { success: false, narrative_log: e.message }, timestamp: Date.now() }, ...prev]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FlaskConical className="w-5 h-5 text-orange-500" />
                    Laboratorio de Pruebas
                </CardTitle>
                <CardDescription>
                    Envía comandos raw al Assistant Engine y analiza la respuesta JSON.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
                {/* Input Area */}
                <div className="flex gap-2">
                    <Input
                        placeholder="Escribe un comando... (ej. 'Crear brief')"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleRun()}
                        disabled={loading}
                        className="font-mono bg-muted/50"
                    />
                    <Button onClick={handleRun} disabled={loading} size="icon">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                </div>

                {/* Output Log */}
                <div className="flex-1 overflow-y-auto bg-slate-950 rounded-lg p-4 font-mono text-xs text-slate-300 border shadow-inner">
                    {history.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                            <Terminal className="w-8 h-8 mb-2" />
                            <p>Esperando input...</p>
                        </div>
                    )}
                    {history.map((entry, i) => (
                        <div key={entry.timestamp} className={`mb-4 border-b border-slate-800 pb-4 last:border-0 ${entry.type === 'in' ? 'opacity-80' : ''}`}>
                            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                <span>{entry.type === 'in' ? '>>> ADMIN INPUT' : '<<< ENGINE OUTPUT'}</span>
                                <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                            </div>

                            {entry.type === 'in' ? (
                                <p className="text-green-400">$ {entry.content}</p>
                            ) : (
                                <ResultViewer result={entry.content} />
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

function ResultViewer({ result }: { result: AssistantResult }) {
    return (
        <div className="space-y-2">
            <div>
                <span className="text-blue-400">Narrative:</span> <span className="text-white">"{result.narrative_log}"</span>
            </div>
            {result.data && (
                <div className="bg-slate-900 rounded p-2 overflow-x-auto">
                    <span className="text-purple-400 block mb-1">Payload (JSON):</span>
                    <pre className="text-yellow-300">{JSON.stringify(result.data, null, 2)}</pre>
                </div>
            )}
            <div className="flex gap-2 mt-1">
                <span className={`px-1.5 rounded ${result.success ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                    {result.success ? 'SUCCESS' : 'FAILURE'}
                </span>
                {result.metadata && <span className="text-slate-500">Trace: {JSON.stringify(result.metadata)}</span>}
            </div>
        </div>
    )
}
