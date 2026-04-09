"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { EmailTemplate, setActiveTemplate, updateEmailTemplate } from "@/modules/core/notifications/actions"
import { SmtpConfigFull } from "@/modules/core/notifications/actions/smtp-actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ArrowLeft, Check, Layout, Sparkles, Mail, Eye, Info } from "lucide-react"
import { cn } from "@/lib/utils"
// Import Template Generators directly for real-time preview (since DB might have empty HTML for hybrid styles)
import { getInvoiceEmailHtml, getQuoteEmailHtml, getBriefingSubmissionEmailHtml, getPortalInviteEmailHtml, EmailStyle, EmailBranding } from "@/lib/email-templates"
import { SmtpConnectionTab } from "./smtp-connection-tab"
import { TemplateTextEditor } from "@/components/email/TemplateTextEditor"
import { toast } from "sonner"

interface EmailSettingsPageProps {
    templates: EmailTemplate[]
    organizationId: string
    smtpConfig?: SmtpConfigFull | null
}

export function EmailSettingsPage({ templates, organizationId, smtpConfig }: EmailSettingsPageProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState("invoices")
    const [selectedStyle, setSelectedStyle] = useState<EmailStyle>("minimal")
    const [isCustomizing, setIsCustomizing] = useState(false)
    const [customBranding, setCustomBranding] = useState<EmailBranding | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    // --- TEMPLATE LOGIC ---
    // We group by "Type" first (Invoice, Quote, etc) but actually our templating system is Key-based.
    // However, the User UI wants "Categories" (Tabs).
    // Let's deduce the Active Style from the DB for the current Tab.

    // Helper: Find which style is currently ACTIVE in DB for a given Key
    const getActiveStyleForKey = (key: string): EmailStyle => {
        const found = templates.find(t => t.template_key === key && t.is_active)
        return (found?.variant_name as EmailStyle) || "minimal"
    }

    // When Tab changes, sync local 'selectedStyle' to what is live in DB
    useEffect(() => {
        let key = 'invoice_new'
        if (activeTab === 'quotes') key = 'quote_new'
        if (activeTab === 'briefs') key = 'briefing_submission' // or briefing_reminder
        if (activeTab === 'portal') key = 'portal_invite'

        setSelectedStyle(getActiveStyleForKey(key))
        setIsCustomizing(false) // Reset customization mode on tab change
    }, [activeTab, templates])

    // Load initial branding when style is selected or tab changes
    useEffect(() => {
        let key = 'invoice_new'
        if (activeTab === 'quotes') key = 'quote_new'
        if (activeTab === 'briefs') key = 'briefing_submission'
        if (activeTab === 'portal') key = 'portal_invite'

        // Priority: active organization template > system template of this variant
        const target = templates.find((t: EmailTemplate) => t.template_key === key && t.variant_name === selectedStyle && t.organization_id)
            || templates.find((t: EmailTemplate) => t.template_key === key && t.variant_name === selectedStyle)
        // const target = undefined;

        // Default Branding (Safe Fallback)
        const baseBranding: EmailBranding = {
            agency_name: "Tu Agencia Demo",
            primary_color: "#4F46E5",
            secondary_color: "#EC4899",
            logo_url: "https://api.dicebear.com/7.x/initials/svg?seed=AD",
            website_url: "https://tuagencia.com"
        }

        if (target && target.design_config) {
            setCustomBranding({ ...baseBranding, ...target.design_config })
        } else {
            setCustomBranding(baseBranding)
        }
    }, [selectedStyle, activeTab, templates])


    const handleActivateStyle = async () => {
        try {
            // Determine which Template ID corresponds to this Style + Key
            // If it doesn't exist (e.g. system system), we might need to "create" or "find" the row.
            // Current 'setActiveTemplate' expects a Template ID.
            // We need to find the template object that matches this variant + key.

            let key = 'invoice_new'
            if (activeTab === 'quotes') key = 'quote_new'
            if (activeTab === 'briefs') key = 'briefing_submission'
            if (activeTab === 'portal') key = 'portal_invite'

            const targetTemplate = templates.find(t => t.template_key === key && t.variant_name === selectedStyle)

            if (targetTemplate) {
                await setActiveTemplate(key, targetTemplate.id)
                router.refresh()
            } else {
                alert("Este estilo no está disponible para este tipo de correo aún.")
            }
        } catch (e) {
            console.error(e)
            alert("Error al activar plantilla")
        }
    }

    const handleSaveCustomization = async (newBranding: EmailBranding) => {
        setIsSaving(true);
        try {
            let key = 'invoice_new'
            if (activeTab === 'quotes') key = 'quote_new'
            if (activeTab === 'briefs') key = 'briefing_submission'
            if (activeTab === 'portal') key = 'portal_invite'

            // Find Target Template
            let targetTemplate = templates.find(t => t.template_key === key && t.variant_name === selectedStyle && t.organization_id)

            // If no org specific template, look for system template
            if (!targetTemplate) {
                targetTemplate = templates.find(t => t.template_key === key && t.variant_name === selectedStyle)
            }

            if (targetTemplate) {
                // If it is a system template, the action will clone it and return the new one.
                const result = await updateEmailTemplate(targetTemplate.id, {
                    design_config: newBranding
                })

                if (result.success) {
                    toast.success("Personalización guardada")
                    setCustomBranding(newBranding)
                    // If we just cloned a system template, we need to refresh to see the new Org Template in the list
                    router.refresh()
                }
            }
        } catch (e) {
            console.error(e)
            toast.error("Error al guardar cambios")
        } finally {
            setIsSaving(false);
        }
    }

    // --- PREVIEW GENERATION ---
    const previewHtml = useMemo(() => {
        // Mock Data for Preview
        const defaultBranding = {
            agency_name: "Tu Agencia Digital",
            primary_color: "#4F46E5",
            secondary_color: "#EC4899",
            logo_url: "https://api.dicebear.com/7.x/initials/svg?seed=AD", // Neutral avatar
            website_url: "https://tuagencia.com"
        }

        const branding = customBranding || defaultBranding;

        switch (activeTab) {
            case 'invoices':
                return getInvoiceEmailHtml(
                    "Juan Pérez", "INV-2024-001", "$4,500,000 COP", "30 Ene 2026", "Desarrollo de Software a Medida",
                    branding, selectedStyle
                )
            case 'quotes':
                return getQuoteEmailHtml(
                    "Juan Pérez", "COT-098", "$12,300,000 COP", "15 Ene 2026", "https://pixy.com.co/quote/123",
                    branding, selectedStyle
                )
            case 'briefs':
                return getBriefingSubmissionEmailHtml(
                    "María García", "Brief de Branding", "https://pixy.portal.com/brief/123",
                    branding, selectedStyle
                )
            case 'portal':
                return getPortalInviteEmailHtml(
                    "Juan Pérez", "https://portal.pixy.com/login",
                    branding, selectedStyle
                )
            default:
                return "<div style='padding:50px; text-align:center;'>Selecciona una categoría</div>"
        }
    }, [activeTab, selectedStyle])

    const isActive = (style: string) => {
        let key = 'invoice_new'
        if (activeTab === 'quotes') key = 'quote_new'
        if (activeTab === 'briefs') key = 'briefing_submission'
        if (activeTab === 'portal') key = 'portal_invite'
        return getActiveStyleForKey(key) === style
    }

    const availableStyles = [
        { id: 'minimal', name: 'Minimal', desc: 'Limpio y directo. Sin distracciones.' },
        { id: 'corporate', name: 'Corporate', desc: 'Formal, gris y estructurado.' },
        { id: 'bold', name: 'Bold', desc: 'Alto impacto con tu color primario.' },
        { id: 'neo', name: 'Neo', desc: 'Glassmorphism, gradientes y sombras suaves.' },
        { id: 'swiss', name: 'Swiss', desc: 'Tipografía Helvética, alto contraste y grillas.' },
    ]

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4 border-b pb-6 px-1">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Motor de Correos</h1>
                    <p className="text-muted-foreground text-sm">Diseña la experiencia de comunicación de tu agencia</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 border-b">
                    <TabsList className="bg-transparent w-full justify-start gap-8 px-2 overflow-x-auto h-auto p-0">
                        {['invoices', 'quotes', 'briefs', 'portal', 'settings'].map(tab => (
                            <TabsTrigger
                                key={tab}
                                value={tab}
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-1 py-3 text-sm font-medium transition-all hover:text-primary/80 data-[state=active]:shadow-none bg-transparent"
                            >
                                {tab === 'invoices' && 'Facturación'}
                                {tab === 'quotes' && 'Cotizaciones'}
                                {tab === 'briefs' && 'Briefs & Forms'}
                                {tab === 'portal' && 'Portal & Accesos'}
                                {tab === 'settings' && 'Conexión SMTP'}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <TabsContent value="settings" className="max-w-3xl mx-auto py-8">
                    <SmtpConnectionTab organizationId={organizationId} initialConfig={smtpConfig} />
                </TabsContent>


                {/* STANDARD TABS */}
                {
                    ['invoices', 'quotes', 'briefs', 'portal'].includes(activeTab) && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">

                            {/* LEFT: Style Selector */}
                            {!isCustomizing ? (
                                <div className="lg:col-span-3 space-y-6">
                                    <div className="space-y-1 px-1">
                                        <h3 className="font-semibold text-lg">Estilo Visual</h3>
                                        <p className="text-xs text-muted-foreground">Elige la identidad para {
                                            activeTab === 'invoices' ? 'tus facturas' :
                                                activeTab === 'quotes' ? 'tus cotizaciones' :
                                                    activeTab === 'portal' ? 'tus accesos' : 'tus notificaciones de forms'
                                        }</p>
                                    </div>

                                    <div className="space-y-3">
                                        {availableStyles.map((style) => (
                                            <div
                                                key={style.id}
                                                onClick={() => setSelectedStyle(style.id as EmailStyle)}
                                                className={cn(
                                                    "group flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden",
                                                    selectedStyle === style.id
                                                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                                                        : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 shrink-0 transition-colors",
                                                    selectedStyle === style.id ? "border-primary bg-primary" : "border-muted-foreground/30"
                                                )}>
                                                    {selectedStyle === style.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className={cn("font-medium text-sm", selectedStyle === style.id ? "text-primary" : "text-foreground")}>
                                                            {style.name}
                                                        </h4>
                                                        {isActive(style.id) && (
                                                            <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-green-100 text-green-700 hover:bg-green-100">
                                                                Activo
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{style.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-4 border-t px-1 space-y-3">
                                        <Button
                                            className="w-full gap-2 shadow-lg shadow-primary/20"
                                            disabled={isActive(selectedStyle)}
                                            onClick={handleActivateStyle}
                                        >
                                            {isActive(selectedStyle) ? (
                                                <><Check className="w-4 h-4" /> Estilo Activo</>
                                            ) : (
                                                <><Sparkles className="w-4 h-4" /> Activar {availableStyles.find(s => s.id === selectedStyle)?.name}</>
                                            )}
                                        </Button>

                                        <div className="flex gap-2">
                                            <Button
                                                variant={isCustomizing ? "secondary" : "outline"}
                                                className="w-full"
                                                onClick={() => setIsCustomizing(!isCustomizing)}
                                            >
                                                <Layout className="w-4 h-4 mr-2" /> Personalizar Textos
                                            </Button>
                                        </div>

                                        {!isActive(selectedStyle) && (
                                            <p className="text-[10px] text-center text-muted-foreground mt-3">
                                                Se aplicará a todos los correos de esta categoría.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="lg:col-span-3 space-y-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Button variant="ghost" size="icon" onClick={() => setIsCustomizing(false)}>
                                            <ArrowLeft className="w-4 h-4" />
                                        </Button>
                                        <h3 className="font-semibold text-lg leading-none mt-1">Editor de Contenido</h3>
                                    </div>
                                    <TemplateTextEditor
                                        initialBranding={customBranding || {
                                            agency_name: "Tu Agencia Demo",
                                            primary_color: "#4F46E5",
                                            secondary_color: "#EC4899",
                                            logo_url: "",
                                            website_url: ""
                                        }}
                                        onSave={handleSaveCustomization}
                                        isSaving={isSaving}
                                    />
                                </div>
                            )}

                            {/* RIGHT: Real Preview */}
                            <div className="lg:col-span-9">
                                <div className="bg-slate-100 dark:bg-slate-900/50 rounded-2xl border p-2 h-[800px] flex flex-col relative group">
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Badge variant="outline" className="bg-background/50 backdrop-blur">
                                            <Eye className="w-3 h-3 mr-1" /> Vista Previa Real (HTML)
                                        </Badge>
                                    </div>

                                    <iframe
                                        className="w-full h-full rounded-xl bg-white shadow-sm border-0"
                                        srcDoc={previewHtml}
                                        title="Live Preview"
                                        sandbox="allow-same-origin"
                                    />
                                </div>
                            </div>
                        </div>
                    )
                }
            </Tabs >
        </div >
    )
}
