"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Loader2, Zap, CheckCircle2, LayoutGrid, BarChart3, Globe, Smartphone, ArrowRight, Settings2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { MobilePreview } from "@/components/marketing/mobile-preview"
import { InsightsTab } from "@/modules/core/portal/insights/insights-tab"
import { getMetaConfig, saveMetaConfig, syncClientSocialMetrics, syncClientAdsMetrics } from "@/modules/core/admin/actions"
import { supabase } from "@/lib/supabase"

interface ConnectivitySheetProps {
    client: any
    services: any[]
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function ConnectivitySheet({ client, services, trigger, open: controlledOpen, onOpenChange }: ConnectivitySheetProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen
    const setOpen = (val: boolean) => {
        if (!isControlled) setInternalOpen(val)
        if (onOpenChange) onOpenChange(val)
    }

    const [activeTab, setActiveTab] = useState("meta")
    const [loadingConfig, setLoadingConfig] = useState(false)
    const [metaConfig, setMetaConfig] = useState<any>(null)
    const [refreshKey, setRefreshKey] = useState(0) // Forces InsightsTab reload

    // Portal Settings
    const portalSettings = client.portal_insights_settings || { override: null, access_level: 'NONE' }
    const currentOverride = portalSettings.override

    // UI State for Override: 'auto' means override is null. 'manual' means it's boolean.
    const [controlMode, setControlMode] = useState<string>(currentOverride === null ? 'auto' : 'manual')
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
        if (config) setMetaConfig(config)
        setLoadingConfig(false)
    }

    const handleSaveMetaConnection = async (formData: FormData) => {
        const result = await saveMetaConfig(client.id, formData)
        if (result.success) {
            toast.success("Conexión guardada. Sincronizando datos...")

            // Trigger Sync immediately (Parallel)
            const [syncSocial, syncAds] = await Promise.all([
                syncClientSocialMetrics(client.id),
                syncClientAdsMetrics(client.id)
            ])

            if (syncSocial.success && syncAds.success) {
                toast.success("Métricas de Social y Ads actualizadas correctamente")
                setRefreshKey(prev => prev + 1) // Force UI Refresh
            } else {
                if (!syncSocial.success) toast.warning("Social Sync Falló: " + syncSocial.error)
                if (!syncAds.success) toast.warning("Ads Sync Falló: " + syncAds.error)
                // Still refresh if at least one worked? Yes.
                setRefreshKey(prev => prev + 1)
            }

            loadMetaConfig()
        } else {
            toast.error(result.error || "Error al guardar")
        }
    }

    const handleSavePortalPermissions = async () => {
        try {
            let newSettings: any = { access_level: accessLevel }
            if (controlMode === 'auto') {
                newSettings.override = null
            } else {
                newSettings.override = isForceEnabled
            }

            const { error } = await supabase
                .from('clients')
                .update({ portal_insights_settings: newSettings })
                .eq('id', client.id)

            if (error) throw error
            toast.success("Permisos actualizados")
        } catch (error) {
            console.error(error)
            toast.error("Error al actualizar permisos")
        }
    }

