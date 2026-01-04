"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Layout, Globe, Server, FileText, BarChart3, Lock, AlertTriangle, ExternalLink, RefreshCw } from "lucide-react"
import { updateClientPortalConfig } from "@/modules/core/portal/actions"
import { toast } from "sonner"
import { Client } from "@/types"

interface PortalGovernanceCardProps {
    client: Client
    globalSettings: any
}

export function PortalGovernanceCard({ client, globalSettings }: PortalGovernanceCardProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [config, setConfig] = useState<any>(client.portal_config || {
        enabled: true,
        modules: {}
    })

    const handleMasterToggle = async (checked: boolean) => {
        const newConfig = { ...config, enabled: checked }
        setConfig(newConfig)
        await saveConfig(newConfig)
    }

    const handleModuleChange = async (moduleKey: string, mode: string) => {
        const newConfig = {
            ...config,
            modules: {
                ...config.modules,
                [moduleKey]: { mode }
            }
        }
        setConfig(newConfig)
        await saveConfig(newConfig)
    }

    const saveConfig = async (newConfig: any) => {
        setIsLoading(true)
        try {
            await updateClientPortalConfig(client.id, newConfig)
            toast.success("Configuración del portal actualizada")
        } catch (error) {
            toast.error("Error al guardar configuración")
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    // Helper to check global availability
    const isGloballyEnabled = (key: string) => {
        // Mapping internal keys to global settings keys if they differ
        // Based on settings-form.tsx, keys seems to be 'payments', 'invoices', etc.
        // We will assume direct mapping for now or specific overrides.
        if (key === 'summary') return true
        if (key === 'billing') return globalSettings?.portal_modules?.invoices !== false
        if (key === 'services') return true // Usually core
        if (key === 'hosting') return true // Usually core
        if (key === 'insights') return true // Specific module check might be needed
        return true
    }

    const modules = [
        { key: 'summary', label: 'Resumen', icon: Layout, description: 'Vista principal del cliente.' },
        { key: 'billing', label: 'Facturación y Pagos', icon: FileText, description: 'Historial de facturas y pasarela de pagos.' },
        { key: 'services', label: 'Servicios y Proyectos', icon: Globe, description: 'Estado de servicios activos y briefings.' },
        { key: 'hosting', label: 'Hosting Web', icon: Server, description: 'Detalles técnicos de alojamiento y dominios.' },
        { key: 'insights', label: 'Insights & Analytics', icon: BarChart3, description: 'Reportes de rendimiento (Meta/Ads).' },
    ]

    return (
        <Card className="border-blue-100 bg-blue-50/20">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Layout className="h-5 w-5 text-blue-600" />
                        <CardTitle>Gobernanza del Portal</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="portal-master-switch" className="text-sm font-medium text-gray-700">
                            {config.enabled ? 'Portal Activo' : 'Portal Inactivo'}
                        </Label>
                        <Switch
                            id="portal-master-switch"
                            checked={config.enabled !== false}
                            onCheckedChange={handleMasterToggle}
                        />
                    </div>
                </div>
                <CardDescription>
                    Controla qué módulos ve este cliente. Los módulos desactivados globalmente no se pueden habilitar aquí.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4">
                    {modules.map((module) => {
                        const globalEnabled = isGloballyEnabled(module.key)
                        const currentMode = config.modules?.[module.key]?.mode || 'auto'

                        return (
                            <div key={module.key} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${globalEnabled ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                        <module.icon className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className={`font-medium text-sm ${!globalEnabled && 'text-gray-400'}`}>{module.label}</p>
                                            {!globalEnabled && (
                                                <Badge variant="outline" className="text-[10px] px-1 h-5 bg-gray-50 text-gray-500 border-gray-200">
                                                    Deshabilitado Globalmente
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">{module.description}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Select
                                        value={currentMode}
                                        onValueChange={(val) => handleModuleChange(module.key, val)}
                                        disabled={!globalEnabled || !config.enabled}
                                    >
                                        <SelectTrigger className="w-[110px] h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="auto">Automático</SelectItem>
                                            <SelectItem value="on">Visible</SelectItem>
                                            <SelectItem value="off">Oculto</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <Separator />

                <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" className="text-xs h-8 gap-2" onClick={() => window.open(`/portal/${client.portal_token}`, '_blank')}>
                        <ExternalLink className="h-3 w-3" />
                        Ver como Cliente
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
