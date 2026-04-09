'use client';

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Sparkles, Plus, Loader2 } from 'lucide-react';
import { AISuggestion } from '../ai-analyzer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { WorkflowNode, WorkflowEdge } from '../engine';

interface AISuggestionsPanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    onAddNode: (suggestion: AISuggestion) => void;
}

const nodeIcons: Record<string, string> = {
    trigger: '⚡',
    http: '🌐',
    crm: '👤',
    email: '📧',
    sms: '📱',
    condition: '🔀',
    action: '⚙️'
};

const nodeLabels: Record<string, string> = {
    trigger: 'Trigger',
    http: 'HTTP Request',
    crm: 'CRM',
    email: 'Email',
    sms: 'SMS',
    condition: 'Condición',
    action: 'Acción'
};

export function AISuggestionsPanel({ open, onOpenChange, nodes, edges, onAddNode }: AISuggestionsPanelProps) {
    const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-fetch suggestions when panel opens
    React.useEffect(() => {
        if (open && suggestions.length === 0) {
            fetchSuggestions();
        }
    }, [open]);

    const fetchSuggestions = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/workflows/suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nodes, edges })
            });

            if (!response.ok) {
                throw new Error('Failed to fetch suggestions');
            }

            const data = await response.json();
            setSuggestions(data.suggestions || []);
        } catch (err) {
            console.error('[AISuggestionsPanel] Error:', err);
            setError('No se pudieron obtener sugerencias. Intenta de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddSuggestion = (suggestion: AISuggestion) => {
        onAddNode(suggestion);
        onOpenChange(false);
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.8) return 'bg-green-500';
        if (confidence >= 0.6) return 'bg-yellow-500';
        return 'bg-orange-500';
    };

    const getConfidenceLabel = (confidence: number) => {
        if (confidence >= 0.8) return 'Alta';
        if (confidence >= 0.6) return 'Media';
        return 'Baja';
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:w-[450px] sm:max-w-[450px] p-0 border-none bg-white dark:bg-slate-950 flex flex-col shadow-2xl m-4 rounded-2xl h-[calc(100vh-2rem)] overflow-hidden focus:outline-none ring-0">
                {/* Header */}
                <div className="px-6 py-6 border-b border-slate-100 dark:border-slate-900 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
                    <SheetHeader className="p-0">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white">
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold text-slate-900 dark:text-white">
                                    ✨ Sugerencias IA
                                </SheetTitle>
                                <SheetDescription className="text-sm font-medium">
                                    Próximos pasos inteligentes
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>
                </div>

                {/* Body */}
                <ScrollArea className="flex-1 px-6 py-6">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                            <p className="text-sm text-muted-foreground">
                                Analizando tu workflow...
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl">
                            <p className="text-sm text-red-800 dark:text-red-200">
                                {error}
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchSuggestions}
                                className="mt-3"
                            >
                                Reintentar
                            </Button>
                        </div>
                    )}

                    {!isLoading && !error && suggestions.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <Sparkles size={32} className="text-slate-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                    No hay sugerencias aún
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Añade algunos nodos para recibir sugerencias
                                </p>
                            </div>
                        </div>
                    )}

                    {!isLoading && !error && suggestions.length > 0 && (
                        <div className="space-y-3">
                            {suggestions.map((suggestion, index) => (
                                <SuggestionCard
                                    key={index}
                                    suggestion={suggestion}
                                    onAdd={handleAddSuggestion}
                                    getConfidenceColor={getConfidenceColor}
                                    getConfidenceLabel={getConfidenceLabel}
                                />
                            ))}
                        </div>
                    )}
                </ScrollArea>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/50 backdrop-blur-sm mt-auto">
                    <Button
                        variant="outline"
                        onClick={fetchSuggestions}
                        disabled={isLoading}
                        className="w-full"
                    >
                        <Sparkles size={16} className="mr-2" />
                        Generar Nuevas Sugerencias
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}

function SuggestionCard({
    suggestion,
    onAdd,
    getConfidenceColor,
    getConfidenceLabel
}: {
    suggestion: AISuggestion;
    onAdd: (s: AISuggestion) => void;
    getConfidenceColor: (c: number) => string;
    getConfidenceLabel: (c: number) => string;
}) {
    const icon = nodeIcons[suggestion.nodeType] || '⚙️';
    const label = nodeLabels[suggestion.nodeType] || suggestion.nodeType;
    const confidence = Math.round(suggestion.confidence * 100);

    return (
        <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/50 hover:shadow-lg transition-all hover:border-purple-200 dark:hover:border-purple-900 group">
            <div className="flex items-start gap-3">
                <div className="text-3xl flex-shrink-0">{icon}</div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">
                            {label}
                        </span>
                        <Badge
                            variant="outline"
                            className={`text-xs h-5 ${getConfidenceColor(suggestion.confidence)} text-white border-none`}
                        >
                            {confidence}% {getConfidenceLabel(suggestion.confidence)}
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        {suggestion.reasoning}
                    </p>
                    {suggestion.suggestedConfig && Object.keys(suggestion.suggestedConfig).length > 0 && (
                        <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-950/50 rounded-lg border border-slate-100 dark:border-slate-800">
                            <p className="text-xs font-mono text-slate-600 dark:text-slate-400">
                                {JSON.stringify(suggestion.suggestedConfig, null, 2).slice(0, 80)}...
                            </p>
                        </div>
                    )}
                </div>
            </div>
            <Button
                size="sm"
                onClick={() => onAdd(suggestion)}
                className="w-full mt-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
            >
                <Plus size={14} className="mr-1" />
                Añadir Nodo
            </Button>
        </div>
    );
}
