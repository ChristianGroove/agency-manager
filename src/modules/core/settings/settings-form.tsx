"use client"

import { PaymentMethodsManager } from "./payment-methods-manager"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
// import { TrashBinSettings } from "./trash-bin-settings"
import { EmittersSettings } from "./emitters-settings"
import { isEmittersModuleEnabled } from "@/lib/flags"
import { Loader2, Save, CreditCard, FileText, Building2, Globe, Layout, Palette, Eye, MessageSquare, LayoutTemplate, Users, AlertTriangle, Lock, Shield } from "lucide-react"
import { COMMUNICATION_VARIABLES, DEFAULT_TEMPLATES } from "@/lib/communication-utils"
import { useEffect } from "react"
import { SplitText } from "@/components/ui/split-text"
import { getSettings, updateSettings } from "@/modules/core/settings/actions"
import { BrandingConfig } from "@/modules/core/branding/actions"
import { BrandCenterSheet } from "@/modules/core/branding/components/brand-center-sheet"
import { OrganizationRole } from "@/lib/auth/org-roles"

import { TeamSettingsTab } from "./team-settings-tab"
import { EmailLogsTable } from "@/modules/core/notifications/components/email-logs-table"
import { Bell } from "lucide-react"
import { BiometricButton } from "@/components/auth/biometric-button"

import { SubscriptionSettingsTab } from "./subscription-settings-tab"
import { SaasApp } from "@/modules/core/saas/app-management-actions"
import { VaultSettingsTab } from "@/modules/core/data-vault/components/vault-settings-tab"
import { DataSnapshot } from "@/modules/core/data-vault/types"

interface SettingsFormProps {
    initialSettings: any
    activeModules: string[]
    subscriptionApp?: SaasApp | null
    brandingSettings?: BrandingConfig
    tierFeatures?: Record<string, any>
    userRole: OrganizationRole
    snapshots: DataSnapshot[]
    vaultConfig: { enabled: boolean, frequency: 'daily' | 'weekly' | 'monthly' }
}

