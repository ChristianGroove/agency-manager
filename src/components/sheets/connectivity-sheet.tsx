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
import { cn } from "@/modules/infrastructure/utils/utils"
import { MobilePreview } from "@/components/ui/mobile-preview"
import { InsightsTab } from "@/modules/features/portal/insights/insights-tab"
import { getMetaConfig, saveMetaConfig, syncClientSocialMetrics, syncClientAdsMetrics, getMetaAssets } from "@/modules/core/admin/actions"
import { supabase } from "@/modules/core/database/supabase"

interface ConnectivitySheetProps {
    client: any
    services: any[]
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function ConnectivitySheet({ client, services, trigger, open: controlledOpen, onOpenChange }: ConnectivitySheetProps) {
    if (!client) return null

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
    const [availableAssets, setAvailableAssets] = useState<{ adAccounts: any[], pages: any[] }>({ adAccounts: [], pages: [] })
    const [refreshKey, setRefreshKey] = useState(0) // Forces InsightsTab reload

    // Portal Settings
    const portalSettings = client?.portal_insights_settings || { override: null, access_level: 'NONE' }
    const currentOverride = portalSettings?.override ?? null

    // UI State for Override: 'auto' means override is null. 'manual' means it's boolean.
    const [controlMode, setControlMode] = useState<string>(currentOverride === null ? 'auto' : 'manual')
    const [isForceEnabled, setIsForceEnabled] = useState<boolean>(currentOverride === true)
    const [accessLevel, setAccessLevel] = useState<string>(portalSettings?.access_level || 'ALL')

    useEffect(() => {
        if (open && activeTab === 'meta') {
            loadMetaConfig()
        }
    }, [open, activeTab])

    // OAuth Listener
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'META_CONNECT_SUCCESS' && event.data?.clientId === client.id) {
                toast.success("Conexión con Meta exitosa")
                loadMetaConfig()
            }
        }
        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [client.id])

    const loadMetaConfig = async () => {
        setLoadingConfig(true)
        const { config } = await getMetaConfig(client.id)
        if (config) {
            setMetaConfig(config)

            // If we have a token, fetch assets
            if (config.has_access_token) {
                const assets = await getMetaAssets(client.id)
                if (assets.success && assets.data) {
                    setAvailableAssets(assets.data)
                }
            }
        }
        setLoadingConfig(false)
    }

    const handleConnectMeta = () => {
        const appId = process.env.NEXT_PUBLIC_META_APP_ID || '25468410932828305'; // Fallback to avoid crash, but should be env
        const redirectUri = `${window.location.origin}/api/integrations/meta/callback`;
        const scope = 'ads_read,pages_show_list,pages_read_engagement';
        const state = `contact_connect:${client.id}`;

        const url = `https://www.facebook.com/v24.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&state=${state}&scope=${scope}&response_type=code`;

        window.open(url, 'Connect Meta', 'width=600,height=700');
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
                .from('leads')
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
    const isMetaConnected = !!metaConfig?.has_access_token

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
            <SheetContent
                side="right"
                className="
                    sm:max-w-[850px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <div className="flex flex-col h-full relative bg-white dark:bg-[#0a0a0a] dark:border dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl text-slate-900 dark:text-zinc-100">
                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-8 py-5 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-100 dark:border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-brand-pink/10 rounded-xl text-brand-pink shrink-0">
                                <Zap className="h-5 w-5" />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Ecosistema Digital</SheetTitle>
                                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">Gestiona conexiones y visibilidad del portal.</p>
                            </div>
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
                        <div className="w-full lg:w-7/12 flex flex-col border-r border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-zinc-950/40 overflow-hidden">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                                <div className="px-6 pt-6 pb-2">
                                    <TabsList className="w-full justify-start h-auto p-1 bg-gray-200/50 dark:bg-zinc-800 rounded-xl">
                                        <CustomTab value="meta" label="Meta & Social" icon={Globe} active={activeTab === 'meta'} />
                                        <CustomTab value="google" label="Google Ecosystem" icon={Globe} active={activeTab === 'google'} disabled badge="Pronto" />
                                    </TabsList>
                                </div>

                                <div className="flex-1 overflow-y-auto px-6 pb-20 pt-4">
                                    <TabsContent value="meta" className="mt-0 space-y-6 animate-in slide-in-from-left-4 duration-300">

                                        {/* 1. Connection Section */}
                                        <section className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Conexión API</h3>
                                                {isMetaConnected ? (
                                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/40 flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3" /> Conectado
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-medium text-gray-400 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">No conectado</span>
                                                )}
                                            </div>

                                            <Card className="border border-gray-100 dark:border-white/10 shadow-sm bg-white dark:bg-zinc-900 overflow-hidden group hover:shadow-md transition-shadow rounded-2xl">
                                                <CardContent className="p-5">
                                                    {loadingConfig ? (
                                                        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-300 dark:text-zinc-600 w-6 h-6" /></div>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            {!isMetaConnected ? (
                                                                <div className="text-center py-6 space-y-4">
                                                                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 rounded-full flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
                                                                        <Globe className="w-6 h-6" />
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Conectar con Meta</h4>
                                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[250px] mx-auto">
                                                                            Inicia sesión para seleccionar tus cuentas publicitarias y páginas de Facebook.
                                                                        </p>
                                                                    </div>
                                                                    <Button
                                                                        onClick={handleConnectMeta}
                                                                        className="bg-[#1877F2] hover:bg-[#166fe5] text-white shadow-md shadow-blue-200/50 dark:shadow-none font-bold rounded-xl"
                                                                    >
                                                                        Continuar con Facebook
                                                                    </Button>
                                                                    <div className="pt-2">
                                                                        <p className="text-[10px] text-gray-400 dark:text-zinc-500">
                                                                            Se abrirá una ventana emergente segura.
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <form action={handleSaveMetaConnection} className="space-y-4">
                                                                    <div className="bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-3 flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                                                            <CheckCircle2 className="w-4 h-4" />
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <p className="text-xs font-medium text-emerald-900 dark:text-emerald-200">Cuenta de Meta Conectada</p>
                                                                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 truncate max-w-[200px]">Token activo y válido</p>
                                                                        </div>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-7 text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                            onClick={async () => {
                                                                                if (confirm("¿Estás seguro de que deseas desconectar esta cuenta? Se perderá el acceso a métricas y selección de activos.")) {
                                                                                    try {
                                                                                        // Dynamic import to avoid circular dep issues if any, though likely fine here
                                                                                        const { disconnectMetaConfig } = await import("@/modules/core/admin/actions")
                                                                                        setLoadingConfig(true)
                                                                                        const result = await disconnectMetaConfig(client.id)
                                                                                        if (result.success) {
                                                                                            toast.success("Cuenta desconectada correctamente")
                                                                                            setMetaConfig(null)
                                                                                            setAvailableAssets({ adAccounts: [], pages: [] })
                                                                                        } else {
                                                                                            toast.error(result.error || "Error al desconectar")
                                                                                        }
                                                                                        setLoadingConfig(false)
                                                                                    } catch (e) {
                                                                                        console.error(e)
                                                                                        setLoadingConfig(false)
                                                                                        toast.error("Error inesperado al desconectar")
                                                                                    }
                                                                                }
                                                                            }}
                                                                        >
                                                                            Desvincular
                                                                        </Button>
                                                                    </div>

                                                                    <div className="grid gap-4">
                                                                        <div className="space-y-1.5">
                                                                            <Label className="text-xs font-medium text-gray-500">Cuenta Publicitaria (Ads)</Label>
                                                                            {availableAssets.adAccounts.length > 0 ? (
                                                                                <select
                                                                                    name="ad_account_id"
                                                                                    defaultValue={metaConfig?.ad_account_id}
                                                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                                                >
                                                                                    <option value="">Seleccionar cuenta...</option>
                                                                                    {availableAssets.adAccounts.map((acc: any) => (
                                                                                        <option key={acc.id} value={acc.id}>
                                                                                            {acc.name} ({acc.account_id}) - {acc.currency}
                                                                                        </option>
                                                                                    ))}
                                                                                </select>
                                                                            ) : (
                                                                                <Input
                                                                                    name="ad_account_id"
                                                                                    defaultValue={metaConfig?.ad_account_id}
                                                                                    className="font-mono text-xs bg-gray-50 border-gray-200"
                                                                                    placeholder="act_..."
                                                                                />
                                                                            )}
                                                                            <p className="text-[10px] text-gray-400">Si no aparece, verifica permisos en Business Manager</p>
                                                                        </div>

                                                                        <div className="space-y-1.5">
                                                                            <Label className="text-xs font-medium text-gray-500">Página de Facebook</Label>
                                                                            {availableAssets.pages.length > 0 ? (
                                                                                <select
                                                                                    name="page_id"
                                                                                    defaultValue={metaConfig?.page_id}
                                                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                                                >
                                                                                    <option value="">Seleccionar página...</option>
                                                                                    {availableAssets.pages.map((page: any) => (
                                                                                        <option key={page.id} value={page.id}>
                                                                                            {page.name} (ID: {page.id})
                                                                                        </option>
                                                                                    ))}
                                                                                </select>
                                                                            ) : (
                                                                                <Input
                                                                                    name="page_id"
                                                                                    defaultValue={metaConfig?.page_id}
                                                                                    className="font-mono text-xs bg-gray-50 border-gray-200"
                                                                                    placeholder="123..."
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex justify-end pt-2">
                                                                        <Button type="submit" size="sm" className="bg-gray-900 text-white h-8 text-xs font-medium hover:bg-black transition-all shadow-lg shadow-gray-200">
                                                                            Guardar Configuración
                                                                        </Button>
                                                                    </div>
                                                                </form>
                                                            )}
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </section>

                                        {/* 2. Permissions Section */}
                                        <section className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Permisos del Portal</h3>
                                                <div className="flex bg-gray-200/50 dark:bg-zinc-800 p-0.5 rounded-lg">
                                                    <button onClick={() => setControlMode('auto')} className={cn("px-2 py-0.5 text-[10px] font-bold rounded-md transition-all", controlMode === 'auto' ? "bg-white dark:bg-zinc-900 shadow-sm text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white")}>Auto</button>
                                                    <button onClick={() => setControlMode('manual')} className={cn("px-2 py-0.5 text-[10px] font-bold rounded-md transition-all", controlMode === 'manual' ? "bg-white dark:bg-zinc-900 shadow-sm text-gray-900 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white")}>Manual</button>
                                                </div>
                                            </div>

                                            <Card className="border border-gray-100 dark:border-white/10 shadow-sm bg-white dark:bg-zinc-900 overflow-hidden rounded-2xl">
                                                <CardContent className="p-0">
                                                    {controlMode === 'auto' ? (
                                                        <div className="p-8 text-center space-y-2 bg-gradient-to-b from-indigo-50/50 dark:from-indigo-950/20 to-transparent">
                                                            <div className="w-10 h-10 bg-white dark:bg-zinc-800 rounded-xl shadow-sm flex items-center justify-center mx-auto text-indigo-500 dark:text-indigo-400 mb-3 border border-indigo-50 dark:border-indigo-900/30">
                                                                <Zap className="w-5 h-5 fill-indigo-100 dark:fill-indigo-900/40" />
                                                            </div>
                                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Gestión Inteligente</h4>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[250px] mx-auto leading-relaxed">
                                                                Visible automáticamente si el cliente tiene servicios de Paid Media o Social Media activos.
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="divide-y divide-gray-50 dark:divide-white/5">
                                                            {/* Master Toggle */}
                                                            <div className="p-4 flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors", isForceEnabled ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400" : "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500")}>
                                                                        <Settings2 className="w-4 h-4" />
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-sm font-medium text-gray-900 dark:text-white block">Mostrar Pestaña</span>
                                                                        <span className="text-[10px] text-gray-500 dark:text-gray-400">Habilitar vista en portal</span>
                                                                    </div>
                                                                </div>
                                                                <Switch checked={isForceEnabled} onCheckedChange={setIsForceEnabled} />
                                                            </div>

                                                            {/* Granular Permissions */}
                                                            <div className={cn("transition-all duration-300 bg-gray-50/30 dark:bg-zinc-950/20", isForceEnabled ? "opacity-100" : "opacity-40 pointer-events-none grayscale")}>
                                                                <div className="p-3 pl-14 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors">
                                                                    <div className="flex items-center gap-2">
                                                                        <BarChart3 className="w-4 h-4 text-blue-500" />
                                                                        <span className="text-xs font-medium text-gray-700 dark:text-zinc-300">Métricas de Ads</span>
                                                                    </div>
                                                                    <Switch
                                                                        checked={accessLevel === 'ALL' || accessLevel === 'ADS'}
                                                                        onCheckedChange={(c) => c ? setAccessLevel(accessLevel === 'ORGANIC' ? 'ALL' : 'ADS') : setAccessLevel(accessLevel === 'ALL' ? 'ORGANIC' : 'NONE')}
                                                                        className="scale-75"
                                                                    />
                                                                </div>
                                                                <div className="p-3 pl-14 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-zinc-800/40 transition-colors">
                                                                    <div className="flex items-center gap-2">
                                                                        <LayoutGrid className="w-4 h-4 text-brand-pink" />
                                                                        <span className="text-xs font-medium text-gray-700 dark:text-zinc-300">Feed Orgánico</span>
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
                                            <Button onClick={handleSavePortalPermissions} variant="outline" size="sm" className="w-full text-xs font-bold rounded-xl dark:bg-zinc-800 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-700">
                                                Actualizar Permisos
                                            </Button>
                                        </section>
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </div>

                        {/* Right: Preview Panel (Hidden on small, visible lg) */}
                        <div className="hidden lg:flex w-5/12 bg-gray-100 dark:bg-zinc-950/80 relative items-center justify-center p-8 border-l border-gray-100 dark:border-white/5">
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
                active ? "bg-white dark:bg-zinc-900 text-brand-pink dark:text-brand-pink shadow-sm ring-1 ring-black/5 dark:ring-white/10" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-zinc-800/50",
                disabled && "opacity-50 cursor-not-allowed"
            )}
        >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {badge && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-[9px] font-bold text-gray-500 dark:text-zinc-400">{badge}</span>}
        </TabsTrigger>
    )
}

