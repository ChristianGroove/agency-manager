'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlayCircle, Pause, RotateCcw, Plus, X, Beaker } from 'lucide-react';
import { TestExecutionResult, TestNodeResult } from '../test-executor';
import { WorkflowDefinition } from '../engine';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatSimulator } from './simulator/ChatSimulator';

interface TestPanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workflowDefinition: WorkflowDefinition;
    onTestComplete?: (result: TestExecutionResult) => void;
}

interface TestVariable {
    key: string;
    value: string;
}

export function TestPanel({ open, onOpenChange, workflowDefinition, onTestComplete }: TestPanelProps) {
    const [testVariables, setTestVariables] = useState<TestVariable[]>([
        { key: 'lead.name', value: 'John Doe' },
        { key: 'lead.email', value: 'test@example.com' }
    ]);
    const [isRunning, setIsRunning] = useState(false);
    const [testResult, setTestResult] = useState<TestExecutionResult | null>(null);

    const handleAddVariable = () => {
        setTestVariables([...testVariables, { key: '', value: '' }]);
    };

    const handleRemoveVariable = (index: number) => {
        setTestVariables(testVariables.filter((_, i) => i !== index));
    };

    const handleRunTest = async () => {
        setIsRunning(true);
        setTestResult(null);

        try {
            // Convert variables to test data object
            const testData: Record<string, unknown> = {};
            testVariables.forEach(v => {
                if (v.key.trim()) {
                    // Support nested keys like lead.name
                    const keys = v.key.split('.');
                    let current: any = testData;

                    for (let i = 0; i < keys.length - 1; i++) {
                        if (!current[keys[i]]) {
                            current[keys[i]] = {};
                        }
                        current = current[keys[i]];
                    }

                    current[keys[keys.length - 1]] = v.value;
                }
            });

            const response = await fetch(`/api/workflows/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workflowDefinition,
                    testData
                })
            });

            if (!response.ok) {
                throw new Error('Test execution failed');
            }

            const result: TestExecutionResult & { logs: string[] } = await response.json();
            setTestResult(result);
            onTestComplete?.(result);

        } catch (error) {
            console.error('[TestPanel] Error:', error);
            setTestResult({
                success: false,
                nodes: [],
                totalDuration: 0,
                error: (error as Error).message
            });
        } finally {
            setIsRunning(false);
        }
    };

    const handleReset = () => {
        setTestResult(null);
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:w-[500px] sm:max-w-[500px] p-0 border-none bg-white dark:bg-slate-950 flex flex-col shadow-2xl m-4 rounded-2xl h-[calc(100vh-2rem)] overflow-hidden focus:outline-none ring-0">
                {/* Header */}
                <div className="px-6 py-6 border-b border-slate-100 dark:border-slate-900 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20">
                    <SheetHeader className="p-0">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                                <Beaker size={20} />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold text-slate-900 dark:text-white">Testing Sandbox</SheetTitle>
                                <SheetDescription className="text-sm font-medium">
                                    Modo Dry Run - sin modificar datos
                                </SheetDescription>
                            </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-xs h-8 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800"
                                onClick={async () => {
                                    try {
                                        toast.info('Procesando cola de automatización...');
                                        const res = await fetch('/api/webhooks/automation/process-queue', { method: 'POST' });
                                        const data = await res.json();
                                        if (data.processed > 0) {
                                            toast.success(`Se procesaron ${data.processed} tareas pendientes.`);
                                        } else {
                                            toast.info('No hay tareas pendientes en la cola.');
                                        }
                                    } catch (e) {
                                        toast.error('Error al procesar la cola');
                                    }
                                }}
                            >
                                <PlayCircle size={14} className="mr-2" />
                                Procesar Cola (Fast-Forward)
                            </Button>
                        </div>
                    </SheetHeader>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header for Debug Mode */}
                    <div className="px-6 py-2 border-b border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/50">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Configuración de Prueba</span>
                    </div>

                    <ScrollArea className="flex-1 px-6 py-6">
                        <div className="space-y-6">
                            {/* Test Data Configuration */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-semibold text-slate-900 dark:text-white">Variables de Prueba</Label>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAddVariable}
                                        className="h-8 text-xs"
                                    >
                                        <Plus size={14} className="mr-1" />
                                        Añadir
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {testVariables.map((variable, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                placeholder="lead.name"
                                                value={variable.key}
                                                onChange={(e) => {
                                                    const newVars = [...testVariables];
                                                    newVars[index].key = e.target.value;
                                                    setTestVariables(newVars);
                                                }}
                                                className="flex-1 h-10 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                                            />
                                            <Input
                                                placeholder="John Doe"
                                                value={variable.value}
                                                onChange={(e) => {
                                                    const newVars = [...testVariables];
                                                    newVars[index].value = e.target.value;
                                                    setTestVariables(newVars);
                                                }}
                                                className="flex-1 h-10 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                                            />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRemoveVariable(index)}
                                                className="h-10 w-10 p-0 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600"
                                            >
                                                <X size={16} />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Timeline */}
                            {testResult && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-semibold text-slate-900 dark:text-white">Resultado</Label>
                                        <Badge
                                            variant={testResult.success ? 'default' : 'destructive'}
                                            className={testResult.success ? 'bg-green-500' : ''}
                                        >
                                            {testResult.success ? '✓ Exitoso' : '✕ Error'}
                                        </Badge>
                                    </div>

                                    <div className="space-y-2">
                                        {testResult.nodes.map((node, index) => (
                                            <NodeResultCard key={index} node={node} />
                                        ))}
                                    </div>

                                    {testResult.error && (
                                        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl">
                                            <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                                                ⚠️ {testResult.error}
                                            </p>
                                        </div>
                                    )}

                                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl">
                                        <div className="text-xs text-muted-foreground">
                                            Duración total: <span className="font-semibold text-slate-700 dark:text-slate-300">{testResult.totalDuration}ms</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Footer - Only for Debug Mode */}
                    <div className="p-6 border-t border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/50 backdrop-blur-sm mt-auto flex justify-between items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={handleReset}
                            disabled={!testResult || isRunning}
                            className="h-10"
                        >
                            <RotateCcw size={16} className="mr-2" />
                            Reset
                        </Button>
                        <Button
                            onClick={handleRunTest}
                            disabled={isRunning}
                            className="flex-1 h-10 bg-cyan-600 hover:bg-cyan-700 text-white"
                        >
                            {isRunning ? (
                                <>
                                    <Pause size={16} className="mr-2 animate-pulse" />
                                    Ejecutando...
                                </>
                            ) : (
                                <>
                                    <PlayCircle size={16} className="mr-2" />
                                    Ejecutar Dry Run
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

function NodeResultCard({ node }: { node: TestNodeResult }) {
    const statusConfig = {
        success: {
            bg: 'bg-green-50 dark:bg-green-950/20',
            border: 'border-green-200 dark:border-green-900',
            icon: '✓',
            iconColor: 'text-green-600 dark:text-green-400'
        },
        error: {
            bg: 'bg-red-50 dark:bg-red-950/20',
            border: 'border-red-200 dark:border-red-900',
            icon: '✕',
            iconColor: 'text-red-600 dark:text-red-400'
        },
        skipped: {
            bg: 'bg-yellow-50 dark:bg-yellow-950/20',
            border: 'border-yellow-200 dark:border-yellow-900',
            icon: '⊘',
            iconColor: 'text-yellow-600 dark:text-yellow-400'
        },
        running: {
            bg: 'bg-blue-50 dark:bg-blue-950/20',
            border: 'border-blue-200 dark:border-blue-900',
            icon: '▶',
            iconColor: 'text-blue-600 dark:text-blue-400'
        }
    };

    const config = statusConfig[node.status];

    return (
        <div className={`p-4 border rounded-xl ${config.bg} ${config.border} transition-all hover:shadow-md`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                    <div className={`text-lg font-bold ${config.iconColor}`}>
                        {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-slate-900 dark:text-white">{node.nodeLabel}</span>
                            <Badge variant="outline" className="text-xs h-5">
                                {node.nodeType}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                                {node.duration}ms
                            </span>
                        </div>
                        {node.error && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">
                                {node.error}
                            </p>
                        )}
                        {node.logs.length > 0 && (
                            <div className="mt-2 space-y-1">
                                {node.logs.map((log, i) => (
                                    <div key={i} className="text-xs text-muted-foreground">
                                        • {log}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
