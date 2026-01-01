"use client"

import { useState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Settings, Eye, CheckCircle2, AlertCircle, LayoutGrid, BarChart3, Globe, ExternalLink, Smartphone, Zap } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// Actions
import { getMetaConfig, saveMetaConfig } from "@/modules/core/admin/actions"
import { supabase } from "@/lib/supabase"
import { InsightsTab } from "@/modules/core/portal/insights/insights-tab"

interface EcosystemHubModalProps {
    client: any
    services: any[]
    open?: boolean
    onOpenChange?: (open: boolean) => void
    trigger?: React.ReactNode
    onUpdate?: () => void
}

export function EcosystemHubModal({ client, services, open: controlledOpen, onOpenChange, trigger, onUpdate }: EcosystemHubModalProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = isControlled ? onOpenChange : setInternalOpen

    const [activeTab, setActiveTab] = useState("meta")
    const [loadingConfig, setLoadingConfig] = useState(false)

    // Meta Config State
    const [metaConfig, setMetaConfig] = useState<any>(null)

    // Portal Settings State (from client object)
    const portalSettings = client.portal_insights_settings || { override: null, access_level: 'NONE' }

    // Override Logic: null = auto, true = enabled, false = disabled
    const currentOverride = portalSettings.override

    // UI State for Override (mapped to nicer UX)
    // 'automatic': depends on services (default)
    // 'custom': manual control
    const [controlMode, setControlMode] = useState<string>(
        currentOverride === null ? 'automatic' : 'custom'
    )

    // If Custom, is it enabled or disabled?
    const [isForceEnabled, setIsForceEnabled] = useState<boolean>(currentOverride === true)

    const [accessLevel, setAccessLevel] = useState<string>(portalSettings.access_level || 'ALL')

    useEffect(() => {
        if (open && activeTab === 'meta') {
            loadMetaConfig()
        }
    }, [open, activeTab])

    const loadMetaConfig = async () => {
        setLoadingConfig(true)
        const { config } = await getMetaConfig(client.id)
        if (config) {
            setMetaConfig(config)
        }
        setLoadingConfig(false)
    }

    const handleSaveMetaConnection = async (formData: FormData) => {
        const result = await saveMetaConfig(client.id, formData)
        if (result.success) {
            toast.success("Conexión con Meta guardada")
            loadMetaConfig()
        } else {
            toast.error(result.error || "Error al guardar conexión")
        }
    }

    const handleSavePortalPermissions = async () => {
        try {
            let newSettings: any = { access_level: accessLevel }

            if (controlMode === 'automatic') {
                newSettings.override = null
            } else {
                newSettings.override = isForceEnabled
            }

            const { error } = await supabase
                .from('clients')
                .update({ portal_insights_settings: newSettings })
                .eq('id', client.id)

            if (error) throw error

            toast.success("Permisos actualizados", {
                description: "El cliente verá los cambios reflejados inmediatamente."
            })
            if (onUpdate) onUpdate()

        } catch (error) {
            console.error(error)
            toast.error("Error al guardar permisos")
        }
    }

    const isMetaConnected = !!metaConfig?.access_token

    // Determine effective visibility for Preview
    const isEffectiveEnabled = controlMode === 'automatic'
        ? true // Simplified for preview: assume enabled if auto (or add service check logic if critical)
        : isForceEnabled

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0 gap-0 border-none shadow-2xl bg-gray-50/50">
                <div className="flex flex-col h-[800px] w-full bg-white rounded-xl overflow-hidden">

                    {/* HEADER */}
                    <div className="px-8 py-5 border-b border-gray-100 bg-white flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shadow-lg shadow-indigo-900/20">
                                <Settings className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold text-gray-900">Ecosistema de Marketing</DialogTitle>
                                <DialogDescription className="text-sm">Configura integraciones y decide qué ve tu cliente.</DialogDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <StatusBadge connected={isMetaConnected} />
                        </div>
                    </div>

                    {/* HORIZONTAL TABS */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} orientation="horizontal" className="flex flex-col flex-1 min-h-0">
                        <div className="px-8 border-b border-gray-100 bg-white shrink-0">
                            <TabsList className="bg-transparent h-auto p-0 gap-8 justify-start w-full">
                                <CustomTabTrigger value="meta" icon={<Globe className="w-4 h-4" />} label="Meta Ads & Social" active={activeTab === 'meta'} />
                                <CustomTabTrigger value="google" icon={<Globe className="w-4 h-4" />} label="Google Ads" active={activeTab === 'google'} disabled badge="Pronto" />
                            </TabsList>
                        </div>

                        {/* CONTENT */}
                        <div className="flex-1 overflow-y-auto bg-gray-50/50">
                            <TabsContent value="meta" className="h-full p-8 mt-0 outline-none">
                                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-full">

                                    {/* LEFT COLUMN: CONTROLS */}
                                    <div className="xl:col-span-7 space-y-6">

                                        {/* 1. CONNECTION CARD */}
                                        <Card className="border-none shadow-sm bg-white overflow-hidden">
                                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                                                <div className="flex items-center gap-3">
                                                    <BrandLogo brand="meta" />
                                                    <h3 className="font-semibold text-gray-900">Conexión API</h3>
                                                </div>
                                                <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded font-medium">Requerido</div>
                                            </div>
                                            <CardContent className="p-6">
                                                {loadingConfig ? (
                                                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-300 w-8 h-8" /></div>
                                                ) : (
                                                    <form action={handleSaveMetaConnection} className="space-y-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-1.5 col-span-2">
                                                                <Label className="text-xs font-medium text-gray-500">System User Token</Label>
                                                                <Input name="access_token" type="password" defaultValue={metaConfig?.access_token} className="bg-gray-50/50 font-mono text-xs h-9 border-gray-200" placeholder="EAA..." />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs font-medium text-gray-500">Ad Account ID</Label>
                                                                <Input name="ad_account_id" defaultValue={metaConfig?.ad_account_id} className="bg-gray-50/50 font-mono text-xs h-9 border-gray-200" placeholder="act_..." />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs font-medium text-gray-500">Page ID</Label>
                                                                <Input name="page_id" defaultValue={metaConfig?.page_id} className="bg-gray-50/50 font-mono text-xs h-9 border-gray-200" placeholder="123..." />
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-end pt-2">
                                                            <SubmitButton label="Guardar Credenciales" />
                                                        </div>
                                                    </form>
                                                )}
                                            </CardContent>
                                        </Card>

                                        {/* 2. PERMISSIONS (REINVENTED) */}
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-3 px-1">Permisos del Portal</h3>
                                            <Card className="border-none shadow-sm bg-white overflow-hidden">
                                                {/* Control Mode Segmented Tabs */}
                                                <div className="p-2 bg-gray-50/50 border-b border-gray-100">
                                                    <div className="grid grid-cols-2 p-1 bg-gray-200/50 rounded-lg">
                                                        <button
                                                            onClick={() => setControlMode('automatic')}
                                                            className={cn("text-xs font-medium py-2 rounded-md transition-all", controlMode === 'automatic' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}
                                                        >
                                                            🤖 Automático
                                                        </button>
                                                        <button
                                                            onClick={() => setControlMode('custom')}
                                                            className={cn("text-xs font-medium py-2 rounded-md transition-all", controlMode === 'custom' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}
                                                        >
                                                            ⚙️ Manual
                                                        </button>
                                                    </div>
                                                </div>

                                                <CardContent className="p-6 space-y-6">
                                                    {controlMode === 'automatic' ? (
                                                        <div className="text-center py-4 space-y-2 animate-in fade-in">
                                                            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-500">
                                                                <Zap className="w-6 h-6" />
                                                            </div>
                                                            <p className="text-sm font-medium text-gray-900">Modo Inteligente Activo</p>
                                                            <p className="text-xs text-gray-500 max-w-xs mx-auto">
                                                                El sistema mostrará las pestañas automáticamente si detecta servicios de Publicidad o Redes Sociales activos en la suscripción del cliente.
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-6 animate-in fade-in">

                                                            {/* Master Switch */}
                                                            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/30">
                                                                <div className="space-y-0.5">
                                                                    <Label className="text-sm font-medium">Habilitar Módulo Insights</Label>
                                                                    <p className="text-xs text-gray-500">¿El cliente puede ver la sección de métricas?</p>
                                                                </div>
                                                                <Switch checked={isForceEnabled} onCheckedChange={setIsForceEnabled} />
                                                            </div>

                                                            {/* Detailed Permissions (Only if Enabled) */}
                                                            <div className={cn("space-y-4 pl-4 border-l-2 border-gray-100 transition-all duration-300", isForceEnabled ? "opacity-100" : "opacity-30 pointer-events-none")}>
                                                                <div className="flex items-center justify-between pr-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                                            <BarChart3 className="w-4 h-4" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-medium text-gray-900">Dashboard de Ads</p>
                                                                            <p className="text-[10px] text-gray-500">Métricas de campañas pagas.</p>
                                                                        </div>
                                                                    </div>
                                                                    <Switch
                                                                        checked={accessLevel === 'ALL' || accessLevel === 'ADS'}
                                                                        onCheckedChange={(c) => {
                                                                            if (c) setAccessLevel(accessLevel === 'ORGANIC' ? 'ALL' : 'ADS')
                                                                            else setAccessLevel(accessLevel === 'ALL' ? 'ORGANIC' : 'NONE')
                                                                        }}
                                                                    />
                                                                </div>

                                                                <div className="flex items-center justify-between pr-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600">
                                                                            <LayoutGrid className="w-4 h-4" />
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-sm font-medium text-gray-900">Feed Orgánico</p>
                                                                            <p className="text-[10px] text-gray-500">Posts de Instagram/Facebook.</p>
                                                                        </div>
                                                                    </div>
                                                                    <Switch
                                                                        checked={accessLevel === 'ALL' || accessLevel === 'ORGANIC'}
                                                                        onCheckedChange={(c) => {
                                                                            if (c) setAccessLevel(accessLevel === 'ADS' ? 'ALL' : 'ORGANIC')
                                                                            else setAccessLevel(accessLevel === 'ALL' ? 'ADS' : 'NONE')
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <Button onClick={handleSavePortalPermissions} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                                                        Aplicar Cambios
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        </div>

                                    </div>

                                    {/* RIGHT COLUMN: PREVIEW */}
                                    <div className="xl:col-span-5 flex flex-col h-full min-h-[500px]">
                                        <div className="flex items-center justify-between mb-3 px-1">
                                            <h3 className="font-semibold text-gray-900">Vista Previa (Móvil)</h3>
                                            <Badge variant="outline" className="text-xs font-normal text-gray-500 bg-white"><Smartphone className="w-3 h-3 mr-1" /> Live Preview</Badge>
                                        </div>

                                        <div className="flex-1 bg-gray-900 rounded-3xl p-3 shadow-2xl relative border-[6px] border-gray-800 overflow-hidden ring-1 ring-black/5">
                                            {/* Notch */}
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-5 bg-black rounded-b-xl z-20"></div>

                                            {/* Screen Content */}
                                            <div className="bg-gray-50 w-full h-full rounded-2xl overflow-hidden relative">
                                                <div className="absolute inset-0 overflow-y-auto scrollbar-hide">
                                                    <div className="scale-[0.85] origin-top w-[117%]">
                                                        <InsightsTab
                                                            client={client}
                                                            services={services}
                                                            token={client.portal_short_token}
                                                            insightsAccess={{
                                                                show: isEffectiveEnabled,
                                                                mode: {
                                                                    ads: (accessLevel === 'ALL' || accessLevel === 'ADS'),
                                                                    organic: (accessLevel === 'ALL' || accessLevel === 'ORGANIC')
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-6 text-center">
                                            <Button variant="link" size="sm" className="text-gray-500 hover:text-indigo-600 gap-2" asChild>
                                                <a href={`/portal/${client.portal_short_token}`} target="_blank" rel="noopener noreferrer">
                                                    Abrir Portal Real <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function CustomTabTrigger({ value, icon, label, active, disabled, badge }: any) {
    return (
        <TabsTrigger
            value={value}
            disabled={disabled}
            className={cn(
                "relative pb-4 pt-1 px-1 rounded-none bg-transparent border-b-2 transition-all data-[state=active]:shadow-none",
                active ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-700",
                disabled && "opacity-40 cursor-not-allowed"
            )}
        >
            <div className="flex items-center gap-2">
                {icon}
                <span className="font-semibold text-sm">{label}</span>
                {badge && <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-[9px] font-bold uppercase tracking-wider text-gray-500">{badge}</span>}
            </div>
        </TabsTrigger>
    )
}

function BrandLogo({ brand }: { brand: string }) {
    return (
        <div className="w-8 h-8 rounded-lg border border-gray-100 flex items-center justify-center bg-white p-1.5 shrink-0">
            <img
                src={`/assets/brands/${brand}.svg`}
                alt={brand}
                className="w-full h-full object-contain"
                onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                }}
            />
        </div>
    )
}

function StatusBadge({ connected }: { connected: boolean }) {
    if (connected) {
        return (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold">Conectado</span>
            </div>
        )
    }
    return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 text-gray-500 border border-gray-200">
            <div className="w-2 h-2 rounded-full bg-gray-300" />
            <span className="text-xs font-bold">Desconectado</span>
        </div>
    )
}

function SubmitButton({ label }: { label: string }) {
    const { pending } = useFormStatus()
    return (
        <Button type="submit" disabled={pending} size="sm" className="bg-gray-900 hover:bg-gray-800 text-white">
            {pending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            {label}
        </Button>
    )
}

function Badge({ variant, className, children }: any) {
    return <div className={cn("px-2 py-0.5 rounded text-xs font-medium border", className)}>{children}</div>
}
