"use client"

import { useState, useEffect } from "react"
import { getAllSystemModules, getModuleUsageStats } from "@/modules/core/saas/module-management-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Loader2, Package, Box, Info, Code, Layers } from "lucide-react"
import { ModuleStatusBadge } from "./module-status-badge"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface ModuleWithStats {
    key: string
    name: string
    description?: string
    version?: string
    category?: string
    status: string
    dependencies?: { module_key: string, type: string, reason?: string }[]
    metadata?: any
    usage_count?: number
}

export function ModulesTable() {
    const [modules, setModules] = useState<ModuleWithStats[]>([])
    const [loading, setLoading] = useState(true)

    const fetchData = async () => {
        setLoading(true)
        try {
            const [allModules, usageStats] = await Promise.all([
                getAllSystemModules(),
                getModuleUsageStats()
            ])

            // usageStats is a Record<module_key, { count, organizations }>
            const merged = allModules?.map((m: any) => ({
                ...m,
                usage_count: usageStats?.[m.key]?.count || 0
            })) || []

            setModules(merged)
        } catch (error) {
            console.error("Error fetching modules:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-gray-50/50">
                        <TableHead>Módulo / Descripción</TableHead>
                        <TableHead>Versión</TableHead>
                        <TableHead>Dependencias</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Uso (Orgs)</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {modules.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                No se encontraron módulos en el sistema.
                            </TableCell>
                        </TableRow>
                    ) : (
                        modules.map((module) => (
                            <TableRow key={module.key} className="group hover:bg-gray-50/50">
                                <TableCell>
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                            <Package className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-900 flex items-center gap-2">
                                                {module.name}
                                                <Badge variant="secondary" className="text-[10px] font-mono px-1 py-0.5 bg-gray-100 text-gray-500 hover:bg-gray-200">
                                                    {module.key}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground max-w-[300px] line-clamp-2">
                                                {module.description || "Sin descripción disponible"}
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1.5 text-sm text-gray-600 font-mono">
                                        v{module.version || '1.0.0'}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {module.dependencies && module.dependencies.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {module.dependencies.map((dep) => (
                                                <TooltipProvider key={dep.module_key || String(dep)}>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-dashed border-gray-300 gap-1 hover:border-indigo-300 hover:bg-indigo-50 cursor-help">
                                                                <Box className="h-3 w-3 text-indigo-400" />
                                                                {dep.module_key || String(dep)}
                                                            </Badge>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p className="text-xs">
                                                                {dep.type === 'required' ? 'Requiere' : 'Recomienda'} el módulo <strong>{dep.module_key || String(dep)}</strong>
                                                            </p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground text-xs italic">-</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <ModuleStatusBadge status={module.status} />
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1 font-medium text-gray-900">
                                        <Layers className="h-4 w-4 text-gray-400" />
                                        {module.usage_count}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-indigo-600">
                                        <Code className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
