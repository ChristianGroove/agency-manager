'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Plus,
    Search,
    LayoutGrid,
    List,
    Zap,
    Activity,
    CheckCircle2,
    Clock,
    TrendingUp,
    ArrowRight,
    Sparkles,
    BarChart3,
    PlayCircle,
    AlertCircle,
    Timer
} from 'lucide-react';
import { WorkflowCard } from './workflow-card';
import { WorkflowListItem } from './workflow-list-item';
import { TemplatesSheet } from './templates-sheet';

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

type ViewMode = 'cards' | 'list';

export function AutomationsView({
    workflows,
    stats,
    recentExecutions = []
}: AutomationsViewProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('cards');
    const [searchQuery, setSearchQuery] = useState('');
    const [templatesOpen, setTemplatesOpen] = useState(false);

    // Filter workflows
    const filteredWorkflows = useMemo(() => {
        if (!searchQuery) return workflows;
        const query = searchQuery.toLowerCase();
        return workflows.filter(w =>
            w.name.toLowerCase().includes(query) ||
            w.description?.toLowerCase().includes(query)
        );
    }, [workflows, searchQuery]);

    // Convert workflows to card format
    const workflowItems = useMemo(() => {
        return filteredWorkflows.map(w => ({
            id: w.id,
            name: w.name,
            description: w.description || 'Sin descripción',
            type: 'workflow' as const,
            category: 'other' as const,
            status: w.is_active ? 'active' as const : 'draft' as const,
            nodeCount: w.definition?.nodes?.length || 0,
            tags: [],
            updatedAt: w.updated_at,
        }));
    }, [filteredWorkflows]);

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
        <div className="space-y-8 bg-gray-50/50 dark:bg-slate-950 min-h-screen">
            {/* Templates Sheet */}
            <TemplatesSheet open={templatesOpen} onOpenChange={setTemplatesOpen} />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        Automatizaciones
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Gestiona y monitorea tus workflows de automatización
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        className="h-9 px-4 border-gray-200 text-gray-600 hover:bg-gray-50"
                        onClick={() => setTemplatesOpen(true)}
                    >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Templates
                    </Button>
                    <Link href="/crm/automations/new">
                        <Button className="shadow-lg shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700 text-white">
                            <Plus className="h-4 w-4 mr-2" />
                            Nuevo Workflow
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-100 dark:border-blue-900">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Ejecuciones Hoy</p>
                                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">{displayStats.todayExecutions}</p>
                            </div>
                            <div className="p-3 bg-blue-500/10 rounded-xl">
                                <Activity className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-100 dark:border-emerald-900">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Tasa de Éxito</p>
                                <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100 mt-1">{displayStats.successRate}%</p>
                            </div>
                            <div className="p-3 bg-emerald-500/10 rounded-xl">
                                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-100 dark:border-amber-900">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Tiempo Promedio</p>
                                <p className="text-3xl font-bold text-amber-900 dark:text-amber-100 mt-1">{displayStats.avgExecutionTime}s</p>
                            </div>
                            <div className="p-3 bg-amber-500/10 rounded-xl">
                                <Timer className="h-6 w-6 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border-purple-100 dark:border-purple-900">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">Workflows Activos</p>
                                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-1">{displayStats.activeWorkflows}</p>
                            </div>
                            <div className="p-3 bg-purple-500/10 rounded-xl">
                                <Zap className="h-6 w-6 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Activity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <Card className="border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-slate-500" />
                            Acciones Rápidas
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3">
                        <Link href="/crm/automations/analytics">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                                <BarChart3 className="h-5 w-5 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
                                <p className="font-medium text-sm">Analytics</p>
                                <p className="text-xs text-slate-500">Ver métricas detalladas</p>
                            </div>
                        </Link>
                        <div
                            className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                            onClick={() => setTemplatesOpen(true)}
                        >
                            <Sparkles className="h-5 w-5 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                            <p className="font-medium text-sm">Templates</p>
                            <p className="text-xs text-slate-500">Explorar plantillas</p>
                        </div>
                        <Link href="/crm/automations/new">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                                <Plus className="h-5 w-5 text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
                                <p className="font-medium text-sm">Crear Nuevo</p>
                                <p className="text-xs text-slate-500">Workflow desde cero</p>
                            </div>
                        </Link>
                        <Link href="/automations/analytics">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                                <TrendingUp className="h-5 w-5 text-green-500 mb-2 group-hover:scale-110 transition-transform" />
                                <p className="font-medium text-sm">Historial</p>
                                <p className="text-xs text-slate-500">Ver ejecuciones</p>
                            </div>
                        </Link>
                    </CardContent>
                </Card>

                {/* Recent Executions */}
                <Card className="border-slate-200 dark:border-slate-800">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <PlayCircle className="h-4 w-4 text-slate-500" />
                            Ejecuciones Recientes
                        </CardTitle>
                        <Link href="/crm/automations/analytics">
                            <Button variant="ghost" size="sm" className="text-xs">
                                Ver todas <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {recentExecutions.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No hay ejecuciones recientes</p>
                            </div>
                        ) : (
                            recentExecutions.slice(0, 5).map((exec) => (
                                <div key={exec.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                    <div className={`p-1.5 rounded-full ${exec.status === 'success' ? 'bg-green-100 text-green-600' :
                                        exec.status === 'failed' ? 'bg-red-100 text-red-600' :
                                            'bg-blue-100 text-blue-600'
                                        }`}>
                                        {exec.status === 'success' ? <CheckCircle2 className="h-4 w-4" /> :
                                            exec.status === 'failed' ? <AlertCircle className="h-4 w-4" /> :
                                                <Clock className="h-4 w-4 animate-pulse" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{exec.workflow?.name || 'Workflow'}</p>
                                        <p className="text-xs text-slate-500">
                                            {new Date(exec.started_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <Badge variant="secondary" className={`text-xs ${exec.status === 'success' ? 'bg-green-100 text-green-700' :
                                        exec.status === 'failed' ? 'bg-red-100 text-red-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                        {exec.status === 'success' ? 'Éxito' :
                                            exec.status === 'failed' ? 'Error' : 'Corriendo'}
                                    </Badge>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Workflows Section */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                        Mis Workflows
                        <span className="ml-2 text-sm font-normal text-slate-500">({workflowItems.length})</span>
                    </h2>

                    <div className="flex items-center gap-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Buscar..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 w-48 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-full"
                            />
                        </div>

                        {/* View Toggle */}
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-full p-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`rounded-full h-8 w-8 ${viewMode === 'cards' ? 'bg-white dark:bg-slate-900 shadow-sm' : ''}`}
                                onClick={() => setViewMode('cards')}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`rounded-full h-8 w-8 ${viewMode === 'list' ? 'bg-white dark:bg-slate-900 shadow-sm' : ''}`}
                                onClick={() => setViewMode('list')}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Workflows Grid/List */}
                {workflowItems.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <Zap className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">
                            {searchQuery ? 'No se encontraron workflows' : 'Aún no tienes workflows'}
                        </h3>
                        <p className="text-slate-500 mt-1 mb-6">
                            {searchQuery ? 'Intenta con otra búsqueda' : 'Crea tu primer workflow o usa un template'}
                        </p>
                        <div className="flex justify-center gap-3">
                            <Button variant="outline" onClick={() => setTemplatesOpen(true)} className="rounded-full">
                                <Sparkles className="h-4 w-4 mr-2" />
                                Ver Templates
                            </Button>
                            <Link href={`/automations/${crypto.randomUUID()}`}>
                                <Button className="rounded-full">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Crear Workflow
                                </Button>
                            </Link>
                        </div>
                    </div>
                ) : viewMode === 'cards' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {workflowItems.map(item => (
                            <WorkflowCard
                                key={item.id}
                                id={item.id}
                                name={item.name}
                                description={item.description}
                                type={item.type}
                                category={item.category}
                                status={item.status}
                                nodeCount={item.nodeCount}
                                tags={item.tags}
                                updatedAt={item.updatedAt}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {workflowItems.map(item => (
                            <WorkflowListItem
                                key={item.id}
                                id={item.id}
                                name={item.name}
                                description={item.description}
                                type={item.type}
                                category={item.category}
                                status={item.status}
                                nodeCount={item.nodeCount}
                                tags={item.tags}
                                updatedAt={item.updatedAt}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