export function SettingsForm({ initialSettings, activeModules, subscriptionApp, brandingSettings, tierFeatures = {}, userRole, snapshots, vaultConfig }: SettingsFormProps) {
    // ... existing code ...

    // ADD LOCAL STATE FOR SUBSCRIPTION APP (Optional, mostly passed down)
    // No need for state if it's display only.

    // ... inside TABS_CONFIG

    // ...

    // ... inside TabsContent render
    {/* SUBSCRIPTION TAB */ }
    <TabsContent value="subscription" className="space-y-4 mt-4">
        <SubscriptionSettingsTab app={subscriptionApp || null} />
    </TabsContent>

    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState(initialSettings || {})

    // Local UI Settings State
    const [showMarqueeLocal, setShowMarqueeLocal] = useState(false)
    const [showBrandCenter, setShowBrandCenter] = useState(false)

    useEffect(() => {
        // Load local setting on mount
        const stored = localStorage.getItem("ui_settings_tools_marquee")
        if (stored !== null) {
            setShowMarqueeLocal(stored === "true")
        }
    }, [])

    const handleMarqueeChange = (checked: boolean) => {
        setShowMarqueeLocal(checked)
        localStorage.setItem("ui_settings_tools_marquee", String(checked))
        // Dispatch custom event for real-time updates
        window.dispatchEvent(new Event("ui-settings-changed"))
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData((prev: any) => ({ ...prev, [name]: value }))
    }

    const handleSelectChange = (name: string, value: string) => {
        setFormData((prev: any) => ({ ...prev, [name]: value }))
    }

    const handleSwitchChange = (name: string, checked: boolean) => {
        setFormData((prev: any) => ({ ...prev, [name]: checked }))
    }

    const handleModuleChange = (moduleName: string, checked: boolean) => {
        setFormData((prev: any) => ({
            ...prev,
            portal_modules: {
                ...prev.portal_modules,
                [moduleName]: checked
            }
        }))
    }

    const handleTemplateChange = (key: string, value: string) => {
        setFormData((prev: any) => ({
            ...prev,
            comm_templates: {
                ...prev.comm_templates,
                [key]: value
            }
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const result = await updateSettings(formData)
            if (result.error) {
                alert("Error al guardar: " + result.error)
            } else {
                alert("Configuración guardada correctamente")
                router.refresh()
            }
        } catch (error) {
            console.error(error)
            alert("Ocurrió un error inesperado")
        } finally {
            setIsLoading(false)
        }
    }

    // ============================================
    // DYNAMIC TABS CONFIGURATION
    // ============================================

    interface SettingsTab {
        id: string
        label: string
        icon: any
        requiredModule?: string | null
        requiredModules?: string[]
        matchAny?: boolean
        isCore?: boolean
        minRole?: OrganizationRole
        featureFlag?: () => boolean
        customCheck?: (modules: string[]) => boolean
    }

    const TABS_CONFIG: SettingsTab[] = [

        {
            id: 'subscription',
            label: 'Suscripción',
            icon: CreditCard,
            requiredModule: null,
            isCore: true
        },
        {
            id: 'vault',
            label: 'Seguridad',
            icon: Shield,
            minRole: 'owner',
            isCore: true
        },
        {
            id: 'team',
            label: 'Equipo',
            icon: Users,
            requiredModule: null,
            isCore: true,
            minRole: 'admin'
        },
        {
            id: 'general',
            label: 'General',
            icon: Globe,
            requiredModule: null,
            isCore: true,
            minRole: 'member'
        },
        {
            id: 'notifications',
            label: 'Notificaciones',
            icon: Bell,
            requiredModule: 'module_communications',
            matchAny: true,
            minRole: 'member'
        },
        {
            id: 'billing',
            label: 'Facturación',
            icon: FileText,
            requiredModule: 'module_invoicing',
            minRole: 'admin'
        },

        {
            id: 'payments',
            label: 'Pagos',
            icon: CreditCard,
            requiredModules: ['module_payments', 'module_invoicing'],
            matchAny: true,
            minRole: 'admin'
        },
        {
            id: 'portal',
            label: 'Portal',
            icon: Layout,
            requiredModule: null,
            customCheck: (modules: string[]) => modules.some(m => m.startsWith('module_') || m.startsWith('core_'))
        },
        {
            id: 'communication',
            label: 'Comms',
            icon: MessageSquare,
            requiredModules: ['module_communications', 'module_invoicing'],
            matchAny: true
        },
        {
            id: 'interface',
            label: 'Interfaz',
            icon: LayoutTemplate,
            requiredModule: null,
            isCore: true
        }
    ]

    const getVisibleTabs = (activeModules: string[]) => {
        return TABS_CONFIG.filter(tab => {
            // 1. RBAC Check
            if (tab.minRole) {
                if (tab.minRole === 'admin' && userRole === 'member') return false
                if (tab.minRole === 'owner' && userRole !== 'owner') return false
            }

            // Always show core tabs (subject to RBAC above)
            if (tab.isCore) return true

            // Check feature flag if exists
            if (tab.featureFlag && !tab.featureFlag()) return false

            // Custom check function
            if (tab.customCheck) return tab.customCheck(activeModules)

            // Single required module
            if (tab.requiredModule) {
                return activeModules.includes(tab.requiredModule)
            }

            // Multiple required modules
            if (tab.requiredModules) {
                if (tab.matchAny) {
                    return tab.requiredModules.some((m: string) => activeModules.includes(m))
                } else {
                    return tab.requiredModules.every((m: string) => activeModules.includes(m))
                }
            }

            return true
        })
    }

    const visibleTabs = getVisibleTabs(activeModules)

    return (
        <div className="space-y-6">
            {brandingSettings && (
                <BrandCenterSheet
                    open={showBrandCenter}
                    onOpenChange={setShowBrandCenter}
                    settings={brandingSettings}
                    tierFeatures={tierFeatures}
                />
            )}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        <SplitText>Configuración</SplitText>
                    </h2>
                    <p className="text-muted-foreground">Administra los datos de tu negocio y preferencias globales.</p>
                </div>
                {userRole !== 'member' && (
                    <Button onClick={handleSubmit} disabled={isLoading} className="bg-brand-pink hover:bg-brand-pink/90">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Guardar Cambios
                    </Button>
                )}
            </div>

            <Tabs defaultValue={visibleTabs[0]?.id || 'general'} className="w-full" suppressHydrationWarning>
                <TabsList
                    className="grid w-full max-w-full bg-gray-100/50 dark:bg-white/5 p-1 backdrop-blur-sm border border-gray-200/50 dark:border-white/10"
                    style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}
                    suppressHydrationWarning
                >
                    {visibleTabs.map(tab => {
                        const Icon = tab.icon
                        return (
                            <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm transition-all"
                                suppressHydrationWarning
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </TabsTrigger>
                        )
                    })}
                </TabsList>

                {/* TEAM TAB */}
                <TabsContent value="team" className="space-y-4 mt-4" suppressHydrationWarning>
                    <TeamSettingsTab />
                </TabsContent>

                {/* VAULT TAB */}
                <TabsContent value="vault" className="space-y-4 mt-4" suppressHydrationWarning>
                    <VaultSettingsTab snapshots={snapshots || []} initialConfig={vaultConfig} />
                </TabsContent>



                {/* GENERAL TAB */}
                <TabsContent value="general" className="space-y-4 mt-4" suppressHydrationWarning>
                    <Card className="bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 shadow-sm backdrop-blur-md">
                        <CardHeader>
                            <CardTitle>Configuración Regional y Legal</CardTitle>
                            <CardDescription>
                                Define los formatos y textos legales predeterminados.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Identity Section (Read Only) */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-medium">Identidad de la Marca</h3>
                                    {userRole !== 'member' && (
                                        <Button
                                            variant="outline"
                                            className="border-blue-200 text-blue-700 hover:bg-blue-100"
                                            onClick={() => setShowBrandCenter(true)}
                                        >
                                            Abrir Centro de Marca
                                        </Button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Nombre Comercial</Label>
                                        <Input value={formData.agency_name || ''} disabled className="bg-muted" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground">Sitio Web</Label>
                                        <Input value={formData.agency_website || ''} disabled className="bg-muted" />
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground bg-blue-50/50 dark:bg-blue-500/10 p-2 rounded border border-blue-100/50 dark:border-blue-500/20">
                                    <Building2 className="inline h-3 w-3 mr-1 text-blue-600 dark:text-blue-400" />
                                    Estos datos se sincronizan automáticamente con el Centro de Marca.
                                </p>
                            </div>

                            <div className="h-px bg-border my-2" />

                            {/* Contact Info */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Información de Contacto</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="agency_email">Email Administrativo</Label>
                                        <Input id="agency_email" name="agency_email" value={formData.agency_email || ''} onChange={handleChange} placeholder="contacto@pixy.com" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="agency_phone">Teléfono / WhatsApp</Label>
                                        <Input id="agency_phone" name="agency_phone" value={formData.agency_phone || ''} onChange={handleChange} placeholder="+57 300 123 4567" />
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-border my-2" />

                            {/* Regional Settings */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Configuración Regional</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="agency_country">País</Label>
                                        <Input id="agency_country" name="agency_country" value={formData.agency_country || ''} onChange={handleChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="agency_currency">Moneda Base</Label>
                                        <Select name="agency_currency" value={formData.agency_currency || 'COP'} onValueChange={(val) => handleSelectChange('agency_currency', val)}>
                                            <SelectTrigger suppressHydrationWarning>
                                                <SelectValue placeholder="Seleccionar" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="COP">COP (Peso Colombiano)</SelectItem>
                                                <SelectItem value="USD">USD (Dólar Americano)</SelectItem>
                                                <SelectItem value="EUR">EUR (Euro)</SelectItem>
                                                <SelectItem value="MXN">MXN (Peso Mexicano)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="agency_timezone">Zona Horaria</Label>
                                        <Input id="agency_timezone" name="agency_timezone" value={formData.agency_timezone || ''} onChange={handleChange} />
                                    </div>
                                </div>
                            </div>

                            <div className="h-px bg-border my-2" />

                            <h3 className="text-lg font-medium">Preferencias del Sistema</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="default_language">Idioma de la App</Label>
                                    <Select name="default_language" value={formData.default_language || 'es'} onValueChange={(val) => handleSelectChange('default_language', val)}>
                                        <SelectTrigger suppressHydrationWarning>
                                            <SelectValue placeholder="Seleccionar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="es">Español</SelectItem>
                                            <SelectItem value="en">English</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="portal_language">Idioma del Portal</Label>
                                    <Select name="portal_language" value={formData.portal_language || 'es'} onValueChange={(val) => handleSelectChange('portal_language', val)}>
                                        <SelectTrigger suppressHydrationWarning>
                                            <SelectValue placeholder="Seleccionar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="es">Español</SelectItem>
                                            <SelectItem value="en">English</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="date_format">Formato de Fecha</Label>
                                    <Select name="date_format" value={formData.date_format || 'DD/MM/YYYY'} onValueChange={(val) => handleSelectChange('date_format', val)}>
                                        <SelectTrigger suppressHydrationWarning>
                                            <SelectValue placeholder="Seleccionar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</SelectItem>
                                            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</SelectItem>
                                            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="currency_format">Formato de Moneda</Label>
                                    <Select name="currency_format" value={formData.currency_format || 'es-CO'} onValueChange={(val) => handleSelectChange('currency_format', val)}>
                                        <SelectTrigger suppressHydrationWarning>
                                            <SelectValue placeholder="Seleccionar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="es-CO">Colombia ($ 1.000.000)</SelectItem>
                                            <SelectItem value="en-US">USA ($1,000,000.00)</SelectItem>
                                            <SelectItem value="es-MX">México ($ 1,000,000.00)</SelectItem>
                                            <SelectItem value="de-DE">Europa (1.000.000,00 €)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="legal_text">Texto Legal Predeterminado</Label>
                                <Textarea
                                    id="legal_text"
                                    name="legal_text"
                                    value={formData.legal_text || ''}
                                    onChange={handleChange}
                                    placeholder="Términos y condiciones que aparecerán en el pie de página de documentos de cobro..."
                                    className="min-h-[100px]"
                                />
                            </div>

                            <div className="space-y-2 pt-4 border-t dark:border-white/10">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Accesibilidad</h4>
                                <div className="space-y-2">
                                    <Label htmlFor="trash_shortcut">Atajo de Papelera</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="trash_shortcut"
                                            name="trash_shortcut"
                                            value={formData.trash_shortcut || 'ctrl+alt+p'}
                                            onChange={handleChange}
                                            placeholder="ej: ctrl+alt+p"
                                            className="max-w-[200px]"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Combinación de teclas para abrir la papelera (ej: ctrl+alt+p, meta+k, shift+delete).
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* NOTIFICATIONS TAB */}
                <TabsContent value="notifications" className="space-y-4 mt-4" suppressHydrationWarning>
                    <Card className="bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 shadow-sm backdrop-blur-md">
                        <CardHeader>
                            <CardTitle>Configuración de Correo</CardTitle>
                            <CardDescription>
                                Personaliza cómo tus clientes reciben las notificaciones por correo electrónico.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email_sender_name">Nombre del Remitente</Label>
                                    <Input
                                        id="email_sender_name"
                                        name="email_sender_name"
                                        value={formData.email_sender_name || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: Mi Agencia (Vía Pixy)"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        El nombre que verán los clientes en su bandeja de entrada.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email_reply_to">Correo de Respuesta (Reply-To)</Label>
                                    <Input
                                        id="email_reply_to"
                                        name="email_reply_to"
                                        value={formData.email_reply_to || ''}
                                        onChange={handleChange}
                                        placeholder="soporte@miagencia.com"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Si el cliente responde al correo, le llegará a esta dirección.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Registro de Actividad</CardTitle>
                            <CardDescription>
                                Monitorea los correos transaccionales enviados por el sistema.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <EmailLogsTable />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* BILLING TAB */}
                <TabsContent value="billing" className="space-y-6 mt-4" suppressHydrationWarning>

                    {/* EMITTERS SECTION - Moved here by user request */}
                    <div>
                        <EmittersSettings />
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Configuración General de Documentos</span>
                        </div>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Preferencias de Facturación</CardTitle>
                            <CardDescription>
                                Controla los valores predeterminados para tus nuevos documentos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="invoice_prefix">Prefijo de Documentos</Label>
                                    <Input id="invoice_prefix" name="invoice_prefix" value={formData.invoice_prefix || 'INV-'} onChange={handleChange} placeholder="INV-" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="default_due_days">Días de Vencimiento (Default)</Label>
                                    <Input type="number" id="default_due_days" name="default_due_days" value={formData.default_due_days || 30} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="default_tax_name">Nombre del Impuesto</Label>
                                    <Input id="default_tax_name" name="default_tax_name" value={formData.default_tax_name || 'IVA'} onChange={handleChange} placeholder="IVA" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="default_tax_rate">Tasa de Impuesto (%)</Label>
                                    <Input type="number" id="default_tax_rate" name="default_tax_rate" value={formData.default_tax_rate || 0} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invoice_legal_text">Pie de Página de Factura (Legal)</Label>
                                <Textarea
                                    id="invoice_legal_text"
                                    name="invoice_legal_text"
                                    value={formData.invoice_legal_text || ''}
                                    onChange={handleChange}
                                    placeholder="Texto legal específico para documentos (ej: Resolución...)"
                                    className="min-h-[100px]"
                                />
                            </div>
                        </CardContent>
                    </Card>


                </TabsContent>

                {/* PAYMENTS TAB */}
                <TabsContent value="payments" className="space-y-4 mt-4" suppressHydrationWarning>
                    <PaymentMethodsManager />

                    <Card>
                        <CardHeader>
                            <CardTitle>Control de Pagos en Línea</CardTitle>
                            <CardDescription>
                                Configura el comportamiento del portal de pagos y la integración con Wompi.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col gap-4 p-4 border dark:border-white/10 rounded-lg bg-muted/20 dark:bg-white/5">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Habilitar Pagos en el Portal</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Si se desactiva, los clientes verán sus cuentas de cobro pero no podrán pagar en línea.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formData.enable_portal_payments !== false}
                                        onCheckedChange={(checked) => handleSwitchChange('enable_portal_payments', checked)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Permitir Pago Múltiple</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Permite a los clientes seleccionar y pagar varios documentos en una sola transacción.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formData.enable_multi_invoice_payment !== false}
                                        onCheckedChange={(checked) => handleSwitchChange('enable_multi_invoice_payment', checked)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="min_payment_amount">Monto Mínimo de Pago</Label>
                                <Input type="number" id="min_payment_amount" name="min_payment_amount" value={formData.min_payment_amount || 0} onChange={handleChange} />
                                <p className="text-xs text-muted-foreground">Los pagos inferiores a este monto no permitirán checkout en línea.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="payment_pre_message">Mensaje Pre-Pago</Label>
                                    <Textarea
                                        id="payment_pre_message"
                                        name="payment_pre_message"
                                        value={formData.payment_pre_message || ''}
                                        onChange={handleChange}
                                        placeholder="Mensaje que verá el cliente antes de pagar (ej: Instrucciones adicionales)"
                                        className="min-h-[80px]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="payment_success_message">Mensaje Post-Pago</Label>
                                    <Textarea
                                        id="payment_success_message"
                                        name="payment_success_message"
                                        value={formData.payment_success_message || ''}
                                        onChange={handleChange}
                                        placeholder="Mensaje de agradecimiento tras un pago exitoso"
                                        className="min-h-[80px]"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-500/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                                Integración Wompi (API)
                            </CardTitle>
                            <CardDescription>
                                Configura tus llaves de API para procesar pagos automáticamente en el portal.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="wompi_public_key">Llave Pública (Public Key)</Label>
                                    <Input
                                        id="wompi_public_key"
                                        name="wompi_public_key"
                                        value={formData.wompi_public_key || ''}
                                        onChange={handleChange}
                                        placeholder="pub_..."
                                        className="bg-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="wompi_integrity_secret">Secreto de Integridad</Label>
                                    <Input
                                        type="password"
                                        id="wompi_integrity_secret"
                                        name="wompi_integrity_secret"
                                        value={formData.wompi_integrity_secret || ''}
                                        onChange={handleChange}
                                        placeholder="Integrity Secret..."
                                        className="bg-white"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                                <div className="space-y-0.5">
                                    <Label>Ambiente de Producción</Label>
                                    <p className="text-xs text-muted-foreground">Desactiva para usar modo Sandbox (Pruebas).</p>
                                </div>
                                <Switch
                                    checked={formData.wompi_environment === 'Production'}
                                    onCheckedChange={(checked) => setFormData((prev: any) => ({ ...prev, wompi_environment: checked ? 'Production' : 'Sandbox' }))}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* PORTAL TAB */}
                <TabsContent value="portal" className="space-y-4 mt-4" suppressHydrationWarning>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Left Column: General & Branding */}
                        <div className="lg:col-span-2 space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Globe className="h-4 w-4" /> General</CardTitle>
                                    <CardDescription>Configuración básica del portal de clientes.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between p-4 border dark:border-white/10 rounded-lg bg-muted/20 dark:bg-white/5">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Habilitar Portal</Label>
                                            <p className="text-sm text-muted-foreground">
                                                Si se desactiva, los clientes verán una página de mantenimiento.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={formData.portal_enabled !== false}
                                            onCheckedChange={(checked) => handleSwitchChange('portal_enabled', checked)}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input id="portal_subdomain" name="portal_subdomain" value={formData.portal_subdomain || ''} onChange={handleChange} placeholder="mi-negocio" className="max-w-[200px]" />
                                        <span className="text-muted-foreground text-sm">.pixy.com.co</span>
                                    </div>



                                </CardContent>
                            </Card>

                            <div className="rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 p-6 text-center">
                                <div className="mx-auto bg-blue-100 dark:bg-blue-500/20 rounded-full w-10 h-10 flex items-center justify-center mb-3">
                                    <Palette className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100 mb-1">El Branding del Portal cambió de lugar</h3>
                                <p className="text-sm text-blue-700 dark:text-blue-300 mb-4 max-w-sm mx-auto">
                                    Personaliza colores, logos y vista previa en el Centro de Marca.
                                </p>
                                {userRole !== 'member' && (
                                    <Button
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={() => setShowBrandCenter(true)}
                                    >
                                        Abrir Centro de Marca
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Right Column: Modules */}
                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Eye className="h-4 w-4" /> Visibilidad</CardTitle>
                                    <CardDescription>Controla qué módulos pueden ver tus clientes.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Facturas</Label>
                                            <p className="text-xs text-muted-foreground">Historial y pendientes.</p>
                                        </div>
                                        <Switch
                                            checked={formData.portal_modules?.invoices !== false}
                                            onCheckedChange={(checked) => handleModuleChange('invoices', checked)}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Pagos en Línea</Label>
                                            <p className="text-xs text-muted-foreground">Botón de pago Wompi.</p>
                                        </div>
                                        <Switch
                                            checked={formData.portal_modules?.payments !== false}
                                            onCheckedChange={(checked) => handleModuleChange('payments', checked)}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Briefings</Label>
                                            <p className="text-xs text-muted-foreground">Formularios de proyectos.</p>
                                        </div>
                                        <Switch
                                            checked={formData.portal_modules?.briefings !== false}
                                            onCheckedChange={(checked) => handleModuleChange('briefings', checked)}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* COMMUNICATION TAB */}
                <TabsContent value="communication" className="space-y-4 mt-4" suppressHydrationWarning>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Left Column: General Settings */}
                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> General</CardTitle>
                                    <CardDescription>Configuración de WhatsApp.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="comm_whatsapp_number">Número Principal</Label>
                                        <Input
                                            id="comm_whatsapp_number"
                                            name="comm_whatsapp_number"
                                            value={formData.comm_whatsapp_number || ''}
                                            onChange={handleChange}
                                            placeholder="3001234567"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="comm_sender_name">Nombre del Remitente</Label>
                                        <Input
                                            id="comm_sender_name"
                                            name="comm_sender_name"
                                            value={formData.comm_sender_name || ''}
                                            onChange={handleChange}
                                            placeholder="Tu Negocio"
                                        />
                                        <p className="text-xs text-muted-foreground">Se usará en algunos mensajes automáticos.</p>
                                    </div>
                                    <div className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm">Modo Asistido</Label>
                                            <p className="text-xs text-muted-foreground">Abrir WhatsApp Web al enviar.</p>
                                        </div>
                                        <Switch
                                            checked={formData.comm_assisted_mode !== false}
                                            onCheckedChange={(checked) => handleSwitchChange('comm_assisted_mode', checked)}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column: Templates */}
                        <div className="lg:col-span-2 space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Plantillas de Mensajes</CardTitle>
                                    <CardDescription>Personaliza los mensajes que se envían a tus clientes.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {Object.keys(DEFAULT_TEMPLATES).map((key) => (
                                        <div key={key} className="space-y-2 border-b pb-4 last:border-0 last:pb-0">
                                            <Label className="capitalize font-semibold text-base">
                                                {key.replace('_', ' ')}
                                            </Label>
                                            <div className="flex gap-2 mb-2 flex-wrap">
                                                {COMMUNICATION_VARIABLES[key as keyof typeof COMMUNICATION_VARIABLES].map((v) => (
                                                    <Badge key={v} variant="outline" className="text-xs bg-muted">
                                                        {v}
                                                    </Badge>
                                                ))}
                                            </div>
                                            <Textarea
                                                value={formData.comm_templates?.[key] || DEFAULT_TEMPLATES[key as keyof typeof DEFAULT_TEMPLATES]}
                                                onChange={(e) => handleTemplateChange(key, e.target.value)}
                                                className="min-h-[80px]"
                                            />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* SUBSCRIPTION TAB */}
                <TabsContent value="subscription" className="space-y-4 mt-4" suppressHydrationWarning>
                    <SubscriptionSettingsTab app={subscriptionApp || null} />
                </TabsContent>



                {/* INTERFACE TAB */}
                <TabsContent value="interface" className="space-y-4 mt-4" suppressHydrationWarning>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><LayoutTemplate className="h-4 w-4" /> Personalización de Interfaz</CardTitle>
                            <CardDescription>
                                Ajusta la apariencia y elementos visibles de la aplicación.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Barra de Herramientas (Header)</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Muestra una cinta animada con las herramientas que usas.
                                    </p>
                                </div>
                                <Switch
                                    checked={showMarqueeLocal}
                                    onCheckedChange={handleMarqueeChange}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* SECURITY TAB */}
                <TabsContent value="security" className="space-y-4 mt-4" suppressHydrationWarning>
                    <Card className="border-indigo-100 bg-indigo-50/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-indigo-600" />
                                Seguridad y Acceso
                            </CardTitle>
                            <CardDescription>
                                Gestiona tus métodos de inicio de sesión y dispositivos de confianza.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-1 space-y-4">
                                    <h4 className="font-medium text-gray-900">Inicio de Sesión Biométrico</h4>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-sm text-muted-foreground">
                                            Registra este dispositivo para iniciar sesión usando tu huella dactilar, FaceID o Windows Hello sin necesidad de escribir tu contraseña.
                                        </p>
                                        <Switch
                                            checked={formData.enable_biometric_login !== false}
                                            onCheckedChange={(checked) => handleSwitchChange('enable_biometric_login', checked)}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-4">
                                        {formData.enable_biometric_login !== false ? "Habilitado: Los usuarios podrán ver el botón en el login." : "Deshabilitado: El botón estará oculto en la pantalla de inicio."}
                                    </p>

                                    <div className="p-4 border border-indigo-100 rounded-lg bg-white/50 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                                                <Lock className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm text-gray-900">Passkeys (FIDO2)</p>
                                                <p className="text-xs text-muted-foreground">El estándar más seguro de la industria.</p>
                                            </div>
                                        </div>

                                        <BiometricButton variant="cyber" mode="register" className="w-full sm:w-auto" />
                                    </div>
                                </div>

                                <div className="w-px bg-gray-200 hidden md:block" />

                                <div className="flex-1 space-y-4">
                                    <h4 className="font-medium text-gray-900">Sesiones Activas</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Si ves actividad sospechosa, te recomendamos cambiar tu contraseña inmediatamente.
                                    </p>
                                    <Button variant="outline" className="text-red-600 border-red-100 hover:bg-red-50 hover:text-red-700">
                                        Cerrar todas las sesiones
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div >
    )
}
