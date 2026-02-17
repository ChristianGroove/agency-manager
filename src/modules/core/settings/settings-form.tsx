"use client"

import { useState, useEffect } from "react"
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
import { Loader2, Save, CreditCard, FileText, Layout, Palette, Eye, MessageSquare, Users, AlertTriangle, Lock, Shield, DollarSign, ShieldAlert, Bell, Bot, Settings, Globe } from "lucide-react"

import { PaymentMethodsManager } from "./payment-methods-manager"
import { EmittersSettings } from "./emitters-settings"
import { TeamSettingsTab } from "./team-settings-tab"
import { EmailLogsTable } from "@/modules/core/notifications/components/email-logs-table"
import { SubscriptionSettingsTab } from "./subscription-settings-tab"
import { VaultSettingsTab } from "@/modules/core/data-vault/components/vault-settings-tab"
import { AuditLogsTable } from "@/modules/core/audit/audit-logs-table"
import { ResellerDashboard } from "@/modules/core/revenue/components/reseller-dashboard"
import { BrandCenterSheet } from "@/modules/core/branding/components/brand-center-sheet"
import { BiometricButton } from "@/components/auth/biometric-button"
import { SectionHeader } from "@/components/layout/section-header"
import { SplitText } from "@/components/ui/split-text"

import { isEmittersModuleEnabled } from "@/lib/flags"
import { useTranslation } from "@/lib/i18n/use-translation"
import { useRegisterView } from "@/modules/core/caa/context/view-context"
import { getSettings, updateSettings } from "@/modules/core/settings/actions"
import { COMMUNICATION_VARIABLES, DEFAULT_TEMPLATES } from "@/lib/communication-utils"

import { BrandingConfig } from "@/types/branding"
import { OrganizationRole } from "@/lib/auth/org-roles"
import { DataSnapshot, VaultConfig } from "@/modules/core/data-vault/types"
import { SaasApp } from "@/modules/core/saas/app-management-actions"

interface SettingsFormProps {
    initialSettings: any
    activeModules: string[]
    subscriptionApp?: SaasApp | null
    brandingSettings?: BrandingConfig
    tierFeatures?: Record<string, any>
    userRole: OrganizationRole
    snapshots: DataSnapshot[]
    vaultConfig: VaultConfig
    organizationId: string
    isReseller?: boolean
    billingStatus?: { allowDirectBilling?: boolean }
}

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

