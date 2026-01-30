"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { EmailTemplate, setActiveTemplate } from "@/modules/core/notifications/actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ArrowLeft, Check, Layout, Monitor, Smartphone, Sparkles, Info } from "lucide-react"
import { cn } from "@/lib/utils"
// New imports
import { SmtpConnectionTab } from "./smtp-connection-tab"
import { SmtpConfigFull } from "@/modules/core/notifications/actions/smtp-actions"

interface EmailSettingsPageProps {
    templates: EmailTemplate[]
    organizationId: string
    smtpConfig?: SmtpConfigFull | null
}

export function EmailSettingsPage({ templates, organizationId, smtpConfig }: EmailSettingsPageProps) {
    const router = useRouter()
    const [selectedType, setSelectedType] = useState<string>("invoice_new")
    const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop")

    // Group templates by key (Invoice vs Quote) and then by variant logic
    const processedTemplates = useMemo(() => {
        const groups: Record<string, EmailTemplate[]> = {}

        // Strategy: We want one card per "Style" (variant).
        // If the org has a custom version of "Bold", show that.
        // If not, show the System "Bold".

        const systemVariants: Record<string, Record<string, EmailTemplate>> = {}
        const orgVariants: Record<string, Record<string, EmailTemplate>> = {}

        templates.forEach(t => {
            const scope = t.organization_id ? orgVariants : systemVariants
            if (!scope[t.template_key]) scope[t.template_key] = {}
            scope[t.template_key][t.variant_name] = t
        })

        // Merge: Keys present in System
        Object.keys(systemVariants).forEach(key => {
            groups[key] = []
            const variants = systemVariants[key]
            Object.keys(variants).forEach(varName => {
                // Use Org version if exists, else System
                const templateToShow = orgVariants[key]?.[varName] || variants[varName]
                groups[key].push(templateToShow)
            })
        })

        return groups
    }, [templates])

    const currentVariants = processedTemplates[selectedType] || []

    // Determine which one is active
    const activeTemplate = currentVariants.find(t => t.is_active) || currentVariants[0] // Fallback

    const handleActivate = async (template: EmailTemplate) => {
        try {
            await setActiveTemplate(template.template_key, template.id)
            router.refresh()
        } catch (e) {
            console.error(e)
            alert("Error activating template")
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Motor de Correos</h1>
                    <p className="text-muted-foreground">Gestiona la identidad visual y técnica de tus notificaciones</p>
                </div>
            </div>

            <Tabs value={selectedType} onValueChange={setSelectedType} className="space-y-8">
                <TabsList className="bg-transparent border-b border-gray-200 dark:border-white/10 w-full justify-start rounded-none p-0 h-auto gap-6 overscroll-x-auto">
                    <TabsTrigger
                        value="invoice_new"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-pink data-[state=active]:bg-transparent px-0 py-2 pb-4 font-medium"
                    >
                        Facturación
                    </TabsTrigger>
                    <TabsTrigger
                        value="quote_new"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-pink data-[state=active]:bg-transparent px-0 py-2 pb-4 font-medium"
                    >
                        Cotizaciones
                    </TabsTrigger>
                    <TabsTrigger
                        value="payment_reminder"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-brand-pink data-[state=active]:bg-transparent px-0 py-2 pb-4 font-medium"
                    >
                        Recordatorios
                    </TabsTrigger>
                    <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-2" />
                    <TabsTrigger
                        value="connection"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:text-purple-600 data-[state=active]:bg-transparent px-0 py-2 pb-4 font-medium"
                    >
                        Conexión SMTP
                    </TabsTrigger>
                </TabsList>

                {/* VISUAL STUDIO TABS */}
                {selectedType !== 'connection' && (
                    <div className="space-y-8">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex gap-3 text-sm text-blue-800 dark:text-blue-300">
                            <Info className="w-5 h-5 shrink-0" />
                            <div>
                                <h4 className="font-semibold mb-1">¿Cómo funciona el Motor de Diseños?</h4>
                                <p>
                                    Selecciona un estilo visual (ej: "Bold" o "Corporate") y haz clic en <strong>Activar</strong>.
                                    A partir de ese momento, todas las notificaciones que envíe el sistema (Facturas, Cotizaciones) usarán automáticamente ese diseño.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            {/* Left: Template Bank */}
                            <div className="lg:col-span-4 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <Layout className="w-5 h-5 text-brand-pink" />
                                        Banco de Diseños
                                    </h3>
                                    <Badge variant="outline" className="border-brand-pink/20 text-brand-pink bg-brand-pink/5">
                                        {currentVariants.length} Estilos
                                    </Badge>
                                </div>

                                <div className="space-y-4">
                                    {currentVariants.map((template) => {
                                        const isActive = template.is_active || (activeTemplate?.id === template.id && currentVariants.length === 1)
                                        return (
                                            <div
                                                key={template.id}
                                                className={cn(
                                                    "group relative overflow-hidden rounded-xl border-2 transition-all duration-300 cursor-pointer hover:shadow-lg",
                                                    isActive
                                                        ? "border-brand-pink bg-brand-pink/5 shadow-md"
                                                        : "border-gray-100 dark:border-white/10 bg-white dark:bg-white/5 hover:border-brand-pink/50"
                                                )}
                                                onClick={() => activeTemplate?.id !== template.id && handleActivate(template)}
                                            >
                                                <div className="p-4">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className={cn(
                                                            "text-sm font-bold uppercase tracking-wider",
                                                            isActive ? "text-brand-pink" : "text-gray-600 dark:text-gray-300"
                                                        )}>
                                                            {template.variant_name}
                                                        </span>
                                                        {isActive && (
                                                            <div className="bg-brand-pink text-white rounded-full p-1">
                                                                <Check className="w-3 h-3" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <h4 className="font-semibold text-lg mb-1">{template.name}</h4>
                                                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                                                        {template.subject_template}
                                                    </p>

                                                    <div className="flex gap-2">
                                                        {!isActive && (
                                                            <Button size="sm" variant="secondary" className="w-full h-8 text-xs font-medium bg-white shadow-sm border" onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleActivate(template)
                                                            }}>
                                                                Activar
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Right: Live Preview */}
                            <div className="lg:col-span-8">
                                <div className="sticky top-6">
                                    <div className="bg-gray-900 rounded-3xl p-4 shadow-2xl border border-gray-800">
                                        <div className="flex items-center justify-between mb-4 px-4 text-gray-400">
                                            <div className="text-xs font-mono flex items-center gap-2">
                                                <span className="w-3 h-3 rounded-full bg-red-500" />
                                                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                                                <span className="w-3 h-3 rounded-full bg-green-500" />
                                                <span className="ml-4">preview.html</span>
                                            </div>
                                            <div className="flex gap-2 bg-gray-800 rounded-lg p-1">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className={cn("h-6 w-6 rounded hover:bg-gray-700", viewMode === 'desktop' && "bg-gray-700 text-white")}
                                                    onClick={() => setViewMode('desktop')}
                                                >
                                                    <Monitor className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className={cn("h-6 w-6 rounded hover:bg-gray-700", viewMode === 'mobile' && "bg-gray-700 text-white")}
                                                    onClick={() => setViewMode('mobile')}
                                                >
                                                    <Smartphone className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className={cn(
                                            "bg-white rounded-xl overflow-hidden transition-all duration-500 mx-auto border-4 border-gray-800",
                                            viewMode === 'mobile' ? "w-[375px] h-[667px]" : "w-full aspect-[16/10]"
                                        )}>
                                            {activeTemplate ? (
                                                <iframe
                                                    srcDoc={renderPreview(activeTemplate.body_html)}
                                                    className="w-full h-full border-0"
                                                    title="Email Preview"
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
                                                    <Sparkles className="w-12 h-12 opacity-20" />
                                                    <p>Selecciona una plantilla para previsualizar</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SMTP CONNECTION TAB */}
                <TabsContent value="connection" className="mt-0">
                    <SmtpConnectionTab organizationId={organizationId} initialConfig={smtpConfig} />
                </TabsContent>
            </Tabs>
        </div>
    )
}

function renderPreview(html: string) {
    let preview = html
        .replace(/{{agency_name}}/g, "Pixy Digital Agency")
        .replace(/{{client_name}}/g, "Juan Pérez")
        .replace(/{{invoice_number}}/g, "INV-001")
        .replace(/{{concept}}/g, "Desarrollo de Software")
        .replace(/{{formatted_amount}}/g, "$ 4,500,000 COP")
        .replace(/{{due_date}}/g, "30 Ene 2026")
        .replace(/{{date}}/g, "15 Ene 2026")
        .replace(/{{link_url}}/g, "#")
        .replace(/{{website_url}}/g, "www.pixy.com.co")
        .replace(/{{year}}/g, "2026")
        .replace(/{{logo_url}}/g, "https://ui.shadcn.com/avatars/02.png") // Mock Logo
        .replace(/{{primary_color}}/g, "#4F46E5")
        .replace(/{{secondary_color}}/g, "#EC4899")

    // Clean Handlebars Conditionals
    // Remove the opening/closing tags but keep content if simple
    preview = preview.replace(/{{#if\s+\w+}}/g, "")
    preview = preview.replace(/{{\/if}}/g, "")
    preview = preview.replace(/{{else}}/g, "")

    return preview
}
