"use client"

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
import { PortalSettingsTab } from "./portal-settings-tab"
import { TeamSettingsTab } from "./team-settings-tab"
import { EmailLogsTable } from "@/modules/core/notifications/components/email-logs-table"
import { Bell } from "lucide-react"
import { BiometricButton } from "@/components/auth/biometric-button"

interface SettingsFormProps {
    initialSettings: any
    activeModules: string[]
}

export function SettingsForm({ initialSettings, activeModules }: SettingsFormProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState(initialSettings || {})

    // Local UI Settings State
    const [showMarqueeLocal, setShowMarqueeLocal] = useState(false)

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
        featureFlag?: () => boolean
        customCheck?: (modules: string[]) => boolean
    }

    const TABS_CONFIG: SettingsTab[] = [
        {
            id: 'agency',
            label: 'Negocio',
            icon: Building2,
            requiredModule: null,
            isCore: true
        },
        {
            id: 'team',
            label: 'Equipo',
            icon: Users,
            requiredModule: null,
            isCore: true
        },
        {
            id: 'general',
            label: 'General',
            icon: Globe,
            requiredModule: null,
            isCore: true
        },
        {
            id: 'notifications',
            label: 'Notificaciones',
            icon: Bell,
            requiredModule: 'module_communications',
            matchAny: true // Or maybe strictly communications? The validation logic used module_communications for email settings.
        },
        {
            id: 'billing',
            label: 'Facturación',
            icon: FileText,
            requiredModule: 'module_invoicing'
        },

        {
            id: 'payments',
            label: 'Pagos',
            icon: CreditCard,
            requiredModules: ['module_payments', 'module_invoicing'],
            matchAny: true
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
            // Always show core tabs
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
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                        <SplitText>Configuración</SplitText>
                    </h2>
                    <p className="text-muted-foreground">Administra los datos de tu negocio y preferencias globales.</p>
                </div>
                <Button onClick={handleSubmit} disabled={isLoading} className="bg-brand-pink hover:bg-brand-pink/90">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Cambios
                </Button>
            </div>

            <Tabs defaultValue={visibleTabs[0]?.id || 'agency'} className="w-full" suppressHydrationWarning>
                <TabsList
                    className="grid w-full max-w-full"
                    style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}
                    suppressHydrationWarning
                >
                    {visibleTabs.map(tab => {
                        const Icon = tab.icon
                        return (
                            <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                className="flex items-center gap-2"
                                suppressHydrationWarning
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </TabsTrigger>
                        )
                    })}
                </TabsList>

                {/* TEAM TAB */}
                <TabsContent value="team" className="space-y-4 mt-4">
                    <TeamSettingsTab />
                </TabsContent>

                {/* AGENCY TAB */}
                <TabsContent value="agency" className="space-y-4 mt-4" suppressHydrationWarning>
                    <Card>
                        <CardHeader>
                            <CardTitle>Identidad del Negocio</CardTitle>
                            <CardDescription>
                                Estos datos aparecerán en tus cuentas de cobro, cotizaciones y portal de clientes.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="agency_name">Nombre Comercial / Marca</Label>
                                    <Input id="agency_name" name="agency_name" value={formData.agency_name || ''} onChange={handleChange} placeholder="Ej: Pixy Agency" />
                                    <p className="text-xs text-muted-foreground">Nombre visible en el portal y correos.</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="agency_email">Email Principal</Label>
                                <Input id="agency_email" name="agency_email" value={formData.agency_email || ''} onChange={handleChange} placeholder="contacto@pixy.com" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="agency_phone">Teléfono / WhatsApp</Label>
                                <Input id="agency_phone" name="agency_phone" value={formData.agency_phone || ''} onChange={handleChange} placeholder="+57 300 123 4567" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="agency_website">Sitio Web</Label>
                                <Input id="agency_website" name="agency_website" value={formData.agency_website || ''} onChange={handleChange} placeholder="https://pixy.com" />
                            </div>

                            {/* Branding Section */}
                            <div className="space-y-4 pt-4 border-t">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-900 mb-1">Sistema de Branding (Marca Blanca)</h4>
                                        <p className="text-xs text-gray-500">Personaliza los logos y colores de tu portal.</p>
                                    </div>
                                    {!activeModules.includes('module_whitelabel') && (
                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            Requiere Plan Avanzado
                                        </Badge>
                                    )}
                                </div>

                                <div className={!activeModules.includes('module_whitelabel') ? 'opacity-50 pointer-events-none grayscale' : ''}>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="invoice_logo_url">Logo para Documentos</Label>
                                            <div className="relative">
                                                <Input id="invoice_logo_url" name="invoice_logo_url" value={formData.invoice_logo_url || ''} onChange={handleChange} placeholder="/branding/invoice-logo.png" />
                                                {!activeModules.includes('module_whitelabel') && <Lock className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />}
                                            </div>
                                            <p className="text-xs text-muted-foreground">Se usará en PDFs de cuentas de cobro</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="main_logo_url">Logo Principal (Login/Sidebar)</Label>
                                            <div className="relative">
                                                <Input id="main_logo_url" name="main_logo_url" value={formData.main_logo_url || ''} onChange={handleChange} placeholder="/branding/main-logo.svg" />
                                                {!activeModules.includes('module_whitelabel') && <Lock className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />}
                                            </div>
                                            <p className="text-xs text-muted-foreground">Se usará en navegación</p>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="isotipo_url">Isotipo / Favicon</Label>
                                            <div className="relative">
                                                <Input id="isotipo_url" name="isotipo_url" value={formData.isotipo_url || ''} onChange={handleChange} placeholder="/branding/isotipo.svg" />
                                                {!activeModules.includes('module_whitelabel') && <Lock className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />}
                                            </div>
                                            <p className="text-xs text-muted-foreground">Icono compacto del sistema</p>
                                        </div>
                                    </div>
                                </div>
                                {!activeModules.includes('module_whitelabel') && (
                                    <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-4 flex items-center gap-3">
                                        <div className="p-2 bg-indigo-100 rounded-full">
                                            <Shield className="h-5 w-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h5 className="font-semibold text-indigo-900 text-sm">Gestionado por la Plataforma</h5>
                                            <p className="text-xs text-indigo-700">Actualmente usas la marca predeterminada de Pixy. Actualiza tu plan para usar tu propia identidad.</p>
                                        </div>
                                        <Button size="sm" variant="outline" className="ml-auto border-indigo-200 text-indigo-700 hover:bg-indigo-100">
                                            Activar Marca Blanca
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Social Media Section */}
                            <div className="space-y-4 pt-4 border-t">
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-900 mb-1">Redes Sociales</h4>
                                    <p className="text-xs text-gray-500">Configura tus perfiles de redes sociales y estadísticas</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="social_facebook">Facebook URL</Label>
                                        <Input id="social_facebook" name="social_facebook" value={formData.social_facebook || ''} onChange={handleChange} placeholder="https://facebook.com/pixypds" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="social_facebook_followers">Seguidores Facebook</Label>
                                        <Input type="number" id="social_facebook_followers" name="social_facebook_followers" value={formData.social_facebook_followers || ''} onChange={handleChange} placeholder="1250" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="social_instagram">Instagram URL</Label>
                                        <Input id="social_instagram" name="social_instagram" value={formData.social_instagram || ''} onChange={handleChange} placeholder="https://instagram.com/pixypds" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="social_instagram_followers">Seguidores Instagram</Label>
                                        <Input type="number" id="social_instagram_followers" name="social_instagram_followers" value={formData.social_instagram_followers || ''} onChange={handleChange} placeholder="3400" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="social_twitter">Twitter/X URL</Label>
                                        <Input id="social_twitter" name="social_twitter" value={formData.social_twitter || ''} onChange={handleChange} placeholder="https://twitter.com/pixypds" />
                                    </div>
                                </div>
                            </div>
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
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* GENERAL TAB */}
                <TabsContent value="general" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuración Regional y Legal</CardTitle>
                            <CardDescription>
                                Define los formatos y textos legales predeterminados.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
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

                            <div className="space-y-2 pt-4 border-t">
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Accesibilidad</h4>
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
                <TabsContent value="notifications" className="space-y-4 mt-4">
                    <Card>
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
                <TabsContent value="billing" className="space-y-6 mt-4">

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

                    {/* Document Branding Card */}
                    <Card className="border-purple-100 bg-purple-50/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Palette className="h-5 w-5 text-purple-600" />
                                Personalización de Documentos
                            </CardTitle>
                            <CardDescription>
                                Personaliza la apariencia de tus facturas y cotizaciones
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="document_primary_color">Color Principal</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="color"
                                            id="document_primary_color"
                                            name="document_primary_color"
                                            value={formData.document_primary_color || '#6D28D9'}
                                            onChange={handleChange}
                                            className="w-20 h-10 p-1 cursor-pointer"
                                        />
                                        <Input
                                            type="text"
                                            name="document_primary_color"
                                            value={formData.document_primary_color || '#6D28D9'}
                                            onChange={handleChange}
                                            placeholder="#6D28D9"
                                            className="flex-1 font-mono"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Color de acento en botones y elementos destacados
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="document_logo_size">Tamaño del Logo</Label>
                                    <Select
                                        name="document_logo_size"
                                        value={formData.document_logo_size || 'medium'}
                                        onValueChange={(val) => handleSelectChange('document_logo_size', val)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="small">Pequeño</SelectItem>
                                            <SelectItem value="medium">Mediano</SelectItem>
                                            <SelectItem value="large">Grande</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
                                <div className="space-y-0.5">
                                    <Label className="text-sm">Mostrar Marca de Agua</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Logo tenue de fondo en documentos
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.document_show_watermark !== false}
                                    onCheckedChange={(checked) => handleSwitchChange('document_show_watermark', checked)}
                                />
                            </div>

                            {/* Preview Example */}
                            <div className="p-4 border rounded-lg bg-white">
                                <p className="text-xs text-muted-foreground mb-2">Vista Previa:</p>
                                <button
                                    className="px-4 py-2 rounded text-sm font-medium transition-colors"
                                    style={{
                                        backgroundColor: `${formData.document_primary_color || '#6D28D9'}14`,
                                        color: formData.document_primary_color || '#6D28D9',
                                        border: `1px solid ${formData.document_primary_color || '#6D28D9'}33`
                                    }}
                                >
                                    Botón de Pago
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* PAYMENTS TAB */}
                <TabsContent value="payments" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cuentas y Links de Pago</CardTitle>
                            <CardDescription>
                                Configura los números de cuenta y enlaces que aparecerán en el pie de página de tus facturas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bancolombia_account">Cuenta Bancolombia</Label>
                                    <Input id="bancolombia_account" name="bancolombia_account" value={formData.bancolombia_account || ''} onChange={handleChange} placeholder="Ahorros 000-000000-00" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="nequi_number">Nequi</Label>
                                    <Input id="nequi_number" name="nequi_number" value={formData.nequi_number || ''} onChange={handleChange} placeholder="300 000 0000" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="daviplata_number">Daviplata</Label>
                                    <Input id="daviplata_number" name="daviplata_number" value={formData.daviplata_number || ''} onChange={handleChange} placeholder="300 000 0000" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bre_b_number">Cuenta Bre-B</Label>
                                    <Input id="bre_b_number" name="bre_b_number" value={formData.bre_b_number || ''} onChange={handleChange} placeholder="0000000000" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 pt-4 border-t">
                                <div className="space-y-2">
                                    <Label htmlFor="wompi_link">Link de Pago Wompi</Label>
                                    <Input id="wompi_link" name="wompi_link" value={formData.wompi_link || ''} onChange={handleChange} placeholder="https://checkout.wompi.co/l/..." />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="paypal_link">Link de Pago PayPal</Label>
                                    <Input id="paypal_link" name="paypal_link" value={formData.paypal_link || ''} onChange={handleChange} placeholder="https://paypal.me/..." />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Control de Pagos en Línea</CardTitle>
                            <CardDescription>
                                Configura el comportamiento del portal de pagos y la integración con Wompi.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/20">
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

                    <Card className="border-indigo-100 bg-indigo-50/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-indigo-700">
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
                <TabsContent value="portal" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Left Column: General & Branding */}
                        <div className="lg:col-span-2 space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Globe className="h-4 w-4" /> General</CardTitle>
                                    <CardDescription>Configuración básica del portal de clientes.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
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


                                    {/* Metadata Section */}
                                    <div className="space-y-4 pt-4 border-t">
                                        <h4 className="text-sm font-medium">Metadatos (SEO y Compartir)</h4>
                                        <div className="space-y-2">
                                            <Label htmlFor="portal_og_title">Título al Compartir</Label>
                                            <Input
                                                id="portal_og_title"
                                                name="portal_og_title"
                                                value={formData.portal_og_title || ''}
                                                onChange={handleChange}
                                                placeholder="Ej: Portal de Clientes - Pixy Agency"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="portal_og_description">Descripción al Compartir</Label>
                                            <Input
                                                id="portal_og_description"
                                                name="portal_og_description"
                                                value={formData.portal_og_description || ''}
                                                onChange={handleChange}
                                                placeholder="Ej: Accede a tus documentos y proyectos en tiempo real."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="portal_og_image_url">URL de Imagen (Preview)</Label>
                                            <Input
                                                id="portal_og_image_url"
                                                name="portal_og_image_url"
                                                value={formData.portal_og_image_url || ''}
                                                onChange={handleChange}
                                                placeholder="https://..."
                                            />
                                            <p className="text-xs text-muted-foreground">Opcional. Si no se define, se usará el logo.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="portal_welcome_message">Mensaje de Bienvenida</Label>
                                        <Textarea
                                            id="portal_welcome_message"
                                            name="portal_welcome_message"
                                            value={formData.portal_welcome_message || ''}
                                            onChange={handleChange}
                                            placeholder="¡Hola! Bienvenido a tu portal de clientes..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="portal_footer_text">Texto del Pie de Página</Label>
                                        <Input
                                            id="portal_footer_text"
                                            name="portal_footer_text"
                                            value={formData.portal_footer_text || ''}
                                            onChange={handleChange}
                                            placeholder="© 2024 Mi Empresa - Todos los derechos reservados"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Palette className="h-4 w-4" /> Branding</CardTitle>
                                    <CardDescription>Personaliza la apariencia del portal.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="portal_logo_url">URL del Logo del Portal</Label>
                                        <Input
                                            id="portal_logo_url"
                                            name="portal_logo_url"
                                            value={formData.portal_logo_url || ''}
                                            onChange={handleChange}
                                            placeholder="https://..."
                                        />
                                        <p className="text-xs text-muted-foreground">Si se deja vacío, se usará el logo del negocio.</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="portal_primary_color">Color Primario</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    type="color"
                                                    id="portal_primary_color"
                                                    name="portal_primary_color"
                                                    value={formData.portal_primary_color || '#000000'}
                                                    onChange={handleChange}
                                                    className="w-12 h-10 p-1 cursor-pointer"
                                                />
                                                <Input
                                                    name="portal_primary_color"
                                                    value={formData.portal_primary_color || ''}
                                                    onChange={handleChange}
                                                    placeholder="#000000"
                                                    className="flex-1"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="portal_secondary_color">Color Secundario</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    type="color"
                                                    id="portal_secondary_color"
                                                    name="portal_secondary_color"
                                                    value={formData.portal_secondary_color || '#ffffff'}
                                                    onChange={handleChange}
                                                    className="w-12 h-10 p-1 cursor-pointer"
                                                />
                                                <Input
                                                    name="portal_secondary_color"
                                                    value={formData.portal_secondary_color || ''}
                                                    onChange={handleChange}
                                                    placeholder="#ffffff"
                                                    className="flex-1"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="portal_show_agency_name">Mostrar Nombre del Negocio</Label>
                                        <Switch
                                            id="portal_show_agency_name"
                                            checked={formData.portal_show_agency_name !== false}
                                            onCheckedChange={(checked) => handleSwitchChange('portal_show_agency_name', checked)}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="portal_show_contact_info">Mostrar Info de Contacto</Label>
                                        <Switch
                                            id="portal_show_contact_info"
                                            checked={formData.portal_show_contact_info !== false}
                                            onCheckedChange={(checked) => handleSwitchChange('portal_show_contact_info', checked)}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
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

                {/* PORTAL TAB */}
                <TabsContent value="portal" className="space-y-4 mt-4">
                    <PortalSettingsTab
                        settings={formData}
                        activeModules={activeModules}
                        onChange={handleChange}
                        onSelectChange={handleSelectChange}
                        onSwitchChange={handleSwitchChange}
                    />
                </TabsContent>

                {/* COMMUNICATION TAB */}
                <TabsContent value="communication" className="space-y-4 mt-4">
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
                {/* INTERFACE TAB */}
                <TabsContent value="interface" className="space-y-4 mt-4">
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
                <TabsContent value="security" className="space-y-4 mt-4">
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
