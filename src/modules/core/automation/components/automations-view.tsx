'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Plus,
    Search,
    Zap,
    Activity,
    CheckCircle2,
    Clock,
    AlertCircle,
    LayoutGrid,
    List,
    MoreHorizontal,
    Play,
    Pause,
    History,
    Sparkles,
    ArrowRight
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

interface Workflow {
    id: string;
    name: string;
    description?: string;
    is_active?: boolean;
    definition?: {
        nodes?: any[];
        edges?: any[];
    };
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

    return (
        <div className="flex flex-col h-full bg-transparent overflow-hidden">
            <TemplatesSheet open={templatesOpen} onOpenChange={setTemplatesOpen} />
            <ActivitySheet open={activityOpen} onOpenChange={setActivityOpen} executions={recentExecutions} />

            <div className="flex-1 flex flex-col min-w-0">
                <ScrollArea className="flex-1">
                    <div className="p-8 space-y-8">
                        {/* Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                                    <SplitText>Automatizaciones</SplitText>
                                </h2>
                                <p className="text-muted-foreground mt-1">Flujos de trabajo automatizados</p>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Search Field */}
                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <Input
                                        placeholder="Buscar workflow..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 w-64 bg-slate-100/50 dark:bg-white/5 border-transparent focus:bg-white dark:focus:bg-black/40 transition-all rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                </div>

                                <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />

                                <Button
                                    variant="outline"
                                    onClick={() => setTemplatesOpen(true)}
                                    className="hidden md:flex rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 shadow-sm"
                                >
                                    <Sparkles className="h-4 w-4 mr-2 text-indigo-500" />
                                    Plantillas
                                </Button>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setActivityOpen(true)}
                                    className="rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 shadow-sm"
                                    title="Actividad reciente"
                                >
                                    <History className="h-4 w-4 text-slate-500" />
                                </Button>

                                <Link href="/crm/automations/new">
                                    <Button className="rounded-xl shadow-lg bg-brand-pink hover:bg-brand-pink/90 transition-all hover:scale-105 active:scale-95">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Crear
                                    </Button>
                                </Link>
                            </div>
                        </div>

                        {/* Stats Pills */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <MetricCard
                                label="Ejecuciones Hoy"
                                value={`${displayStats.todayExecutions}`}
                                trend="+12%"
                                trendDirection="up"
                                icon={<Zap className="h-5 w-5 text-amber-500" />}
                            />
                            <MetricCard
                                label="Tasa de Éxito"
                                value={`${displayStats.successRate}%`}
                                trend="Estable"
                                trendDirection="neutral"
                                icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                            />
                            <MetricCard
                                label="Latencia Promedio"
                                value={`${displayStats.avgExecutionTime}ms`}
                                trend="-5ms"
                                trendDirection="down" // down is good for latency, but visually usually green
                                icon={<Clock className="h-5 w-5 text-blue-500" />}
                            />
                            <MetricCard
                                label="Módulos Activos"
                                value={`${displayStats.activeWorkflows}`}
                                trend="Sistema Saludable"
                                trendDirection="neutral"
                                icon={<Activity className="h-5 w-5 text-purple-500" />}
                            />
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

                        {/* Workflow Grid */}
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
                            <div className={cn(
                                "grid gap-6",
                                viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
                            )}>
                                {filteredWorkflows.map(workflow => (
                                    <Link key={workflow.id} href={`/crm/automations/${workflow.id}`} className="block group h-full">
                                        <Card className="h-full relative overflow-hidden transition-all duration-200 border-gray-100 dark:border-white/10 hover:border-gray-200 dark:hover:border-white/20 hover:shadow-md bg-white dark:bg-white/5 backdrop-blur-md group-hover:-translate-y-0.5">
                                            <div className="p-4 flex items-center gap-3">
                                                <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/10 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/20 transition-colors shrink-0">
                                                    <Zap className={cn(
                                                        "h-5 w-5 transition-colors",
                                                        workflow.is_active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"
                                                    )} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors">
                                                            {workflow.name}
                                                        </h3>
                                                        <Badge variant={workflow.is_active ? "default" : "secondary"} className={cn(
                                                            "rounded-full px-2 text-[10px] h-5 shrink-0",
                                                            workflow.is_active ? "bg-emerald-500 hover:bg-emerald-600" : ""
                                                        )}>
                                                            {workflow.is_active ? "Activo" : "Borrador"}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-slate-500 truncate mt-0.5">
                                                        {workflow.description || "Sin descripción"}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0" suppressHydrationWarning>
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(workflow.updated_at || "").toLocaleDateString()}
                                                </div>
                                                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                                            </div>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}

// Helper Components
function MetricCard({ label, value, trend, trendDirection, icon }: {
    label: string,
    value: string,
    trend: string,
    trendDirection: 'up' | 'down' | 'neutral',
    icon: React.ReactNode
}) {
    return (
        <Card className="p-5 border-none shadow-sm bg-white dark:bg-white/5 backdrop-blur-md hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div className="p-2 bg-slate-50 dark:bg-white/10 rounded-lg">
                    {icon}
                </div>
                <div className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-medium",
                    trendDirection === 'up' ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" :
                        trendDirection === 'down' ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" :
                            "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                )}>
                    {trend}
                </div>
            </div>
            <div className="mt-4">
                <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</p>
                <p className="text-xs text-slate-500 font-medium mt-1">{label}</p>
            </div>
        </Card>
    )
}
