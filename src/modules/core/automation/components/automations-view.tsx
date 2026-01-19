'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Switch } from '@/components/ui/switch';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    Plus,
    Search,
    Zap,
    Activity,
    CheckCircle2,
    Clock,
    LayoutGrid,
    List,
    History,
    Sparkles,
    AlertTriangle,
    MessageCircle,
    Globe,
    Edit,
    MoreVertical
} from 'lucide-react';
import { TemplatesSheet } from './templates-sheet';
import { ActivitySheet } from './activity-sheet';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { SplitText } from "@/components/ui/split-text"
import { toggleWorkflow, updateWorkflowChannel } from '@/modules/core/automation/actions';
import { toast } from 'sonner';
import { WorkflowCard } from './workflow-card';

interface Workflow {
    id: string;
    name: string;
    description?: string;
    is_active?: boolean;
    definition?: {
        nodes?: any[];
        edges?: any[];
    };
    trigger_config?: any;
    created_at?: string;
    updated_at?: string;
}

interface WorkflowStats {
    totalExecutions: number;
    successRate: number;
    avgExecutionTime: number;
    todayExecutions: number;
    failedToday: number;
    activeWorkflows: number;
}

interface Execution {
    id: string;
    workflow_id: string;
    status: 'success' | 'failed' | 'running';
    started_at: string;
    completed_at?: string;
    workflow?: { name: string };
}

interface AutomationsViewProps {
    workflows: Workflow[];
    stats?: WorkflowStats;
    recentExecutions?: Execution[];
}