export function SettingsForm({
    initialSettings,
    activeModules,
    subscriptionApp,
    brandingSettings,
    tierFeatures = {},
    userRole,
    snapshots,
    vaultConfig,
    organizationId,
    isReseller = false,
    billingStatus
}: SettingsFormProps) {
    const router = useRouter()
    const { t } = useTranslation()
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState(initialSettings || {})

    // CAA Registration
    useRegisterView({
        viewId: "settings",
        label: "Configuración",
        topics: ["configuration", "billing", "branding", "roles"],
        actions: [
            { id: "save-settings", label: "Guardar Cambios", type: "function", target: "submit_form", icon: Save, description: "Guardar la configuración actual" },
            { id: "view-billing", label: "Facturación y Planes", type: "route", target: "/platform/settings?tab=subscription", icon: CreditCard, description: "Gestionar plan y métodos de pago" },
            { id: "manage-team", label: "Gestionar Equipo", type: "route", target: "/platform/settings?tab=team", icon: Users, description: "Invitar o eliminar miembros" }
        ]
    })

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

    const handleModuleChange = (key: string, checked: boolean) => {
        setFormData((prev: any) => ({
            ...prev,
            portal_modules: {
                ...(prev.portal_modules || {}),
                [key]: checked
            }
        }))
    }

    const handleTemplateChange = (key: string, value: string) => {
        setFormData((prev: any) => ({
            ...prev,
            comm_templates: {
                ...(prev.comm_templates || {}),
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

    const TABS_CONFIG: SettingsTab[] = [
        {
            id: 'subscription',
            label: t('settings.tabs.subscription'),
            icon: CreditCard,
            requiredModule: null,
            isCore: true
        },
        {
            id: 'vault',
            label: t('settings.tabs.security'),
            icon: Shield,
            minRole: 'owner',
            isCore: true
        },
        {
            id: 'audit',
            label: "Auditoría",
            icon: ShieldAlert,
            minRole: 'admin',
            isCore: true
        },
        {
            id: 'team',
            label: t('settings.tabs.team'),
            icon: Users,
            requiredModule: null,
            isCore: true,
            minRole: 'admin'
        },
        {
            id: 'notifications',
            label: t('settings.tabs.notifications'),
            icon: Bell,
            requiredModule: 'module_communications',
            matchAny: true,
            minRole: 'member'
        },
        {
            id: 'billing',
            label: t('settings.tabs.billing'),
            icon: FileText,
            requiredModule: null, // Enabled for everyone (Resellers & Clients)
            minRole: 'admin'
        },
        {
            id: 'payments',
            label: t('settings.tabs.payments'),
            icon: CreditCard,
            requiredModule: null, // Enabled for everyone
            requiredModules: undefined,
            matchAny: false,
            minRole: 'admin'
        },
        {
            id: 'portal',
            label: t('settings.tabs.portal'),
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
            id: 'revenue',
            label: 'Comisiones',
            icon: DollarSign,
            requiredModule: null,
            isCore: false,
            minRole: 'owner',
            customCheck: () => isReseller
        }
    ]

    const getVisibleTabs = (activeModules: string[]) => {
        return TABS_CONFIG.filter(tab => {
            if (tab.minRole) {
                if (tab.minRole === 'admin' && userRole === 'member') return false
                if (tab.minRole === 'owner' && userRole !== 'owner') return false
            }
            if (tab.isCore) return true
            if (tab.featureFlag && !tab.featureFlag()) return false
            if (tab.customCheck) return tab.customCheck(activeModules)
            if (tab.requiredModule) return activeModules.includes(tab.requiredModule)
            if (tab.requiredModules) {
                if (tab.matchAny) return tab.requiredModules.some((m: string) => activeModules.includes(m))
                return tab.requiredModules.every((m: string) => activeModules.includes(m))
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

            <SectionHeader
                title={t('settings.title')}
                subtitle={t('settings.description')}
                icon={Settings}
                action={userRole !== 'member' && (
                    <Button onClick={handleSubmit} disabled={isLoading} className="bg-brand-pink hover:bg-brand-pink/90">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {t('common.save')}
                    </Button>
                )}
            />

            <Tabs defaultValue={visibleTabs[0]?.id || 'team'} className="w-full" suppressHydrationWarning>
                <TabsList
                    className="flex w-full overflow-x-auto bg-gray-100/50 dark:bg-white/5 p-1 backdrop-blur-sm border border-gray-200/50 dark:border-white/10 no-scrollbar"
                    suppressHydrationWarning
                >
                    {visibleTabs.map(tab => {
                        const Icon = tab.icon
                        return (
                            <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                className="flex items-center justify-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm transition-all flex-1 whitespace-nowrap px-4"
                                suppressHydrationWarning
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </TabsTrigger>
                        )
                    })}
                </TabsList>

                <TabsContent value="subscription" className="space-y-4 mt-4" suppressHydrationWarning>
                    <SubscriptionSettingsTab app={subscriptionApp} allowDirectBilling={billingStatus?.allowDirectBilling} />
                </TabsContent>

                <TabsContent value="vault" className="space-y-4 mt-4" suppressHydrationWarning>
                    <VaultSettingsTab snapshots={snapshots || []} initialConfig={vaultConfig!} />
                </TabsContent>

                <TabsContent value="audit" className="space-y-4 mt-4" suppressHydrationWarning>
                    <Card className="bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 shadow-sm backdrop-blur-md">
                        <CardHeader>
                            <CardTitle>Registro de Auditoría</CardTitle>
                            <CardDescription>
                                Historial inmutable de acciones críticas de seguridad y cambios en la organización.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AuditLogsTable />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="team" className="space-y-4 mt-4" suppressHydrationWarning>
                    <TeamSettingsTab />
                </TabsContent>


                <TabsContent value="notifications" className="space-y-4 mt-4" suppressHydrationWarning>
                    <Card className="bg-white dark:bg-white/5 border-gray-100 dark:border-white/10 shadow-sm backdrop-blur-md">
                        <CardHeader>
                            <CardTitle>{t('settings.notifications.title')}</CardTitle>
                            <CardDescription>{t('settings.notifications.description')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 border border-dashed border-gray-200 dark:border-white/10 rounded-lg flex flex-col justify-center items-center text-center gap-2 bg-gray-50/50 dark:bg-white/5">
                                    <div className="h-10 w-10 rounded-full bg-brand-pink/10 flex items-center justify-center text-brand-pink">
                                        <Palette className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-medium">Diseño y Plantillas</h3>
                                    <p className="text-xs text-muted-foreground mb-2">Personaliza el aspecto de tus correos.</p>
                                    <Button variant="outline" size="sm" onClick={() => router.push('/platform/settings/email')}>
                                        Gestionar Plantillas
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email_sender_name">Nombre del Remitente</Label>
                                    <Input
                                        id="email_sender_name"
                                        name="email_sender_name"
                                        value={formData.email_sender_name || ''}
                                        onChange={handleChange}
                                        placeholder="Ej: Mi Agencia"
                                    />
                                    <p className="text-xs text-muted-foreground">El nombre que verán los clientes.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email_reply_to">Correo de Respuesta</Label>
                                    <Input
                                        id="email_reply_to"
                                        name="email_reply_to"
                                        value={formData.email_reply_to || ''}
                                        onChange={handleChange}
                                        placeholder="soporte@miagencia.com"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('settings.notifications.activity_log')}</CardTitle>
                            <CardDescription>{t('settings.notifications.activity_log_desc')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <EmailLogsTable />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="billing" className="space-y-6 mt-4" suppressHydrationWarning>
                    <div><EmittersSettings /></div>
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">{t('settings.billing.general_docs')}</span></div>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('settings.billing.title')}</CardTitle>
                            <CardDescription>{t('settings.billing.description')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="invoice_prefix">Prefijo de Documentos</Label>
                                    <Input id="invoice_prefix" name="invoice_prefix" value={formData.invoice_prefix || 'INV-'} onChange={handleChange} placeholder="INV-" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="default_due_days">Días de Vencimiento</Label>
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
                                <Label htmlFor="invoice_legal_text">Pie de Página de Factura</Label>
                                <Textarea id="invoice_legal_text" name="invoice_legal_text" value={formData.invoice_legal_text || ''} onChange={handleChange} placeholder="Texto legal..." className="min-h-[100px]" />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="payments" className="space-y-4 mt-4" suppressHydrationWarning>
                    <PaymentMethodsManager />
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('settings.payments.title')}</CardTitle>
                            <CardDescription>{t('settings.payments.description')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col gap-4 p-4 border dark:border-white/10 rounded-lg bg-muted/20 dark:bg-white/5">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Habilitar Pagos en el Portal</Label>
                                        <p className="text-sm text-muted-foreground">Si se desactiva, los clientes verán sus cuentas pero no podrán pagar.</p>
                                    </div>
                                    <Switch checked={formData.enable_portal_payments !== false} onCheckedChange={(checked) => handleSwitchChange('enable_portal_payments', checked)} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Permitir Pago Múltiple</Label>
                                        <p className="text-sm text-muted-foreground">Pagar varios documentos en una sola transacción.</p>
                                    </div>
                                    <Switch checked={formData.enable_multi_invoice_payment !== false} onCheckedChange={(checked) => handleSwitchChange('enable_multi_invoice_payment', checked)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="min_payment_amount">Monto Mínimo de Pago</Label>
                                <Input type="number" id="min_payment_amount" name="min_payment_amount" value={formData.min_payment_amount || 0} onChange={handleChange} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="payment_pre_message">Mensaje Pre-Pago</Label>
                                    <Textarea id="payment_pre_message" name="payment_pre_message" value={formData.payment_pre_message || ''} onChange={handleChange} placeholder="Mensaje antes de pagar..." className="min-h-[80px]" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="payment_success_message">Mensaje Post-Pago</Label>
                                    <Textarea id="payment_success_message" name="payment_success_message" value={formData.payment_success_message || ''} onChange={handleChange} placeholder="Mensaje tras pago exitoso..." className="min-h-[80px]" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-500/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">Integración Wompi (API)</CardTitle>
                            <CardDescription>Configura tus llaves de API.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="wompi_public_key">Llave Pública</Label>
                                    <Input id="wompi_public_key" name="wompi_public_key" value={formData.wompi_public_key || ''} onChange={handleChange} placeholder="pub_..." className="bg-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="wompi_integrity_secret">Secreto de Integridad</Label>
                                    <Input type="password" id="wompi_integrity_secret" name="wompi_integrity_secret" value={formData.wompi_integrity_secret || ''} onChange={handleChange} placeholder="Secret..." className="bg-white" />
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                                <div className="space-y-0.5">
                                    <Label>Ambiente de Producción</Label>
                                    <p className="text-xs text-muted-foreground">Desactiva para usar modo Sandbox.</p>
                                </div>
                                <Switch checked={formData.wompi_environment === 'Production'} onCheckedChange={(checked) => setFormData((prev: any) => ({ ...prev, wompi_environment: checked ? 'Production' : 'Sandbox' }))} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="portal" className="space-y-4 mt-4" suppressHydrationWarning>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-2 space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Globe className="h-4 w-4" /> General</CardTitle>
                                    <CardDescription>Configuración básica del portal.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between p-4 border dark:border-white/10 rounded-lg bg-muted/20 dark:bg-white/5">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Habilitar Portal</Label>
                                            <p className="text-sm text-muted-foreground">Si se desactiva, los clientes verán mantenimiento.</p>
                                        </div>
                                        <Switch checked={formData.portal_enabled !== false} onCheckedChange={(checked) => handleSwitchChange('portal_enabled', checked)} />
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
                                <p className="text-sm text-blue-700 dark:text-blue-300 mb-4 max-w-sm mx-auto">Personaliza colores y logos en el Centro de Marca.</p>
                                {userRole !== 'member' && (
                                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowBrandCenter(true)}>
                                        Abrir Centro de Marca
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Eye className="h-4 w-4" /> Visibilidad</CardTitle>
                                    <CardDescription>Controla qué módulos ven tus clientes.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Facturas</Label>
                                            <p className="text-xs text-muted-foreground">Historial y pendientes.</p>
                                        </div>
                                        <Switch checked={formData.portal_modules?.invoices !== false} onCheckedChange={(checked) => handleModuleChange('invoices', checked)} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Cotizaciones</Label>
                                            <p className="text-xs text-muted-foreground">Aprobar o rechazar.</p>
                                        </div>
                                        <Switch checked={formData.portal_modules?.quotes !== false} onCheckedChange={(checked) => handleModuleChange('quotes', checked)} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <Label className="text-base">Proyectos</Label>
                                            <p className="text-xs text-muted-foreground">Avance y tareas.</p>
                                        </div>
                                        <Switch checked={formData.portal_modules?.projects !== false} onCheckedChange={(checked) => handleModuleChange('projects', checked)} />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="communication" className="space-y-4 mt-4" suppressHydrationWarning>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Plantillas de Mensajes</CardTitle>
                                <CardDescription>Personaliza los mensajes de WhatsApp/Email.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label>Envío de Factura</Label>
                                    <Textarea
                                        value={formData.comm_templates?.invoice_send || DEFAULT_TEMPLATES.invoice_sent}
                                        onChange={(e) => handleTemplateChange('invoice_send', e.target.value)}
                                        className="min-h-[100px]"
                                    />
                                    <p className="text-xs text-muted-foreground">Variables: {COMMUNICATION_VARIABLES.invoice_sent.join(', ')}</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Recordatorio de Pago</Label>
                                    <Textarea
                                        value={formData.comm_templates?.payment_reminder || DEFAULT_TEMPLATES.payment_reminder}
                                        onChange={(e) => handleTemplateChange('payment_reminder', e.target.value)}
                                        className="min-h-[100px]"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>


                {isReseller && (
                    <TabsContent value="revenue" className="space-y-6 mt-4" suppressHydrationWarning>
                        <ResellerDashboard organizationId={organizationId} />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    )
}
