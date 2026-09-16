"use client"

import React, { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Brain,
    Cpu,
    TrendingUp,
    Key,
    Shield,
    Sliders,
    Search,
    Edit3,
    Loader2,
    Building2,
    Zap,
    Bot,
    CheckCircle2,
    AlertCircle,
    Activity,
    Layers
} from "lucide-react"
import { toast } from "sonner"
import {
    MasterKeyItem,
    TenantAIGovernance,
    updateTenantAIGovernance
} from "@/modules/core/admin/actions"
import { MasterAIEngineSheet } from "./master-ai-engine-sheet"

interface AIGovernanceManagerProps {
    intelligenceData: {
        engineStats: Record<string, number>
        topTenants: Array<{ id: string; name: string; quantity: number }>
        totalTokens: number
    }
    masterCredentials: MasterKeyItem[]
    tenantsGovernance: TenantAIGovernance[]
}

export function AIGovernanceManager({
    intelligenceData,
    masterCredentials: initialMasterCredentials,
    tenantsGovernance: initialTenantsGovernance
}: AIGovernanceManagerProps) {
    const [isPending, startTransition] = useTransition()

    // Master Key Vault Sheet State
    const [isMasterSheetOpen, setIsMasterSheetOpen] = useState(false)
    const [masterKeys, setMasterKeys] = useState<MasterKeyItem[]>(initialMasterCredentials)

    // Tenants Governance State
    const [tenants, setTenants] = useState<TenantAIGovernance[]>(initialTenantsGovernance)
    const [searchQuery, setSearchQuery] = useState("")
    const [modeFilter, setModeFilter] = useState<string>("all")
    const [selectedTenantForLimit, setSelectedTenantForLimit] = useState<TenantAIGovernance | null>(null)
    const [limitInput, setLimitInput] = useState<string>("")
    const [isLimitDialogOpen, setIsLimitDialogOpen] = useState(false)

    // Telemetry Computations
    const maxTenantUsage = intelligenceData.topTenants[0]?.quantity || 1
    const maxEngineUsage = Math.max(...Object.values(intelligenceData.engineStats), 1)
    const estimatedCost = ((intelligenceData.totalTokens / 1_000_000) * 0.20).toFixed(4)
    const activeMasterKeysCount = masterKeys.filter(k => k.status === "active").length

    // Tenant Governance Actions
    const handleModeChange = (orgId: string, newMode: 'saas' | 'byok' | 'disabled') => {
        startTransition(async () => {
            try {
                await updateTenantAIGovernance(orgId, { ai_mode: newMode })
                setTenants(prev =>
                    prev.map(t => (t.id === orgId ? { ...t, aiMode: newMode } : t))
                )
                toast.success("Modo de IA actualizado correctamente.")
            } catch (err: any) {
                toast.error(err.message || "Error al actualizar el modo de IA.")
            }
        })
    }

    const handleStatusToggle = (orgId: string, currentStatus: 'active' | 'suspended') => {
        const nextStatus = currentStatus === 'active' ? 'suspended' : 'active'
        startTransition(async () => {
            try {
                await updateTenantAIGovernance(orgId, { ai_status: nextStatus })
                setTenants(prev =>
                    prev.map(t => (t.id === orgId ? { ...t, aiStatus: nextStatus } : t))
                )
                toast.success(
                    nextStatus === 'suspended'
                        ? "IA suspendida para esta organización."
                        : "IA activada para esta organización."
                )
            } catch (err: any) {
                toast.error(err.message || "Error al cambiar el estado de IA.")
            }
        })
    }

    const handleOpenLimitDialog = (tenant: TenantAIGovernance) => {
        setSelectedTenantForLimit(tenant)
        setLimitInput(tenant.monthlyLimit.toString())
        setIsLimitDialogOpen(true)
    }

    const handleSaveLimit = () => {
        if (!selectedTenantForLimit) return
        const val = parseInt(limitInput, 10)
        if (isNaN(val) || val < -1) {
            toast.error("Ingresa un límite numérico válido (-1 para ilimitado).")
            return
        }

        startTransition(async () => {
            try {
                await updateTenantAIGovernance(selectedTenantForLimit.id, { monthly_limit: val })
                setTenants(prev =>
                    prev.map(t => (t.id === selectedTenantForLimit.id ? { ...t, monthlyLimit: val } : t))
                )
                toast.success("Cuota mensual de tokens actualizada correctamente.")
                setIsLimitDialogOpen(false)
            } catch (err: any) {
                toast.error(err.message || "Error al actualizar cuota mensual.")
            }
        })
    }

    // Filtered Tenants
    const filteredTenants = tenants.filter(t => {
        const matchesQuery =
            t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.slug.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesMode = modeFilter === "all" || t.aiMode === modeFilter
        return matchesQuery && matchesMode
    })

    // Governance summary stats
    const saasCount = tenants.filter(t => t.aiMode === "saas").length
    const byokCount = tenants.filter(t => t.aiMode === "byok").length
    const disabledCount = tenants.filter(t => t.aiMode === "disabled" || t.aiStatus === "suspended").length

    return (
        <div className="space-y-6">
            {/* Top Bar: Header & Invoke Master Sheet Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-background dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-transparent border shadow-sm">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20">
                            <Brain className="h-5 w-5" />
                        </div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground">
                            Centro de Inteligencia & Gobernanza AI
                        </h2>
                    </div>
                    <p className="text-xs text-muted-foreground pl-10">
                        Telemetría de inferencia, control de límites por organización y bóveda maestra de proveedores con rotación multi-key.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => setIsMasterSheetOpen(true)}
                        className="gap-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 transition-all text-xs font-semibold h-10 px-4 rounded-xl"
                    >
                        <Bot className="h-4 w-4" />
                        <span>Bóveda Maestra de Claves</span>
                        <Badge className="bg-white/20 hover:bg-white/20 text-white border-0 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                            {activeMasterKeysCount} Activa{activeMasterKeysCount === 1 ? "" : "s"}
                        </Badge>
                    </Button>
                </div>
            </div>

            {/* Sub-multitab: Telemetría vs Matriz de Gobernanza */}
            <Tabs defaultValue="insights" className="space-y-6">
                <TabsList className="bg-muted/60 p-1 rounded-xl h-11">
                    <TabsTrigger value="insights" className="gap-2 text-xs font-semibold px-4 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        Telemetría & Insights
                    </TabsTrigger>
                    <TabsTrigger value="governance" className="gap-2 text-xs font-semibold px-4 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm">
                        <Shield className="h-4 w-4 text-indigo-500" />
                        Matriz de Gobernanza & Cuotas
                        <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1.5 h-4">
                            {tenants.length}
                        </Badge>
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: TELEMETRÍA & INSIGHTS */}
                <TabsContent value="insights" className="space-y-6 focus-visible:outline-none">
                    {/* Top KPI Cards */}
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card className="bg-gradient-to-br from-indigo-50/60 to-white dark:from-indigo-950/20 dark:to-transparent border-indigo-100 dark:border-indigo-900/30">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground">Tokens Inferencia (7d)</CardTitle>
                                <Cpu className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold tracking-tight">{intelligenceData.totalTokens.toLocaleString()}</div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">Consumo total agregado de IA</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-purple-50/60 to-white dark:from-purple-950/20 dark:to-transparent border-purple-100 dark:border-purple-900/30">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground">Motores SaaS Activos</CardTitle>
                                <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold tracking-tight">{Object.keys(intelligenceData.engineStats).length}</div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">Sistemas consumiendo inferencia</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-emerald-50/60 to-white dark:from-emerald-950/20 dark:to-transparent border-emerald-100 dark:border-emerald-900/30">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground">Costo Estimado Plataforma</CardTitle>
                                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold tracking-tight">${estimatedCost}</div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">Basado en promedio $0.20/1M tok</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-blue-50/60 to-white dark:from-blue-950/20 dark:to-transparent border-blue-100 dark:border-blue-900/30">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground">Claves en Bóveda Maestra</CardTitle>
                                <Key className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold tracking-tight">
                                    {activeMasterKeysCount} / {masterKeys.length}
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">Slots de API keys configurados</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Visual Charts */}
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-amber-500" />
                                    Consumo por Motor SaaS
                                </CardTitle>
                                <CardDescription className="text-xs">Distribución de carga de inferencia por subsistema.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {Object.entries(intelligenceData.engineStats).map(([engine, quantity]) => (
                                        <div key={engine} className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-medium capitalize">{engine} Engine</span>
                                                <span className="text-muted-foreground font-mono">{quantity.toLocaleString()} tok</span>
                                            </div>
                                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-indigo-600 transition-all duration-500 rounded-full"
                                                    style={{ width: `${(quantity / maxEngineUsage) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {Object.keys(intelligenceData.engineStats).length === 0 && (
                                        <p className="text-center text-muted-foreground py-8 text-xs">Sin datos de uso recientes en los últimos 7 días.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-purple-500" />
                                    Top Organizaciones (Consumo IA)
                                </CardTitle>
                                <CardDescription className="text-xs">Tenants con mayor volumen de llamadas y tokens generados.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {intelligenceData.topTenants.map(tenant => (
                                        <div key={tenant.id} className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-medium">{tenant.name}</span>
                                                <span className="text-muted-foreground font-mono">{tenant.quantity.toLocaleString()} tok</span>
                                            </div>
                                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-purple-600 transition-all duration-500 rounded-full"
                                                    style={{ width: `${(tenant.quantity / maxTenantUsage) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {intelligenceData.topTenants.length === 0 && (
                                        <p className="text-center text-muted-foreground py-8 text-xs">Sin actividad de organizaciones en el periodo seleccionado.</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Operational Recommendations Card */}
                    <Card className="bg-muted/30 border-dashed">
                        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shrink-0">
                                    <Layers className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold text-foreground">Optimización Continua del Motor de IA</h4>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Las consultas ligeras de Inbox usan el tier <span className="font-mono text-foreground font-semibold">cheap</span> (Haiku / GPT-4o-mini), mientras que el análisis de contratos y RAG avanzado usan el tier <span className="font-mono text-foreground font-semibold">premium</span> (Sonnet / GPT-4o).
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsMasterSheetOpen(true)}
                                className="text-xs shrink-0"
                            >
                                Gestionar Bóveda
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 2: MATRIZ DE GOBERNANZA & CUOTAS */}
                <TabsContent value="governance" className="space-y-6 focus-visible:outline-none">
                    {/* Fast Summary Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-xl border bg-card text-center">
                            <div className="text-xs text-muted-foreground">Total Organizaciones</div>
                            <div className="text-xl font-bold mt-0.5">{tenants.length}</div>
                        </div>
                        <div className="p-3 rounded-xl border bg-card text-center">
                            <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">SaaS Gestionado</div>
                            <div className="text-xl font-bold mt-0.5">{saasCount}</div>
                        </div>
                        <div className="p-3 rounded-xl border bg-card text-center">
                            <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">Claves Propias</div>
                            <div className="text-xl font-bold mt-0.5">{byokCount}</div>
                        </div>
                        <div className="p-3 rounded-xl border bg-card text-center">
                            <div className="text-xs text-red-600 dark:text-red-400 font-medium">Desactivadas / Pausa</div>
                            <div className="text-xl font-bold mt-0.5">{disabledCount}</div>
                        </div>
                    </div>

                    {/* Toolbar: Search & Filters */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar organización por nombre o slug..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-9 text-xs h-9"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground shrink-0 hidden sm:inline">Modo:</Label>
                            <Select value={modeFilter} onValueChange={setModeFilter}>
                                <SelectTrigger className="text-xs h-9 min-w-[160px]">
                                    <SelectValue placeholder="Filtrar modo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los Modos</SelectItem>
                                    <SelectItem value="saas">SaaS Gestionado</SelectItem>
                                    <SelectItem value="byok">Claves Propias</SelectItem>
                                    <SelectItem value="disabled">Desactivado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Matrix Table */}
                    <div className="border rounded-2xl overflow-hidden bg-card shadow-sm">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead className="font-semibold text-xs">Organización</TableHead>
                                    <TableHead className="font-semibold text-xs">Modo de IA</TableHead>
                                    <TableHead className="font-semibold text-xs">Límite Mensual</TableHead>
                                    <TableHead className="font-semibold text-xs">Consumo Mes Actual</TableHead>
                                    <TableHead className="font-semibold text-xs">Claves Propias</TableHead>
                                    <TableHead className="font-semibold text-xs text-center">Kill Switch</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTenants.map(tenant => {
                                    const isSuspended = tenant.aiStatus === "suspended" || tenant.aiMode === "disabled"
                                    const usagePercentage =
                                        tenant.monthlyLimit > 0
                                            ? Math.min(100, Math.round((tenant.currentUsage / tenant.monthlyLimit) * 100))
                                            : 0

                                    return (
                                        <TableRow key={tenant.id} className={isSuspended ? "bg-muted/20 opacity-75" : ""}>
                                            <TableCell>
                                                <div className="font-medium text-sm text-foreground">{tenant.name}</div>
                                                <div className="text-xs text-muted-foreground font-mono">{tenant.slug}</div>
                                            </TableCell>

                                            <TableCell>
                                                <Select
                                                    value={tenant.aiMode}
                                                    onValueChange={(val: any) => handleModeChange(tenant.id, val)}
                                                    disabled={isPending}
                                                >
                                                    <SelectTrigger className="text-xs h-8 w-[160px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="saas">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="h-2 w-2 rounded-full bg-indigo-500" />
                                                                <span>SaaS Gestionado</span>
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="byok">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="h-2 w-2 rounded-full bg-amber-500" />
                                                                <span>Claves Propias</span>
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="disabled">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="h-2 w-2 rounded-full bg-red-500" />
                                                                <span>Desactivado</span>
                                                            </div>
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>

                                            <TableCell>
                                                {tenant.aiMode === "byok" ? (
                                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px] font-semibold">
                                                        Ilimitado (Claves Propias)
                                                    </Badge>
                                                ) : tenant.aiMode === "disabled" || isSuspended ? (
                                                    <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 text-[11px] font-semibold">
                                                        Bloqueado
                                                    </Badge>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs font-medium">
                                                            {tenant.monthlyLimit === -1
                                                                ? "Ilimitado"
                                                                : `${tenant.monthlyLimit.toLocaleString()} tok`}
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                            onClick={() => handleOpenLimitDialog(tenant)}
                                                            disabled={isPending}
                                                            title="Editar cuota mensual de SaaS"
                                                        >
                                                            <Edit3 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>

                                            <TableCell>
                                                {tenant.aiMode === "byok" ? (
                                                    <div className="space-y-0.5">
                                                        <div className="text-xs font-mono font-medium text-foreground">
                                                            {tenant.currentUsage.toLocaleString()} tok
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground">
                                                            Directo al proveedor
                                                        </div>
                                                    </div>
                                                ) : tenant.aiMode === "disabled" || isSuspended ? (
                                                    <span className="text-xs text-muted-foreground font-mono">
                                                        {tenant.currentUsage.toLocaleString()} tok
                                                    </span>
                                                ) : (
                                                    <div className="w-[150px] space-y-1">
                                                        <div className="flex justify-between text-[11px] font-mono">
                                                            <span>{tenant.currentUsage.toLocaleString()} tok</span>
                                                            {tenant.monthlyLimit > 0 && (
                                                                <span className="text-muted-foreground">{usagePercentage}%</span>
                                                            )}
                                                        </div>
                                                        {tenant.monthlyLimit > 0 ? (
                                                            <Progress
                                                                value={usagePercentage}
                                                                className={`h-1.5 ${
                                                                    usagePercentage >= 90
                                                                        ? "[&>div]:bg-red-500"
                                                                        : usagePercentage >= 75
                                                                        ? "[&>div]:bg-amber-500"
                                                                        : "[&>div]:bg-indigo-600"
                                                                }`}
                                                            />
                                                        ) : (
                                                            <div className="h-1.5 bg-muted rounded-full" />
                                                        )}
                                                    </div>
                                                )}
                                            </TableCell>

                                            <TableCell>
                                                {tenant.byokKeysCount > 0 ? (
                                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-semibold">
                                                        {tenant.byokKeysCount} activa{tenant.byokKeysCount > 1 ? "s" : ""}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">Ninguna</span>
                                                )}
                                            </TableCell>

                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Switch
                                                        checked={tenant.aiStatus === "active" && tenant.aiMode !== "disabled"}
                                                        disabled={tenant.aiMode === "disabled" || isPending}
                                                        onCheckedChange={() => handleStatusToggle(tenant.id, tenant.aiStatus)}
                                                    />
                                                    <span
                                                        className={`text-[11px] font-semibold ${
                                                            tenant.aiStatus === "active" && tenant.aiMode !== "disabled"
                                                                ? "text-emerald-600"
                                                                : "text-red-500"
                                                        }`}
                                                    >
                                                        {tenant.aiStatus === "active" && tenant.aiMode !== "disabled"
                                                            ? "Activo"
                                                            : "Bloqueado"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                                {filteredTenants.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-xs">
                                            No se encontraron organizaciones que coincidan con la búsqueda o filtro.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>

            {/* MASTER AI COMMAND CENTER SHEET */}
            <MasterAIEngineSheet
                open={isMasterSheetOpen}
                onOpenChange={setIsMasterSheetOpen}
                masterKeys={masterKeys}
                onKeysChange={setMasterKeys}
            />

            {/* MODAL: EDITAR CUOTA MENSUAL */}
            <Dialog open={isLimitDialogOpen} onOpenChange={setIsLimitDialogOpen}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle className="text-base flex items-center gap-2">
                            <Sliders className="h-5 w-5 text-indigo-600" />
                            Editar Cuota Mensual de Tokens
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Ajusta el límite mensual de tokens de IA para {selectedTenantForLimit?.name}. Usa <span className="font-mono font-bold">-1</span> para cuota ilimitada.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-3">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold">Tokens por Mes</Label>
                            <Input
                                type="number"
                                placeholder="100000"
                                value={limitInput}
                                onChange={e => setLimitInput(e.target.value)}
                                className="font-mono text-sm"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Valores estándar: 50,000 (Starter), 200,000 (Pro), 1,000,000 (Enterprise), -1 (Ilimitado).
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setIsLimitDialogOpen(false)} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button size="sm" onClick={handleSaveLimit} disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            {isPending && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                            Actualizar Límite
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