export function AutomationsView({
    workflows,
    stats,
    recentExecutions = []
}: AutomationsViewProps) {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [templatesOpen, setTemplatesOpen] = useState(false);
    const [activityOpen, setActivityOpen] = useState(false);

    // Filter workflows
    const filteredWorkflows = useMemo(() => {
        if (!searchQuery) return workflows;
        const query = searchQuery.toLowerCase();
        return workflows.filter(w =>
            w.name.toLowerCase().includes(query) ||
            w.description?.toLowerCase().includes(query)
        );
    }, [workflows, searchQuery]);

    // Default stats if not provided
    const displayStats = stats || {
        totalExecutions: 0,
        successRate: 0,
        avgExecutionTime: 0,
        todayExecutions: 0,
        failedToday: 0,
        activeWorkflows: workflows.filter(w => w.is_active).length,
    };

    // --- Conflict Detection Logic ---
    const conflictedWorkflowIds = useMemo(() => {
        const activeWorkflows = workflows.filter(w => w.is_active);
        const channelMap = new Map<string, string[]>(); // ChannelId -> WorkflowIds[]
        const conflicts = new Set<string>();

        activeWorkflows.forEach(w => {
            let channelId = w.trigger_config?.channel;
            // Fallback
            if (!channelId && w.definition?.nodes) {
                const trigger = w.definition.nodes.find((n: any) => n.type === 'trigger');
                channelId = trigger?.data?.channel;
            }

            if (channelId && channelId !== 'all') {
                const current = channelMap.get(channelId) || [];
                channelMap.set(channelId, [...current, w.id]);
            }
        });

        // Identify conflicts
        channelMap.forEach((ids) => {
            if (ids.length > 1) {
                ids.forEach(id => conflicts.add(id));
            }
        });

        return conflicts;
    }, [workflows]);

    // Handlers
    const handleToggle = async (id: string, isActive: boolean) => {
        const result = await toggleWorkflow(id, isActive);
        if (!result.success) throw new Error(result.error);
    };

    const handleChannelChange = async (id: string, channelId: string | null) => {
        const result = await updateWorkflowChannel(id, channelId);
        if (result.success) {
            toast.success("Canal actualizado");
        } else {
            toast.error("Error al actualizar canal");
        }
    };

    return (
        <div className="space-y-4 h-[calc(100vh-2rem)] flex flex-col bg-slate-50/50 dark:bg-transparent">
            <TemplatesSheet open={templatesOpen} onOpenChange={setTemplatesOpen} />
            <ActivitySheet open={activityOpen} onOpenChange={setActivityOpen} executions={recentExecutions} />

            <div className="flex-none space-y-6">
                {/* Unified Header */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                            <SplitText>Automatizaciones</SplitText>
                        </h2>
                        <p className="text-muted-foreground mt-1">Flujos de trabajo automatizados</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Buscar workflow..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 w-full sm:w-[250px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-purple-500/20"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setTemplatesOpen(true)}
                                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                            >
                                <Sparkles className="h-4 w-4 text-purple-500 mr-2" />
                                Plantillas
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setActivityOpen(true)}
                                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                title="Actividad reciente"
                            >
                                <History className="h-4 w-4 text-slate-500" />
                            </Button>
                            <Link href="/crm/automations/new">
                                <Button className="bg-pink-600 hover:bg-pink-700 text-white shadow-lg shadow-pink-500/20">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Crear
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Main Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto min-h-0 scrollbar-modern">
                    <div className="space-y-6 pb-20">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="p-3 flex flex-row items-center gap-4 hover:shadow-md transition-shadow dark:bg-slate-900 dark:border-slate-800">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex-none h-9 w-9 flex items-center justify-center">
                                    <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Ejecuciones</p>
                                        <Badge variant="outline" className="text-[10px] h-4 px-1 text-green-600 border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-900">
                                            +12%
                                        </Badge>
                                    </div>
                                    <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{displayStats.todayExecutions}</p>
                                </div>
                            </Card>

                            <Card className="p-3 flex flex-row items-center gap-4 hover:shadow-md transition-shadow dark:bg-slate-900 dark:border-slate-800">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex-none h-9 w-9 flex items-center justify-center">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Éxito</p>
                                        <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">Estable</span>
                                    </div>
                                    <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{displayStats.successRate}%</p>
                                </div>
                            </Card>

                            <Card className="p-3 flex flex-row items-center gap-4 hover:shadow-md transition-shadow dark:bg-slate-900 dark:border-slate-800">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-none h-9 w-9 flex items-center justify-center">
                                    <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Latencia</p>
                                        <span className="text-[10px] text-green-600 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded-full">-5ms</span>
                                    </div>
                                    <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{displayStats.avgExecutionTime}ms</p>
                                </div>
                            </Card>

                            <Card className="p-3 flex flex-row items-center gap-4 hover:shadow-md transition-shadow dark:bg-slate-900 dark:border-slate-800">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex-none h-9 w-9 flex items-center justify-center">
                                    <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Activos</p>
                                        <span className="text-[10px] text-slate-400">Saludable</span>
                                    </div>
                                    <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{displayStats.activeWorkflows}</p>
                                </div>
                            </Card>
                        </div>

                        {/* View Toggle & Count */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                Tus Workflows
                                <Badge variant="secondary" className="rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                    {filteredWorkflows.length}
                                </Badge>
                            </h2>
                            <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={cn(
                                        "p-2 rounded-md transition-all",
                                        viewMode === 'grid' ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={cn(
                                        "p-2 rounded-md transition-all",
                                        viewMode === 'list' ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    <List className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Workflow Grid/List */}
                        {filteredWorkflows.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                    <Zap className="h-8 w-8 text-slate-400" />
                                </div>
                                <h3 className="text-xl font-medium text-slate-900 dark:text-white">Comienza a Automatizar</h3>
                                <p className="text-slate-500 mt-2 text-center max-w-sm">
                                    Crea workflows para automatizar tareas repetitivas. Empieza desde cero o usa una plantilla.
                                </p>
                                <Button onClick={() => setTemplatesOpen(true)} className="mt-6 rounded-full" variant="secondary">
                                    Explorar Librería
                                </Button>
                            </div>
                        ) : (
                            viewMode === 'list' ? (
                                <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-md shadow-sm overflow-hidden">
                                    <Table className="w-full">
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
                                                <TableHead className="w-[300px]">Workflow</TableHead>
                                                <TableHead className="w-[150px]">Estado</TableHead>
                                                <TableHead className="w-[200px]">Canal</TableHead>
                                                <TableHead>Nodos</TableHead>
                                                <TableHead className="w-[150px]">Última Edición</TableHead>
                                                <TableHead className="text-right">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredWorkflows.map(workflow => {
                                                const channelId = workflow.trigger_config?.channel || workflow.definition?.nodes?.find((n: any) => n.type === 'trigger')?.data?.channel;
                                                return (
                                                    <TableRow key={workflow.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 border-slate-100 dark:border-white/10">
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-slate-900 dark:text-white">{workflow.name}</span>
                                                                <span className="text-xs text-slate-500 truncate max-w-[250px]">{workflow.description || "Sin descripción"}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Switch
                                                                checked={workflow.is_active}
                                                                onCheckedChange={(val) => handleToggle(workflow.id, val)}
                                                                className="scale-75 data-[state=checked]:bg-green-500"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                {channelId && channelId !== 'all' ? (
                                                                    <Badge variant="outline" className="bg-white dark:bg-white/10 font-normal">
                                                                        {channelId.includes('whatsapp') ? <MessageCircle className="h-3 w-3 mr-1 text-green-500" /> : <Globe className="h-3 w-3 mr-1 text-blue-500" />}
                                                                        {channelId}
                                                                    </Badge>
                                                                ) : (
                                                                    <span className="text-xs text-slate-400 italic">Sin canal</span>
                                                                )}
                                                                {conflictedWorkflowIds.has(workflow.id) && workflow.is_active && (
                                                                    <TooltipProvider>
                                                                        <Tooltip>
                                                                            <TooltipTrigger>
                                                                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>Conflicto de canal detectado</TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-slate-100 text-slate-500 border-0">
                                                                {workflow.definition?.nodes?.length || 0} nodos
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="text-xs text-slate-500">
                                                                {workflow.updated_at ? new Date(workflow.updated_at).toLocaleDateString() : '-'}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end items-center gap-2">
                                                                <Link href={`/crm/automations/${workflow.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                                        <Edit className="h-3.5 w-3.5 text-slate-500" />
                                                                    </Button>
                                                                </Link>
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                                            <MoreVertical className="h-3.5 w-3.5 text-slate-500" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuItem onClick={async () => {
                                                                            if (confirm('¿Estás seguro de eliminar este workflow?')) {
                                                                                const { deleteWorkflow } = await import('../actions');
                                                                                await deleteWorkflow(workflow.id);
                                                                            }
                                                                        }} className="text-red-600">
                                                                            Trasladar a Papelera
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className={cn(
                                    "grid gap-4",
                                    "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
                                )}>
                                    {filteredWorkflows.map(workflow => {
                                        let channelId = workflow.trigger_config?.channel;
                                        if (!channelId && workflow.definition?.nodes) {
                                            const trigger = workflow.definition.nodes.find((n: any) => n.type === 'trigger');
                                            channelId = trigger?.data?.channel;
                                        }

                                        return (
                                            <div key={workflow.id} className="h-full">
                                                <WorkflowCard
                                                    workflow={workflow}
                                                    onToggle={handleToggle}
                                                    onChannelChange={(val) => handleChannelChange(workflow.id, val)}
                                                    onDelete={async (id) => {
                                                        if (confirm('¿Estás seguro de eliminar este workflow?')) {
                                                            const { deleteWorkflow } = await import('../actions');
                                                            await deleteWorkflow(id);
                                                            // Optional: trigger refresh
                                                        }
                                                    }}
                                                    onEdit={(id) => {
                                                        window.location.href = `/crm/automations/${id}`;
                                                    }}
                                                    onDuplicate={async (id) => {
                                                        // Placeholder for duplicate, or implement if action exists
                                                        if (confirm('¿Duplicar este workflow?')) {
                                                            const { duplicateWorkflow } = await import('../actions');
                                                            if (duplicateWorkflow) await duplicateWorkflow(id);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}