    const isEffectiveEnabled = controlMode === 'auto' ? true : isForceEnabled
    const isMetaConnected = !!metaConfig?.access_token

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
            <SheetContent
                side="right"
                className="
                    sm:max-w-[850px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-white/95 backdrop-blur-xl
                "
            >
                <div className="flex flex-col h-full relative">
                    {/* Header */}
                    <div className="px-8 py-5 border-b border-gray-100 bg-white/80 backdrop-blur-md flex items-center justify-between z-10">
                        <div>
                            <SheetTitle className="text-xl font-bold text-gray-900">Ecosistema Digital</SheetTitle>
                            <p className="text-sm text-gray-500">Gestiona conexiones y visibilidad del portal.</p>
                        </div>
                        {controlMode === 'auto' && (
                            <div className="flex items-center gap-2 h-8 px-3 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 rounded-full text-xs font-semibold border border-indigo-100">
                                <Zap className="w-3.5 h-3.5 fill-indigo-400 text-indigo-500" />
                                Modo Inteligente Activo
                            </div>
                        )}
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        {/* Left: Configuration Panel */}
                        <div className="w-full lg:w-7/12 flex flex-col border-r border-gray-100 bg-gray-50/30 overflow-hidden">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                                <div className="px-6 pt-6 pb-2">
                                    <TabsList className="w-full justify-start h-auto p-1 bg-gray-200/50 rounded-xl">
                                        <CustomTab value="meta" label="Meta & Social" icon={Globe} active={activeTab === 'meta'} />
                                        <CustomTab value="google" label="Google Ecosystem" icon={Globe} active={activeTab === 'google'} disabled badge="Pronto" />
                                    </TabsList>
                                </div>

                                <div className="flex-1 overflow-y-auto px-6 pb-20 pt-4">
                                    <TabsContent value="meta" className="mt-0 space-y-6 animate-in slide-in-from-left-4 duration-300">

                                        {/* 1. Connection Section */}
                                        <section className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Conexión API</h3>
                                                {isMetaConnected ? (
                                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3" /> Conectado
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">No conectado</span>
                                                )}
                                            </div>

                                            <Card className="border-none shadow-sm bg-white overflow-hidden group hover:shadow-md transition-shadow">
                                                <CardContent className="p-5">
                                                    {loadingConfig ? (
                                                        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-300 w-6 h-6" /></div>
                                                    ) : (
                                                        <form action={handleSaveMetaConnection} className="space-y-4">
                                                            <div className="grid gap-4">
                                                                <div className="space-y-1.5">
                                                                    <Label className="text-xs font-medium text-gray-500">System User Token (EAA...)</Label>
                                                                    <div className="relative">
                                                                        <Input
                                                                            name="access_token"
                                                                            type="password"
                                                                            defaultValue={metaConfig?.access_token}
                                                                            className="pl-3 pr-8 font-mono text-xs bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                                                                            placeholder="Pegar token aquí..."
                                                                        />
                                                                        {metaConfig?.access_token && <div className="absolute right-3 top-2.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />}
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-1.5">
                                                                        <Label className="text-xs font-medium text-gray-500">Ad Account ID</Label>
                                                                        <Input name="ad_account_id" defaultValue={metaConfig?.ad_account_id} className="font-mono text-xs bg-gray-50 border-gray-200" placeholder="act_..." />
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <Label className="text-xs font-medium text-gray-500">Page ID</Label>
                                                                        <Input name="page_id" defaultValue={metaConfig?.page_id} className="font-mono text-xs bg-gray-50 border-gray-200" placeholder="123..." />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-end pt-2">
                                                                <Button type="submit" size="sm" className="bg-gray-900 text-white h-8 text-xs font-medium hover:bg-black transition-all shadow-lg shadow-gray-200">
                                                                    Guardar y Sincronizar
                                                                </Button>
                                                            </div>
                                                        </form>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </section>

                                        {/* 2. Permissions Section */}
                                        <section className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Permisos del Portal</h3>
                                                <div className="flex bg-gray-200/50 p-0.5 rounded-lg">
                                                    <button onClick={() => setControlMode('auto')} className={cn("px-2 py-0.5 text-[10px] font-bold rounded-md transition-all", controlMode === 'auto' ? "bg-white shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-700")}>Auto</button>
                                                    <button onClick={() => setControlMode('manual')} className={cn("px-2 py-0.5 text-[10px] font-bold rounded-md transition-all", controlMode === 'manual' ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}>Manual</button>
                                                </div>
                                            </div>

                                            <Card className="border-none shadow-sm bg-white overflow-hidden">
                                                <CardContent className="p-0">
                                                    {controlMode === 'auto' ? (
                                                        <div className="p-8 text-center space-y-2 bg-gradient-to-b from-indigo-50/50 to-transparent">
                                                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center mx-auto text-indigo-500 mb-3 border border-indigo-50">
                                                                <Zap className="w-5 h-5 fill-indigo-100" />
                                                            </div>
                                                            <h4 className="text-sm font-semibold text-gray-900">Gestión Inteligente</h4>
                                                            <p className="text-xs text-gray-500 max-w-[250px] mx-auto leading-relaxed">
                                                                Visible automáticamente si el cliente tiene servicios de Paid Media o Social Media activos.
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="divide-y divide-gray-50">
                                                            {/* Master Toggle */}
                                                            <div className="p-4 flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors", isForceEnabled ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400")}>
                                                                        <Settings2 className="w-4 h-4" />
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-sm font-medium text-gray-900 block">Mostrar Pestaña</span>
                                                                        <span className="text-[10px] text-gray-500">Habilitar vista en portal</span>
                                                                    </div>
                                                                </div>
                                                                <Switch checked={isForceEnabled} onCheckedChange={setIsForceEnabled} />
                                                            </div>

                                                            {/* Granular Permissions */}
                                                            <div className={cn("transition-all duration-300 bg-gray-50/30", isForceEnabled ? "opacity-100" : "opacity-40 pointer-events-none grayscale")}>
                                                                <div className="p-3 pl-14 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                                                    <div className="flex items-center gap-2">
                                                                        <BarChart3 className="w-4 h-4 text-blue-500" />
                                                                        <span className="text-xs font-medium text-gray-700">Métricas de Ads</span>
                                                                    </div>
                                                                    <Switch
                                                                        checked={accessLevel === 'ALL' || accessLevel === 'ADS'}
                                                                        onCheckedChange={(c) => c ? setAccessLevel(accessLevel === 'ORGANIC' ? 'ALL' : 'ADS') : setAccessLevel(accessLevel === 'ALL' ? 'ORGANIC' : 'NONE')}
                                                                        className="scale-75"
                                                                    />
                                                                </div>
                                                                <div className="p-3 pl-14 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                                                    <div className="flex items-center gap-2">
                                                                        <LayoutGrid className="w-4 h-4 text-brand-pink" />
                                                                        <span className="text-xs font-medium text-gray-700">Feed Orgánico</span>
                                                                    </div>
                                                                    <Switch
                                                                        checked={accessLevel === 'ALL' || accessLevel === 'ORGANIC'}
                                                                        onCheckedChange={(c) => c ? setAccessLevel(accessLevel === 'ADS' ? 'ALL' : 'ORGANIC') : setAccessLevel(accessLevel === 'ALL' ? 'ADS' : 'NONE')}
                                                                        className="scale-75"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                            <Button onClick={handleSavePortalPermissions} variant="outline" size="sm" className="w-full text-xs hover:bg-white hover:border-gray-300">
                                                Actualizar Permisos
                                            </Button>
                                        </section>
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </div>

                        {/* Right: Preview Panel (Hidden on small, visible lg) */}
                        <div className="hidden lg:flex w-5/12 bg-gray-100 relative items-center justify-center p-8 bg-grid-gray-200/50">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5" />
                            <div className="relative z-10 scale-[0.85] origin-center shadow-2xl rounded-[2.5rem]">
                                <MobilePreview className="h-[600px] w-[300px] border-gray-800 ring-4 ring-black/10">
                                    {/* Scaling Wrapper: Simulates Samsung S25 Ultra / Large Android (412px width) scaled down to fit 300px container */}
                                    <div className="w-[412px] h-[915px] origin-top-left scale-[0.728] bg-white pt-2 px-2">
                                        <InsightsTab
                                            key={refreshKey} // Forces re-mount on sync
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
                                </MobilePreview>

                                {/* Overlay Label */}
                                <div className="absolute -bottom-12 left-0 right-0 text-center">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/90 backdrop-blur rounded-full text-[10px] font-bold text-gray-500 shadow-sm border border-white/50">
                                        <Smartphone className="w-3 h-3" /> Mobile Preview
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Preview Toggle / Footer for small screens */}
                    <div className="lg:hidden p-4 border-t border-gray-100 bg-white absolute bottom-0 w-full z-20">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Vista previa disponible en escritorio</span>
                            <ArrowRight className="w-3 h-3" />
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}

function CustomTab({ value, label, icon: Icon, active, disabled, badge }: any) {
    return (
        <TabsTrigger
            value={value}
            disabled={disabled}
            className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all",
                active ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/50",
                disabled && "opacity-50 cursor-not-allowed"
            )}
        >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {badge && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 text-[9px] font-bold text-gray-500">{badge}</span>}
        </TabsTrigger>
    )
}
