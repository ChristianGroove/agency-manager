"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Package, Users, DollarSign, Settings, Save, Loader2, AlertCircle, LayoutGrid, CheckCircle2, Globe, ChevronUp, ChevronDown } from "lucide-react"
import { updateApp } from "@/modules/core/saas/app-management-actions"
import { getAppPortalConfig, updateAppPortalModule, reorderAppPortalModules } from "@/modules/core/saas/portal-config-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface AppDetailsSheetProps {
    app: any | null
    isOpen: boolean
    onClose: () => void
    dict: any
}

export function AppDetailsSheet({ app, isOpen, onClose, dict }: AppDetailsSheetProps) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [portalModules, setPortalModules] = useState<any[]>([])
    const [portalLoading, setPortalLoading] = useState(false)

    // Fetch portal modules when sheet opens
    useEffect(() => {
        if (isOpen && app?.id) {
            setPortalLoading(true)
            getAppPortalConfig(app.id)
                .then(modules => setPortalModules(modules || []))
                .catch(console.error)
                .finally(() => setPortalLoading(false))
        }
    }, [isOpen, app?.id])

    // Reorder handler
    const handleReorder = async (moduleId: string, direction: 'up' | 'down', targetPortal: string) => {
        const filtered = portalModules.filter(m => m.target_portal === targetPortal).sort((a, b) => a.display_order - b.display_order)
        const idx = filtered.findIndex(m => m.id === moduleId)
        if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === filtered.length - 1)) return

        const swapIdx = direction === 'up' ? idx - 1 : idx + 1
        const updates = [
            { id: filtered[idx].id, display_order: filtered[swapIdx].display_order },
            { id: filtered[swapIdx].id, display_order: filtered[idx].display_order }
        ]

        const result = await reorderAppPortalModules(updates)
        if (result.success) {
            setPortalModules(prev => prev.map(m => {
                const update = updates.find(u => u.id === m.id)
                return update ? { ...m, display_order: update.display_order } : m
            }))
            toast.success("Orden actualizado")
        } else {
            toast.error("Error al reordenar")
        }
    }

    if (!app) return null

    const monthlyRevenue = (app.active_org_count || 0) * Number(app.price_monthly)

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)

        const formData = new FormData(e.currentTarget)

        try {
            const updates = {
                name: formData.get('name') as string,
                description: formData.get('description') as string,
                category: formData.get('category') as string,
                price_monthly: parseFloat(formData.get('price_monthly') as string),
                color: formData.get('color') as string,
                is_active: formData.get('is_active') === 'true'
            }

            const result = await updateApp(app.id, updates)

            if (result.success) {
                toast.success(dict.toast?.updated || "Aplicación actualizada", {
                    description: `Los cambios en "${updates.name}" han sido guardados.`
                })
                router.refresh()
                // Optionally close sheet, but maybe user wants to continue editing
                onClose()
            } else {
                toast.error("Error al actualizar", {
                    description: result.error || "Inténtalo de nuevo"
                })
            }
        } catch (error: any) {
            toast.error("Error inesperado", {
                description: error.message
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent
                side="right"
                className="
                    sm:max-w-[900px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <div className="flex flex-col h-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl">
                    {/* Header */}
                    <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-8 py-6 bg-white/40 dark:bg-black/40 backdrop-blur-md border-b border-black/5 dark:border-white/5">
                        <div className="flex items-start gap-5">
                            <div
                                className="p-3.5 rounded-2xl shrink-0 shadow-sm"
                                style={{ backgroundColor: `${app.color}15`, color: app.color }}
                            >
                                <Package className="h-8 w-8" />
                            </div>
                            <div className="space-y-1.5">
                                <SheetTitle className="text-3xl font-bold flex items-center gap-3">
                                    {app.name}
                                    {app.is_active ? (
                                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 h-6">
                                            Active
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 h-6">
                                            Inactive
                                        </Badge>
                                    )}
                                </SheetTitle>
                                <SheetDescription className="text-base line-clamp-2 max-w-lg">
                                    {app.description}
                                </SheetDescription>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => onClose()} className="rounded-full hover:bg-black/5 dark:hover:bg-white/10 h-10 w-10">
                            <LayoutGrid className="h-5 w-5 opacity-50" />
                            <span className="sr-only">Cerrar</span>
                        </Button>
                    </div>

                    <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-8 pt-6 pb-2">
                            <TabsList className="grid w-full max-w-md grid-cols-3 bg-muted/50 p-1 rounded-xl">
                                <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Resumen</TabsTrigger>
                                <TabsTrigger value="portal" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                    <Globe className="h-4 w-4 mr-1.5" />
                                    Portal
                                </TabsTrigger>
                                <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Config</TabsTrigger>
                            </TabsList>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-8 space-y-8 pb-24">
                                {/* OVERVIEW TAB */}
                                <TabsContent value="overview" className="space-y-8 mt-0 animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-2 gap-6">
                                        <Card className="border-border/50 shadow-sm bg-white/50 dark:bg-white/5">
                                            <CardContent className="p-6 flex flex-col gap-2">
                                                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Organizaciones Activas</span>
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                                                        <Users className="h-5 w-5" />
                                                    </div>
                                                    <span className="text-3xl font-bold">{app.active_org_count || 0}</span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                        <Card className="border-border/50 shadow-sm bg-white/50 dark:bg-white/5">
                                            <CardContent className="p-6 flex flex-col gap-2">
                                                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Revenue Mensual Recurrente</span>
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                                                        <DollarSign className="h-5 w-5" />
                                                    </div>
                                                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                                        ${monthlyRevenue.toFixed(2)}
                                                    </span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Included Modules */}
                                    <div>
                                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                                            <LayoutGrid className="h-5 w-5 text-gray-400" />
                                            Módulos Incluidos ({app.modules?.length || 0})
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {app.modules?.map((module: any) => (
                                                <div key={module.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-white/60 dark:bg-white/5 hover:bg-white/80 transition-colors">
                                                    <div className="font-medium text-base">{module.module_key}</div>
                                                    <div className="flex gap-2">
                                                        {module.is_core && <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-600">Core</Badge>}
                                                        {module.auto_enable && <Badge variant="outline" className="text-[10px] border-blue-200 text-blue-600 bg-blue-50">Auto</Badge>}
                                                    </div>
                                                </div>
                                            ))}
                                            {(!app.modules || app.modules.length === 0) && (
                                                <div className="col-span-2 p-8 text-center rounded-xl border border-dashed border-gray-200">
                                                    <p className="text-muted-foreground italic">No hay módulos configurados para esta aplicación.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Recomended Addons */}
                                    {app.recommended_add_ons && app.recommended_add_ons.length > 0 && (
                                        <div>
                                            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Add-ons Recomendados</h3>
                                            <div className="grid grid-cols-1 gap-3">
                                                {app.recommended_add_ons.map((addon: any) => (
                                                    <div key={addon.id} className="flex items-center justify-between p-4 rounded-xl border border-amber-100 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-900/30">
                                                        <span className="font-medium capitalize text-amber-900 dark:text-amber-100">{addon.add_on_type}</span>
                                                        {addon.discount_percent > 0 && (
                                                            <Badge className="bg-white text-emerald-700 shadow-sm border-0">
                                                                AHORRA {addon.discount_percent}%
                                                            </Badge>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </TabsContent>

                                {/* PORTAL TAB */}
                                <TabsContent value="portal" className="space-y-6 mt-0 animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
                                    <div className="space-y-6">
                                        {/* Header */}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Módulos del Portal</h3>
                                                <p className="text-sm text-muted-foreground">Configura qué módulos estarán disponibles en el portal de esta aplicación.</p>
                                            </div>
                                        </div>

                                        {portalLoading ? (
                                            <div className="flex items-center justify-center py-12">
                                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                            </div>
                                        ) : portalModules.length === 0 ? (
                                            <div className="text-center py-12 border-2 border-dashed rounded-xl">
                                                <Globe className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                                                <p className="text-muted-foreground">No hay módulos configurados.</p>
                                                <p className="text-sm text-muted-foreground/70 mt-1">Los módulos se heredarán de la configuración por defecto.</p>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Client Portal Modules */}
                                                {portalModules.filter(m => m.target_portal === 'client').length > 0 && (
                                                    <div className="space-y-3">
                                                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                            <Users className="h-4 w-4" />
                                                            Portal de Cliente
                                                        </h4>
                                                        <div className="space-y-2">
                                                            {portalModules
                                                                .filter(m => m.target_portal === 'client')
                                                                .sort((a, b) => a.display_order - b.display_order)
                                                                .map((module, idx, arr) => (
                                                                    <div
                                                                        key={module.id}
                                                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${module.is_enabled ? 'border-emerald-200 bg-emerald-50/30 dark:bg-emerald-900/10' : 'border-gray-200 bg-gray-50/50 dark:bg-gray-900/20'}`}
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="flex flex-col gap-0.5">
                                                                                <button
                                                                                    onClick={() => handleReorder(module.id, 'up', 'client')}
                                                                                    disabled={idx === 0}
                                                                                    className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                                                >
                                                                                    <ChevronUp className="h-3 w-3" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleReorder(module.id, 'down', 'client')}
                                                                                    disabled={idx === arr.length - 1}
                                                                                    className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                                                >
                                                                                    <ChevronDown className="h-3 w-3" />
                                                                                </button>
                                                                            </div>
                                                                            <div>
                                                                                <div className="font-medium">{module.portal_tab_label}</div>
                                                                                <div className="text-xs text-muted-foreground font-mono">{module.module_slug}</div>
                                                                            </div>
                                                                        </div>
                                                                        <Switch
                                                                            checked={module.is_enabled}
                                                                            onCheckedChange={async (checked) => {
                                                                                const result = await updateAppPortalModule(module.id, { is_enabled: checked })
                                                                                if (result.success) {
                                                                                    setPortalModules(prev => prev.map(m => m.id === module.id ? { ...m, is_enabled: checked } : m))
                                                                                    toast.success(checked ? "Módulo activado" : "Módulo desactivado")
                                                                                } else {
                                                                                    toast.error("Error al actualizar")
                                                                                }
                                                                            }}
                                                                        />
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Staff Portal Modules */}
                                                {portalModules.filter(m => m.target_portal === 'staff').length > 0 && (
                                                    <div className="space-y-3 pt-4 border-t">
                                                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                            <Package className="h-4 w-4" />
                                                            Portal de Staff
                                                        </h4>
                                                        <div className="space-y-2">
                                                            {portalModules
                                                                .filter(m => m.target_portal === 'staff')
                                                                .sort((a, b) => a.display_order - b.display_order)
                                                                .map((module, idx, arr) => (
                                                                    <div
                                                                        key={module.id}
                                                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${module.is_enabled ? 'border-blue-200 bg-blue-50/30 dark:bg-blue-900/10' : 'border-gray-200 bg-gray-50/50 dark:bg-gray-900/20'}`}
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="flex flex-col gap-0.5">
                                                                                <button
                                                                                    onClick={() => handleReorder(module.id, 'up', 'staff')}
                                                                                    disabled={idx === 0}
                                                                                    className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                                                >
                                                                                    <ChevronUp className="h-3 w-3" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleReorder(module.id, 'down', 'staff')}
                                                                                    disabled={idx === arr.length - 1}
                                                                                    className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                                                >
                                                                                    <ChevronDown className="h-3 w-3" />
                                                                                </button>
                                                                            </div>
                                                                            <div>
                                                                                <div className="font-medium">{module.portal_tab_label}</div>
                                                                                <div className="text-xs text-muted-foreground font-mono">{module.module_slug}</div>
                                                                            </div>
                                                                        </div>
                                                                        <Switch
                                                                            checked={module.is_enabled}
                                                                            onCheckedChange={async (checked) => {
                                                                                const result = await updateAppPortalModule(module.id, { is_enabled: checked })
                                                                                if (result.success) {
                                                                                    setPortalModules(prev => prev.map(m => m.id === module.id ? { ...m, is_enabled: checked } : m))
                                                                                    toast.success(checked ? "Módulo activado" : "Módulo desactivado")
                                                                                } else {
                                                                                    toast.error("Error al actualizar")
                                                                                }
                                                                            }}
                                                                        />
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Info Box */}
                                        <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30">
                                            <p className="text-sm text-blue-700 dark:text-blue-400">
                                                <strong>💡 Tip:</strong> Los módulos desactivados no aparecerán en el portal de los clientes que usen esta aplicación.
                                            </p>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* SETTINGS TAB */}
                                <TabsContent value="settings" className="space-y-6 mt-0 animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                        <div className="lg:col-span-2 space-y-6">
                                            <Card className="border-none shadow-none bg-transparent p-0">
                                                <CardContent className="p-0 space-y-6">
                                                    <form id="edit-app-form" onSubmit={handleUpdate} className="space-y-6">
                                                        <div className="space-y-3">
                                                            <Label htmlFor="name" className="text-base font-semibold">Nombre de Aplicación</Label>
                                                            <Input id="name" name="name" defaultValue={app.name} required className="h-12 text-lg" />
                                                            <p className="text-sm text-muted-foreground">Este es el nombre público que verán los clientes.</p>
                                                        </div>

                                                        <div className="space-y-3">
                                                            <Label htmlFor="description" className="text-base font-semibold">Descripción Corta</Label>
                                                            <Textarea id="description" name="description" defaultValue={app.description} rows={3} required className="resize-none text-base" />
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-6">
                                                            <div className="space-y-3">
                                                                <Label htmlFor="category" className="text-base font-semibold">Categoría</Label>
                                                                <Input id="category" name="category" defaultValue={app.category} required className="h-11" />
                                                            </div>
                                                            <div className="space-y-3">
                                                                <Label htmlFor="price_monthly" className="text-base font-semibold">Precio Mensual</Label>
                                                                <div className="relative">
                                                                    <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                                                    <Input id="price_monthly" name="price_monthly" type="number" step="0.01" defaultValue={app.price_monthly} required className="pl-7 h-11" />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-3">
                                                            <Label className="text-base font-semibold">Color de Marca</Label>
                                                            <div className="flex items-center gap-4 p-4 rounded-xl border bg-white/50">
                                                                <Input name="color" type="color" defaultValue={app.color} className="w-16 h-16 p-1 rounded-lg cursor-pointer" />
                                                                <div className="space-y-1">
                                                                    <p className="font-medium text-sm">Color Hexadecimal</p>
                                                                    <Input defaultValue={app.color} className="font-mono uppercase h-9 w-32" readOnly />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4 pt-4 border-t border-dashed">
                                                            <Label className="text-base font-semibold">Disponibilidad</Label>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${app.is_active ? 'border-emerald-500 bg-emerald-50/50' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}>
                                                                    <input type="radio" name="is_active" value="true" defaultChecked={app.is_active} className="h-5 w-5 text-emerald-600" />
                                                                    <div>
                                                                        <div className="font-bold text-gray-900">Activa</div>
                                                                        <div className="text-xs text-gray-500">Visible para clientes</div>
                                                                    </div>
                                                                </label>
                                                                <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${!app.is_active ? 'border-slate-500 bg-slate-50/50' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}>
                                                                    <input type="radio" name="is_active" value="false" defaultChecked={!app.is_active} className="h-5 w-5 text-slate-600" />
                                                                    <div>
                                                                        <div className="font-bold text-gray-900">Inactiva</div>
                                                                        <div className="text-xs text-gray-500">Oculta del catálogo</div>
                                                                    </div>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </form>
                                                </CardContent>
                                            </Card>
                                        </div>

                                        {/* Tips Sidebar */}
                                        <div className="space-y-6">
                                            <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30">
                                                <h4 className="font-bold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                                                    <AlertCircle className="h-4 w-4" />
                                                    Consejo Pro
                                                </h4>
                                                <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed">
                                                    Cambiar el precio no afectará a las suscripciones existentes inmediatamente, pero se aplicará a nuevas altas y renovaciones futuras.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-8 pb-8">
                                        <Button type="submit" form="edit-app-form" disabled={isSubmitting} size="lg" className="px-8 shadow-lg shadow-primary/20">
                                            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                                            Guardar Cambios
                                        </Button>
                                    </div>
                                </TabsContent>
                            </div>
                        </ScrollArea>
                    </Tabs>
                </div>
            </SheetContent>
        </Sheet>
    )
}
