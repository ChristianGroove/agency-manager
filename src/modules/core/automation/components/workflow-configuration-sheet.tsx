import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
    Settings2,
    History,
    Check,
    RotateCcw,
    Calendar,
    User,
    Plus,
    X,
    PlayCircle,
    Pause,
    Tag,
    Save,
    Globe,
    MessageCircle
} from 'lucide-react';
import { getWorkflowVersions, restoreWorkflowVersion } from '../actions';
import { TestExecutionResult, TestNodeResult } from '../test-executor';
import { WorkflowDefinition } from '../engine';
import { ChannelSelector } from './channel-selector';

interface WorkflowConfigurationSheetProps {
    isOpen: boolean;
    onClose: () => void;
    // Settings Props
    initialName: string;
    initialDescription: string;
    initialIsActive: boolean;
    initialChannelId?: string; // New: Current channel ID
    onSaveSettings: (name: string, description: string, isActive: boolean) => Promise<void>;
    onChannelChange?: (channelId: string | null) => void; // New: Callback to update graph
    // History Props
    workflowId: string;
    onVersionRestored: () => void;
    // Test Props
    workflowDefinition: WorkflowDefinition;
    onTestComplete?: (result: TestExecutionResult) => void;
    defaultTab?: string;
}

export function WorkflowConfigurationSheet({
    isOpen,
    onClose,
    initialName,
    initialDescription,
    initialIsActive,
    initialChannelId,
    onSaveSettings,
    onChannelChange,
    workflowId,
    onVersionRestored,
    workflowDefinition,
    onTestComplete,
    defaultTab = "settings"
}: WorkflowConfigurationSheetProps) {
    const [activeTab, setActiveTab] = useState(defaultTab || 'settings');

    // --- Settings State ---
    const [name, setName] = useState(initialName);
    const [description, setDescription] = useState(initialDescription);
    const [isActive, setIsActive] = useState(initialIsActive);
    const [channelId, setChannelId] = useState<string | null>(initialChannelId || null);
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    // --- History State ---
    const [versions, setVersions] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [restoringId, setRestoringId] = useState<string | null>(null);

    // --- Test State ---
    const [testVariables, setTestVariables] = useState<{ key: string; value: string }[]>([
        { key: 'lead.name', value: 'John Doe' },
        { key: 'lead.email', value: 'john@example.com' }
    ]);
    const [isRunningTest, setIsRunningTest] = useState(false);
    const [testResult, setTestResult] = useState<TestExecutionResult | null>(null);

    // Initial state sync
    useEffect(() => {
        if (isOpen) {
            setName(initialName);
            setDescription(initialDescription || '');
            setIsActive(initialIsActive);
            setChannelId(initialChannelId || null);
            if (defaultTab) setActiveTab(defaultTab);
        }
    }, [isOpen, initialName, initialDescription, initialIsActive, initialChannelId, workflowId, defaultTab]);

    // Load history when tab changes to history
    useEffect(() => {
        if (isOpen && activeTab === 'history') {
            loadVersions();
        }
    }, [activeTab, isOpen, workflowId]);

    // --- Settings Handlers ---
    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        await onSaveSettings(name, description, isActive);
        setIsSavingSettings(false);
        toast.success("Configuración guardada");
    };

    // --- History Handlers ---
    const loadVersions = async () => {
        setIsLoadingHistory(true);
        try {
            const data = await getWorkflowVersions(workflowId);
            setVersions(data as any[]);
        } catch (error) {
            console.error("Failed to load versions", error);
            toast.error("Error cargando historial");
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleRestore = async (version: any) => {
        if (!confirm(`¿Estás seguro de restaurar la Versión ${version.version_number}? Se sobrescribirán los cambios actuales.`)) {
            return;
        }
        setRestoringId(version.id);
        try {
            await restoreWorkflowVersion(workflowId, version.id);
            toast.success(`Versión ${version.version_number} restaurada`);
            onVersionRestored();
            onClose();
        } catch (error) {
            toast.error("Error al restaurar versión");
        } finally {
            setRestoringId(null);
        }
    };

    // --- Test Handlers ---
    const handleAddVariable = () => setTestVariables([...testVariables, { key: '', value: '' }]);
    const handleRemoveVariable = (index: number) => setTestVariables(testVariables.filter((_, i) => i !== index));

    const handleRunTest = async () => {
        setIsRunningTest(true);
        setTestResult(null);
        try {
            const testData: Record<string, unknown> = {};
            testVariables.forEach(v => {
                if (v.key.trim()) {
                    const keys = v.key.split('.');
                    let current: any = testData;
                    for (let i = 0; i < keys.length - 1; i++) {
                        if (!current[keys[i]]) current[keys[i]] = {};
                        current = current[keys[i]];
                    }
                    current[keys[keys.length - 1]] = v.value;
                }
            });

            const response = await fetch(`/api/workflows/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workflowDefinition, testData })
            });

            if (!response.ok) throw new Error('Test execution failed');

            const result = await response.json();
            setTestResult(result);
            onTestComplete?.(result);
        } catch (error) {
            setTestResult({
                success: false, nodes: [], totalDuration: 0,
                error: (error as Error).message
            });
        } finally {
            setIsRunningTest(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent
                side="right"
                className="
                    sm:max-w-[600px] w-full p-0 gap-0 !border-none !shadow-none outline-none
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    !bg-transparent focus:outline-none ring-0
                    [&>button]:hidden
                "
            >
                {/* Inner Container with blur */}
                <div className="flex flex-col h-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/20 dark:border-slate-800/50">

                    {/* Header Section - Sticky Top */}
                    <div className="shrink-0 pt-6 pb-2 px-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 z-20">
                        <SheetHeader className="p-0 mb-6 text-left">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <Settings2 size={24} />
                                </div>
                                <div>
                                    <SheetTitle className="text-xl font-bold text-slate-900 dark:text-white">Workflow Center</SheetTitle>
                                    <SheetDescription className="text-sm text-slate-500 font-medium mt-0.5">Gestión integral de automatización</SheetDescription>
                                </div>
                            </div>
                        </SheetHeader>

                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-slate-800 h-12 p-1 rounded-xl">
                                <TabsTrigger value="settings" className="rounded-lg h-10 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm text-sm font-semibold">Configuración</TabsTrigger>
                                <TabsTrigger value="history" className="rounded-lg h-10 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm text-sm font-semibold">Historial</TabsTrigger>
                                <TabsTrigger value="test" className="rounded-lg h-10 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm text-sm font-semibold">Pruebas</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden relative">

                        {/* SETTINGS TAB */}
                        {activeTab === 'settings' && (
                            <div className="h-full flex flex-col">
                                <ScrollArea className="flex-1">
                                    <div className="p-8 space-y-8 max-w-2xl mx-auto">
                                        <div className="space-y-4">
                                            <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nombre del Workflow</Label>
                                            <Input
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="h-12 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-lg px-4 rounded-xl focus-visible:ring-primary/20"
                                                placeholder="Escribe un nombre..."
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">Descripción</Label>
                                            <Textarea
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                rows={6}
                                                className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 resize-none text-base leading-relaxed p-4 rounded-xl focus-visible:ring-primary/20"
                                                placeholder="Describe el propósito de este flujo..."
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">Canal Predeterminado</Label>
                                            <div className="space-y-1.5">
                                                <ChannelSelector
                                                    value={channelId}
                                                    onChange={(val) => {
                                                        setChannelId(val);
                                                        onChannelChange?.(val);
                                                    }}
                                                />
                                                <p className="text-xs text-slate-500">
                                                    Define el canal usado para enviar mensajes si el trigger no especifica uno (ej. CRM).
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50 transition-colors">
                                            <div className="space-y-1">
                                                <Label className="text-base font-semibold block">Estado Activo</Label>
                                                <p className="text-sm text-slate-500">Activar o desactivar este workflow globalmente.</p>
                                            </div>
                                            <Switch checked={isActive} onCheckedChange={setIsActive} className="scale-110" />
                                        </div>
                                    </div>
                                </ScrollArea>
                                {/* Footer */}
                                <div className="sticky bottom-0 p-6 border-t border-slate-100 dark:border-slate-900 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md flex justify-between items-center z-20">
                                    <Button variant="ghost" onClick={onClose} className="text-slate-500 hover:text-slate-900">Cancelar</Button>
                                    <Button onClick={handleSaveSettings} disabled={isSavingSettings} className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 rounded-xl shadow-lg shadow-primary/20 font-medium">
                                        {isSavingSettings ? 'Guardando...' : <><Check className="mr-2 h-4 w-4" /> Guardar Cambios</>}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* HISTORY TAB */}
                        {activeTab === 'history' && (
                            <div className="h-full flex flex-col">
                                <ScrollArea className="flex-1">
                                    <div className="p-6">
                                        {isLoadingHistory ? (
                                            <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>
                                        ) : versions.length === 0 ? (
                                            <div className="text-center py-20 text-muted-foreground">
                                                <div className="bg-slate-100 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                                    <History className="h-10 w-10 text-slate-400" />
                                                </div>
                                                <h3 className="text-lg font-semibold mb-2">Sin historial</h3>
                                                <p>No hay versiones guardadas todavía.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {versions.map((version) => (
                                                    <div key={version.id} className="group relative border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 hover:border-primary/50 hover:shadow-md transition-all duration-300">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex items-center gap-3">
                                                                <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-md">v{version.version_number}</span>
                                                                <h4 className="font-semibold text-sm text-slate-900 dark:text-white">{version.name || `Versión Automática ${version.version_number}`}</h4>
                                                            </div>
                                                            <Button variant="ghost" size="sm" onClick={() => handleRestore(version)} disabled={!!restoringId} className="h-8 text-primary hover:bg-primary/10 hover:text-primary font-medium text-xs">
                                                                <RotateCcw size={14} className="mr-1.5" /> Restaurar
                                                            </Button>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 px-1">
                                                            <div className="flex items-center gap-1.5"><Calendar size={12} className="text-slate-400" /> <span>{new Date(version.created_at).toLocaleString()}</span></div>
                                                            <div className="flex items-center gap-1.5"><User size={12} className="text-slate-400" /> <span>Usuario del Sistema</span></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                                <div className="sticky bottom-0 p-6 border-t border-slate-100 dark:border-slate-900 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md flex justify-end z-20">
                                    <Button variant="outline" onClick={onClose}>Cerrar</Button>
                                </div>
                            </div>
                        )}

                        {/* TEST TAB */}
                        {activeTab === 'test' && (
                            <div className="h-full flex flex-col">
                                <ScrollArea className="flex-1">
                                    <div className="p-6 max-w-4xl mx-auto space-y-8">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Variables de Entrada</h3>
                                                </div>
                                                <Button variant="ghost" size="sm" onClick={handleAddVariable} className="h-8 text-primary hover:bg-primary/5"><Plus size={14} className="mr-1.5" /> Nueva Variable</Button>
                                            </div>
                                            <div className="space-y-3">
                                                {testVariables.map((variable, index) => (
                                                    <div key={index} className="flex gap-3 items-center group">
                                                        <div className="grid grid-cols-2 gap-3 flex-1">
                                                            <div className="relative">
                                                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400"><Tag size={14} /></div>
                                                                <Input placeholder="variable.key" value={variable.key}
                                                                    onChange={(e) => {
                                                                        const newVars = [...testVariables];
                                                                        newVars[index].key = e.target.value;
                                                                        setTestVariables(newVars);
                                                                    }}
                                                                    className="pl-9 h-10 bg-slate-50 dark:bg-slate-900/50 rounded-lg"
                                                                />
                                                            </div>
                                                            <Input placeholder="Valor" value={variable.value}
                                                                onChange={(e) => {
                                                                    const newVars = [...testVariables];
                                                                    newVars[index].value = e.target.value;
                                                                    setTestVariables(newVars);
                                                                }}
                                                                className="h-10 bg-slate-50 dark:bg-slate-900/50 font-mono text-xs rounded-lg"
                                                            />
                                                        </div>
                                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveVariable(index)} className="h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><X size={16} /></Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {testResult && (
                                            <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Resultados</h3>
                                                    <Badge variant={testResult.success ? 'default' : 'destructive'} className={`h-7 px-3 text-xs font-medium rounded-lg ${testResult.success ? 'bg-emerald-500' : ''}`}>
                                                        {testResult.success ? '✓ Exitoso' : '✕ Fallido'}
                                                    </Badge>
                                                </div>

                                                {testResult.error && (
                                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs rounded-lg border border-red-100 dark:border-red-800/50 flex items-start gap-2">
                                                        <X size={14} className="shrink-0 mt-0.5" />
                                                        <div className="font-mono">{testResult.error}</div>
                                                    </div>
                                                )}

                                                <div className="space-y-2">
                                                    {testResult.nodes.map((node, i) => (
                                                        <div key={i} className={`p-3 rounded-xl border transition-all ${node.status === 'success' ? 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800' : 'bg-white border-red-200 dark:bg-slate-900 dark:border-red-900/50'}`}>
                                                            <div className="flex justify-between items-center mb-1.5">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`h-1.5 w-1.5 rounded-full ${node.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                                    <span className="font-semibold text-xs">{node.nodeLabel}</span>
                                                                </div>
                                                                <span className="font-mono text-[10px] text-slate-400">{node.duration}ms</span>
                                                            </div>
                                                            {node.logs.length > 0 && (
                                                                <div className="text-[10px] font-mono bg-slate-50 dark:bg-slate-950 p-2 rounded-lg text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800/50">
                                                                    {node.logs[0]}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                                {/* Footer */}
                                <div className="sticky bottom-0 p-6 border-t border-slate-100 dark:border-slate-900 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md flex justify-between items-center z-20">
                                    <Button variant="ghost" onClick={() => setTestResult(null)} disabled={!testResult} className="text-slate-500 h-11">Limpiar</Button>
                                    <Button onClick={handleRunTest} disabled={isRunningTest} className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-6 rounded-xl shadow-lg shadow-primary/20 font-medium">
                                        {isRunningTest ? <><Pause size={16} className="mr-2 animate-pulse" /> Ejecutando...</> : <><PlayCircle size={16} className="mr-2" /> Iniciar</>}
                                    </Button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

