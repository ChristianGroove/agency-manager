"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Package, Users, Settings, Shield, LayoutGrid, AlertCircle, Building2, Key, Calendar, MapPin, Database, Loader2 } from "lucide-react"
import { getOrgManagerData } from "@/modules/core/admin/actions"
import { getOrganizationActiveModules, getAllSystemModules } from "@/modules/core/saas/module-management-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface OrgDetailsSheetProps {
    orgId: string | null
    isOpen: boolean
    onClose: () => void
}

export function OrgDetailsSheet({ orgId, isOpen, onClose }: OrgDetailsSheetProps) {
    const router = useRouter()

    // Data States
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [orgData, setOrgData] = useState<any>(null)
    const [users, setUsers] = useState<any[]>([])
    const [stats, setStats] = useState<any>(null)

    // Module States
    const [allModules, setAllModules] = useState<any[]>([])
    const [activeModules, setActiveModules] = useState<string[]>([])

    // Load initial data
    useEffect(() => {
        if (isOpen && orgId) {
            loadOrgData(orgId)
        } else {
            // Reset state when closed
            setOrgData(null)
            setUsers([])
            setStats(null)
        }
    }, [isOpen, orgId])

    const loadOrgData = async (id: string) => {
        setIsLoading(true)
        try {
            // Parallel Fetch
            const [managerData, sysModules, activeModuleKeys] = await Promise.all([
                getOrgManagerData(id),
                getAllSystemModules(),
                getOrganizationActiveModules(id)
            ])

            setOrgData(managerData.organization)
            setUsers(managerData.users)
            setStats(managerData.stats)
            setAllModules(sysModules || [])
            setActiveModules(activeModuleKeys || [])
        } catch (error: any) {
            toast.error("Error al cargar la organización", { description: error.message })
            onClose() // Auto-close on critical error
        } finally {
            setIsLoading(false)
        }
    }

    const handleModuleToggle = async (moduleKey: string, isCurrentlyEnabled: boolean) => {
        setIsSaving(true)
        try {
            // We simulate the module toggle natively to saas_app_modules 
            // In reality, organizations rely on active_app_id or manual_module_overrides.
            // But per previous fixes, if we change manual overrides it overrides global Space config.

            // To be safely implemented after modifying RPC/DB actions for Tenant Overrides.
            // For now, toggle visual state immediately and wait for backend.
            toast.info("Función de toggle temporalmente en desarrollo.")
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsSaving(false)
        }
    }

    if (!orgId) return null

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent
                side="right"
                className="
                    sm:max-w-[1000px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <div className="flex flex-col h-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-muted-foreground animate-pulse">Cargando detalles del Tenant...</p>
                        </div>
                    ) : orgData ? (
                        <>
                            {/* Header */}
                            <div className="sticky top-0 z-20 flex items-center justify-between shrink-0 px-8 py-6 bg-white/40 dark:bg-black/40 backdrop-blur-md border-b border-black/5 dark:border-white/5">
                                <div className="flex items-start gap-5">
                                    <div className="p-3.5 rounded-2xl shrink-0 shadow-sm bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                                        <Building2 className="h-8 w-8" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <SheetTitle className="text-3xl font-bold flex items-center gap-3">
                                            {orgData.name}
                                            <Badge variant={orgData.status === 'active' ? 'default' : 'destructive'} className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 h-6">
                                                {orgData.status}
                                            </Badge>
                                        </SheetTitle>
                                        <SheetDescription className="text-base flex items-center gap-2">
                                            <span className="font-mono bg-muted/50 px-2 py-0.5 rounded text-xs select-all">{orgData.slug}</span>
                                            <span>•</span>
                                            <span className="text-muted-foreground/80">
                                                ID: <span className="font-mono select-all text-xs">{orgData.id}</span>
                                            </span>
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
                                    <TabsList className="grid w-full max-w-2xl grid-cols-3 bg-muted/50 p-1 rounded-xl">
                                        <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                            Visión General
                                        </TabsTrigger>
                                        <TabsTrigger value="modules" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                            <Database className="h-4 w-4 mr-1.5" />
                                            Accesos y Módulos
                                        </TabsTrigger>
                                        <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                            <Shield className="h-4 w-4 mr-1.5" />
                                            Equipo & Seguridad
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                <ScrollArea className="flex-1">
                                    <div className="p-8 space-y-8 pb-24">
                                        {/* OVERVIEW TAB */}
                                        <TabsContent value="overview" className="space-y-8 mt-0 animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
                                            {/* KPIs Grid */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/10 dark:to-slate-900 border-indigo-100 dark:border-indigo-900/30 shadow-sm">
                                                    <CardContent className="p-5 flex flex-col gap-2">
                                                        <span className="text-xs text-indigo-900/60 dark:text-indigo-400/80 uppercase font-bold tracking-wider">Usuarios</span>
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                                                                <Users className="h-4 w-4" />
                                                            </div>
                                                            <span className="text-2xl font-bold text-indigo-950 dark:text-white">{stats?.users || 0}</span>
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/10 dark:to-slate-900 border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                                                    <CardContent className="p-5 flex flex-col gap-2">
                                                        <span className="text-xs text-emerald-900/60 dark:text-emerald-400/80 uppercase font-bold tracking-wider">Clientes (CRM)</span>
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                                                                <Users className="h-4 w-4" />
                                                            </div>
                                                            <span className="text-2xl font-bold text-emerald-950 dark:text-white">{stats?.clients || 0}</span>
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/10 dark:to-slate-900 border-purple-100 dark:border-purple-900/30 shadow-sm">
                                                    <CardContent className="p-5 flex flex-col gap-2">
                                                        <span className="text-xs text-purple-900/60 dark:text-purple-400/80 uppercase font-bold tracking-wider">Módulos</span>
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400">
                                                                <Package className="h-4 w-4" />
                                                            </div>
                                                            <span className="text-2xl font-bold text-purple-950 dark:text-white">{stats?.activeModules || 0}</span>
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/10 dark:to-slate-900 border-blue-100 dark:border-blue-900/30 shadow-sm">
                                                    <CardContent className="p-5 flex flex-col gap-2">
                                                        <span className="text-xs text-blue-900/60 dark:text-blue-400/80 uppercase font-bold tracking-wider">Plan (SaaS)</span>
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                                                                <LayoutGrid className="h-4 w-4" />
                                                            </div>
                                                            <span className="text-lg font-bold text-blue-950 dark:text-white truncate" title={orgData.base_app_slug}>
                                                                {orgData.base_app_slug || 'N/A'}
                                                            </span>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>

                                            {/* Extra Context */}
                                            <div className="grid grid-cols-2 gap-6">
                                                <Card className="border-border/50 shadow-sm bg-white/50 dark:bg-white/5">
                                                    <CardContent className="p-6">
                                                        <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">Detalles de Facturación</h3>
                                                        <div className="space-y-4 text-sm">
                                                            <div className="flex justify-between items-center py-2 border-b border-dashed">
                                                                <span className="text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" /> Próximo Cobro:</span>
                                                                <span className="font-semibold text-gray-900 dark:text-gray-100">{orgData.next_billing_date ? new Date(orgData.next_billing_date).toLocaleDateString() : 'Desconocido'}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-2 border-b border-dashed">
                                                                <span className="text-muted-foreground flex items-center gap-2"><Shield className="h-4 w-4" /> Nivel de Branding:</span>
                                                                <span className="font-semibold text-gray-900 dark:text-gray-100">{orgData.branding_tier_id || 'Estándar'}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-2">
                                                                <span className="text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4" /> Space Asignado (Template):</span>
                                                                <Badge variant="outline" className="font-mono bg-white dark:bg-black">{orgData.active_app_id || 'Ninguno'}</Badge>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                {/* Branding Tier Component would go here, imported if needed */}
                                                <div className="border border-dashed border-gray-300 dark:border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-gray-50/50 dark:bg-gray-900/50">
                                                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                                                        <Settings className="h-6 w-6 text-gray-400" />
                                                    </div>
                                                    <h4 className="font-medium text-gray-900 dark:text-white">Sección de Preferencias</h4>
                                                    <p className="text-sm text-gray-500 mt-1">Configuración de marca blanca disponible desde la pestaña de Configuración Superior.</p>
                                                </div>
                                            </div>
                                        </TabsContent>

                                        {/* MODULES TAB */}
                                        <TabsContent value="modules" className="space-y-6 mt-0 animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Accesos Otorgados</h3>
                                                    <p className="text-sm text-muted-foreground">Vista read-only de los módulos heredados según el Space del Tenant y overrides directos.</p>
                                                </div>
                                                <Button variant="outline" size="sm" onClick={() => router.push(`/platform/admin/apps`)}>
                                                    <Package className="mr-2 h-4 w-4" />
                                                    Modificar Space Maestro
                                                </Button>
                                            </div>

                                            <div className="grid gap-3">
                                                {allModules.map((sysModule) => {
                                                    const isEnabled = activeModules.includes(sysModule.key)

                                                    return (
                                                        <div key={sysModule.key} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isEnabled ? 'border-indigo-200 bg-indigo-50/30 dark:bg-indigo-900/10 dark:border-indigo-900/30' : 'border-gray-200 bg-white dark:bg-slate-900/50 dark:border-gray-800'}`}>
                                                            <div className="flex gap-4">
                                                                <div className={`p-2 rounded-lg h-min ${isEnabled ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                                                                    <Package className="h-5 w-5" />
                                                                </div>
                                                                <div>
                                                                    <div className="font-medium text-gray-900 dark:text-white">{sysModule.name}</div>
                                                                    <div className="text-xs text-muted-foreground mt-0.5 max-w-md">{sysModule.description || 'Sin descripción'}</div>
                                                                    <div className="flex gap-2 mt-2">
                                                                        <Badge variant="outline" className="text-[10px] uppercase font-mono bg-background/50">{sysModule.category}</Badge>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center ml-4 shrink-0 overflow-hidden">
                                                                {/* Only visual toggle for now, overrides require extra backend logic */}
                                                                <Switch
                                                                    checked={isEnabled}
                                                                    disabled={true}
                                                                />
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            {/* Info Box */}
                                            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30">
                                                <p className="text-sm text-blue-700 dark:text-blue-400 flex">
                                                    <AlertCircle className="h-5 w-5 mr-3 shrink-0 opacity-70" />
                                                    El acceso a módulos se gestiona a través de la plantilla "Space". Si deseas darle módulos extra a este cliente específico sin cambiar de Space, la opción estará disponible próximamente mediante "Overrides de Tenant".
                                                </p>
                                            </div>
                                        </TabsContent>

                                        {/* SECURITY & USERS TAB */}
                                        <TabsContent value="security" className="space-y-6 mt-0 animate-in fade-in-50 duration-500 slide-in-from-bottom-2">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                                                {/* Users List */}
                                                <div className="space-y-6">
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Miembros del Tenant</h3>
                                                        <p className="text-sm text-muted-foreground">Usuarios asociados con acceso autenticado a la plataforma.</p>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-900 border rounded-xl shadow-sm divide-y">
                                                        {users.length === 0 ? (
                                                            <div className="p-6 text-center text-muted-foreground">No hay usuarios</div>
                                                        ) : (
                                                            users.map((member: any) => (
                                                                <div key={member.user_id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                                        <div className="h-10 w-10 shrink-0 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold shadow-inner">
                                                                            {member.user.email?.charAt(0).toUpperCase() || '?'}
                                                                        </div>
                                                                        <div className="truncate">
                                                                            <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{member.user.email}</div>
                                                                            <div className="text-xs text-muted-foreground capitalize">{member.role}</div>
                                                                        </div>
                                                                    </div>
                                                                    {orgData.owner_id === member.user_id && (
                                                                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-0 dark:bg-amber-900/30 dark:text-amber-400 shrink-0 ml-2">Dueño</Badge>
                                                                    )}
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Auditoría SuperAdmin</h3>
                                                        <p className="text-sm text-muted-foreground">Acciones críticas de seguridad.</p>
                                                    </div>

                                                    <Card className="border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-900/10 shadow-none">
                                                        <CardContent className="p-5 flex flex-col gap-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-red-100 text-red-600 rounded-lg dark:bg-red-900/50 dark:text-red-400">
                                                                    <Key className="h-5 w-5" />
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-medium text-red-900 dark:text-red-300">Forzar Cierre de Sesión</h4>
                                                                    <p className="text-xs text-red-700/70 dark:text-red-400/70">Invalida los tokens de todos los dispositivos de los miembros.</p>
                                                                </div>
                                                            </div>
                                                            <Button variant="destructive" className="w-full mt-2" onClick={() => {
                                                                toast.info("Pronto se unificará esta acción a Auth Admin.")
                                                            }}>
                                                                Destruir Sesiones Activas
                                                            </Button>
                                                        </CardContent>
                                                    </Card>
                                                </div>

                                            </div>
                                        </TabsContent>
                                    </div>
                                </ScrollArea>
                            </Tabs>
                        </>
                    ) : null}
                </div>
            </SheetContent>
        </Sheet>
    )
}
