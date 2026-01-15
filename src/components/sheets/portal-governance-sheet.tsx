"use client"

import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Layout, Globe, Server, FileText, BarChart3, ExternalLink, Shield, Calendar } from "lucide-react"
import { updateClientPortalConfig, updatePortalTokenExpiration } from "@/modules/core/portal/actions"
import { toast } from "sonner"
import { Client } from "@/types"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface PortalGovernanceSheetProps {
    client: Client
    globalSettings: any
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function PortalGovernanceSheet({ client, globalSettings, trigger, open: controlledOpen, onOpenChange }: PortalGovernanceSheetProps) {
    console.log("PortalGovernanceSheet Client:", client)
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = (val: boolean) => {
        if (!isControlled) setInternalOpen(val)
        if (onOpenChange) onOpenChange(val)
    }

    const [isLoading, setIsLoading] = useState(false)
    const [config, setConfig] = useState<any>(client.portal_config || {
        enabled: true,
        modules: {}
    })

    // Token Security State
    const [tokenNeverExpires, setTokenNeverExpires] = useState(client.portal_token_never_expires !== false)
    const [tokenExpiresAt, setTokenExpiresAt] = useState(
        client.portal_token_expires_at ? new Date(client.portal_token_expires_at).toISOString().split('T')[0] : ''
    )
    const [isSavingExpiration, setIsSavingExpiration] = useState(false)

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

    // Token Expiration Handlers
    const handleTokenExpirationToggle = async (neverExpires: boolean) => {
        setTokenNeverExpires(neverExpires)
        if (neverExpires) {
            // Save immediately when toggling to "never expires"
            await saveTokenExpiration(neverExpires, null)
        }
    }

    const handleExpirationDateChange = async (date: string) => {
        setTokenExpiresAt(date)
        if (date) {
            await saveTokenExpiration(false, date)
        }
    }

    const saveTokenExpiration = async (neverExpires: boolean, expiresAt: string | null) => {
        setIsSavingExpiration(true)
        try {
            const result = await updatePortalTokenExpiration(client.id, neverExpires, expiresAt)
            if (result.success) {
                toast.success(neverExpires ? "Enlace configurado sin expiración" : "Fecha de expiración actualizada")
            } else {
                toast.error("Error al guardar configuración de seguridad")
            }
        } catch (error) {
            toast.error("Error al guardar")
            console.error(error)
        } finally {
            setIsSavingExpiration(false)
        }
    }

    // Checking Global Availability
    const isGloballyEnabled = (key: string) => {
        if (key === 'summary') return true
        if (key === 'billing') return globalSettings?.portal_modules?.invoices !== false
        if (key === 'services') return true
        if (key === 'hosting') return true
        return true
    }

    const modules = [
        { key: 'summary', label: 'Resumen', icon: Layout, description: 'Vista principal del cliente.' },
        { key: 'billing', label: 'Facturación', icon: FileText, description: 'Historial de facturas y pagos.' },
        { key: 'services', label: 'Servicios', icon: Globe, description: 'Estado de servicios y briefings.' },
        { key: 'hosting', label: 'Hosting Web', icon: Server, description: 'Detalles técnicos de alojamiento.' },
        { key: 'insights', label: 'Insights', icon: BarChart3, description: 'Reportes de rendimiento (Meta/Ads).' },
    ]

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {trigger || (
                    <Button variant="outline">Gobernanza Portal</Button>
                )}
            </SheetTrigger>
            <SheetContent
                className="
                    sm:max-w-[600px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <div className="flex flex-col h-full bg-slate-50/95 backdrop-blur-xl">
                    <SheetHeader className="px-6 py-4 bg-white/80 border-b border-gray-100 flex-shrink-0 backdrop-blur-md sticky top-0 z-10">
                        <SheetTitle>Gobernanza del Portal</SheetTitle>
                        <p className="text-sm text-gray-500">Configura qué módulos ve este cliente en su portal.</p>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Master Switch */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-gray-900">Estado del Portal</p>
                                <p className="text-xs text-gray-500">{config.enabled ? 'El cliente tiene acceso' : 'Modo Mantenimiento (Sin acceso)'}</p>
                            </div>
                            <Switch
                                checked={config.enabled !== false}
                                onCheckedChange={handleMasterToggle}
                            />
                        </div>

                        {/* Token Security Section */}
                        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-amber-50">
                                    <Shield className="h-4 w-4 text-amber-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">Seguridad del Enlace</p>
                                    <p className="text-xs text-gray-500">Configura la expiración del token de acceso</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="text-sm font-medium text-gray-700">Enlace permanente</p>
                                    <p className="text-xs text-gray-500">
                                        {tokenNeverExpires ? 'El enlace nunca expira' : 'El enlace tiene fecha límite'}
                                    </p>
                                </div>
                                <Switch
                                    checked={tokenNeverExpires}
                                    onCheckedChange={handleTokenExpirationToggle}
                                    disabled={isSavingExpiration}
                                />
                            </div>

                            {!tokenNeverExpires && (
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        Fecha de expiración
                                    </Label>
                                    <input
                                        type="date"
                                        value={tokenExpiresAt}
                                        onChange={(e) => handleExpirationDateChange(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                        disabled={isSavingExpiration}
                                    />
                                    {tokenExpiresAt && (
                                        <p className="text-xs text-amber-600">
                                            ⚠️ El cliente perderá acceso después de esta fecha
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Modules Grid */}
                        <div className="space-y-3">
                            <Label className="uppercase text-xs font-bold text-gray-500 tracking-wider">Módulos Visibles</Label>
                            {modules.map((module) => {
                                const globalEnabled = isGloballyEnabled(module.key)
                                const currentMode = config.modules?.[module.key]?.mode || 'auto'

                                return (
                                    <div key={module.key} className={cn(
                                        "flex items-center justify-between p-3 rounded-xl border transition-all",
                                        globalEnabled ? "bg-white border-gray-100 shadow-sm" : "bg-gray-50 border-gray-100 opacity-70"
                                    )}>
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-2 rounded-lg", globalEnabled ? "bg-indigo-50 text-indigo-600" : "bg-gray-100 text-gray-400")}>
                                                <module.icon className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm text-gray-900">{module.label}</p>
                                                {!globalEnabled ? (
                                                    <span className="text-[10px] text-red-500 font-medium">Deshabilitado por Agencia</span>
                                                ) : (
                                                    <p className="text-[10px] text-gray-500">{module.description}</p>
                                                )}
                                            </div>
                                        </div>

                                        <Select
                                            value={currentMode}
                                            onValueChange={(val) => handleModuleChange(module.key, val)}
                                            disabled={!globalEnabled || !config.enabled}
                                        >
                                            <SelectTrigger className="w-[100px] h-8 text-xs bg-gray-50 border-0 focus:ring-0">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="auto">Auto</SelectItem>
                                                <SelectItem value="on">Visible</SelectItem>
                                                <SelectItem value="off">Oculto</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="p-6 bg-white border-t border-gray-100 flex-shrink-0">
                        <Button
                            className="w-full bg-black text-white hover:bg-gray-800"
                            onClick={() => window.open(`/portal/${client.portal_short_token || client.portal_token}`, '_blank')}
                        >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Ver portal del cliente
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
