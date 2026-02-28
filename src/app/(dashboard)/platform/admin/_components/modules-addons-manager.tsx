"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Package, CheckCircle2, TrendingUp, Users, Wrench, LayoutGrid } from "lucide-react"
import type { Module360Data } from "@/modules/core/admin/actions"

interface ModulesAddonsManagerProps {
    modulesData: Module360Data[]
}

export function ModulesAddonsManager({ modulesData }: ModulesAddonsManagerProps) {
    const [searchTerm, setSearchTerm] = useState("")

    const filteredModules = modulesData.filter(m => {
        const matchesName = m.module.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.module.key.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesSpaces = m.spaces.some(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()))
        const matchesTenants = m.tenants_override.some(t => t.name?.toLowerCase().includes(searchTerm.toLowerCase()) || t.slug.toLowerCase().includes(searchTerm.toLowerCase()))

        return matchesName || matchesSpaces || matchesTenants
    })

    const totalMRR = modulesData.reduce((acc, curr) => acc + curr.metrics.mrr, 0)
    const activeInstallations = modulesData.reduce((acc, curr) => acc + curr.metrics.active_tenants, 0)

    return (
        <div className="space-y-6">
            {/* Context Header & Search */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Catálogo 360</h2>
                    <p className="text-sm text-muted-foreground">Explora todos los módulos, dependencias de Spaces y asignaciones manuales.</p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar módulo, space o tenant..."
                        className="pl-9 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* General Metrics Note */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-indigo-900/60 dark:text-indigo-400/80">Total Módulos</p>
                            <p className="text-2xl font-bold text-indigo-950 dark:text-white">{modulesData.length}</p>
                        </div>
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <Package className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-emerald-900/60 dark:text-emerald-400/80">Instalaciones Activas</p>
                            <p className="text-2xl font-bold text-emerald-950 dark:text-white">{activeInstallations}</p>
                        </div>
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-blue-900/60 dark:text-blue-400/80">MRR Generado (Est.)</p>
                            <p className="text-2xl font-bold text-blue-950 dark:text-white">${totalMRR}</p>
                        </div>
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Grid of Modules */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredModules.length === 0 ? (
                    <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl border-slate-200 dark:border-zinc-800">
                        <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <h3 className="font-medium text-lg">No se encontraron resultados</h3>
                        <p className="text-sm text-muted-foreground">Prueba buscando con otros términos.</p>
                    </div>
                ) : (
                    filteredModules.map((item) => (
                        <Card key={item.module.key} className="overflow-hidden hover:shadow-md transition-shadow duration-200 bg-white dark:bg-zinc-950/50 border-slate-200 dark:border-zinc-800 flex flex-col">
                            {/* Card Header & Main Info */}
                            <div className="p-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="p-2.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg shadow-sm shrink-0">
                                        <Package className="h-5 w-5" />
                                    </div>
                                    <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider bg-white dark:bg-zinc-900">
                                        {item.module.category}
                                    </Badge>
                                </div>
                                <h3 className="font-semibold text-base leading-tight">
                                    {item.module.name || item.module.key}
                                </h3>
                                <p className="text-xs font-mono text-muted-foreground mt-1 mb-2 bg-slate-100 dark:bg-zinc-900 inline-block px-1.5 py-0.5 rounded">
                                    {item.module.key}
                                </p>
                                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                                    {item.module.description || 'Sin descripción disponible para este módulo.'}
                                </p>
                            </div>

                            {/* Metrics Strip */}
                            <div className="flex divide-x divide-slate-100 dark:divide-white/5 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-transparent">
                                <div className="flex-1 p-3 text-center flex flex-col justify-center">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Tenants Activos</span>
                                    <span className="font-bold flex items-center justify-center gap-1.5 text-slate-800 dark:text-slate-200">
                                        <Users className="h-3.5 w-3.5 text-slate-400" />
                                        {item.metrics.active_tenants}
                                    </span>
                                </div>
                                <div className="flex-1 p-3 text-center flex flex-col justify-center">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Costo Estimado</span>
                                    <span className="font-bold flex items-center justify-center gap-1.5 text-slate-800 dark:text-slate-200">
                                        {item.module.price_monthly ? `$${item.module.price_monthly}/mo` : 'Gratuito'}
                                    </span>
                                </div>
                            </div>

                            {/* Relationships Area */}
                            <CardContent className="p-5 flex-1 flex flex-col gap-4">
                                {/* Spaces Mapping */}
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                                        <LayoutGrid className="h-3.5 w-3.5" /> Incluido en Spaces
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {item.spaces.length === 0 ? (
                                            <span className="text-xs text-muted-foreground/70 italic">Core/No asignado a ningún Space.</span>
                                        ) : (
                                            item.spaces.map(space => (
                                                <Badge key={space.id} variant="secondary" className="bg-slate-100 dark:bg-zinc-800 text-xs font-normal">
                                                    {space.name}
                                                </Badge>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Custom Overrides / Tenants Mapping */}
                                {item.tenants_override.length > 0 && (
                                    <div className="mt-auto pt-4 border-t border-dashed border-slate-200 dark:border-zinc-800">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-amber-600/80 dark:text-amber-400/80 mb-2 flex items-center gap-1.5">
                                            <Wrench className="h-3.5 w-3.5" /> Asignación Personalizada
                                        </p>
                                        <div className="flex flex-col gap-1.5">
                                            {item.tenants_override.map(tenant => (
                                                <div key={tenant.id} className="text-xs flex items-center justify-between bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 px-2 py-1.5 rounded-md">
                                                    <span className="font-medium text-amber-900 dark:text-amber-200 truncate pr-2">{tenant.name}</span>
                                                    <span className="font-mono text-[9px] text-amber-700/60 dark:text-amber-400/60 shrink-0">{tenant.slug}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Info footer */}
            <div className="text-center text-xs text-muted-foreground mt-4">
                Mostrando {filteredModules.length} de {modulesData.length} módulos disponibles en el catálogo raíz.
            </div>
        </div>
    )
}
