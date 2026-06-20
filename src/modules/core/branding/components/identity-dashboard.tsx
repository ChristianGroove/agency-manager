"use client"

import { useState } from "react"
import { BrandingConfig } from "@/types/branding"
import { updateOrganizationBranding } from "../actions"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Loader2, Save, ScanFace, Palette, Globe, Layout, FileText, CheckCircle2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock } from "lucide-react"
import { DirectUpgradeButton } from "./direct-upgrade-button"

// Tabs
import { IdentityTab } from "./identity-tab"
import { PortalTab } from "./portal-tab"
import { ContactTab } from "./contact-tab"
import { DocumentsTab } from "./documents-tab"
import { DomainsTab } from "./domains-tab"
import { OperationsTab } from "./operations-tab"
import { PreviewPane } from "./preview-pane"
import { SectionHeader } from "@/components/layout/section-header"

interface IdentityDashboardProps {
    initialSettings: BrandingConfig
    tierFeatures: any
}

export function IdentityDashboard({ initialSettings, tierFeatures }: IdentityDashboardProps) {
    const [settings, setSettings] = useState<BrandingConfig>(initialSettings)
    const [activeTab, setActiveTab] = useState("brand")
    const [isSaving, setIsSaving] = useState(false)
    const { toast } = useToast()
    const router = useRouter()

    const handleSettingChange = (key: string, value: any) => {
        setSettings(prev => ({
            ...prev,
            [key]: value
        }))
    }

    const handleSave = async () => {
        console.log('[DASHBOARD_DEBUG] Saving Identity:', settings)
        setIsSaving(true)
        try {
            await updateOrganizationBranding(settings)
            toast({
                title: "ADN Actualizado",
                description: "La identidad de tu negocio se ha guardado correctamente.",
                className: "bg-green-50 border-green-200 text-green-900"
            })

            // Force sidebar update (clears client cache)
            window.dispatchEvent(new Event('branding-updated'))

            router.refresh()
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            })
        } finally {
            setIsSaving(false)
        }
    }

    // Determine preview mode based on tab
    const previewMode =
        activeTab === "portal" ? "login" :
        "dashboard" // Default

    return (
        <div className="space-y-6">
            <SectionHeader
                title="ADN del Negocio"
                subtitle="Centro de Identidad y Marca"
                icon={ScanFace}
                action={
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-[var(--brand-pink)] hover:bg-[var(--brand-pink)]/90 text-white shadow-lg shadow-[var(--brand-pink)]/20 transition-all"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Guardar Identidad
                    </Button>
                }
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 h-auto p-1 bg-zinc-100/50 dark:bg-white/5 backdrop-blur-sm border border-zinc-200/50 dark:border-white/10 rounded-xl">
                    <TabsTrigger
                        value="brand"
                        className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-[var(--brand-pink)] dark:data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg py-2.5 transition-all"
                    >
                        <Palette className="w-4 h-4" />
                        <span>Esencia</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="contact"
                        className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-[var(--brand-pink)] dark:data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg py-2.5 transition-all"
                    >
                        <Globe className="w-4 h-4" />
                        <span>Contacto</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="portal"
                        className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-[var(--brand-pink)] dark:data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg py-2.5 transition-all"
                    >
                        <Layout className="w-4 h-4" />
                        <span>Portal</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="documents"
                        className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-[var(--brand-pink)] dark:data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg py-2.5 transition-all"
                    >
                        <FileText className="w-4 h-4" />
                        <span>Documentos</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="domains"
                        className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-[var(--brand-pink)] dark:data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg py-2.5 transition-all"
                    >
                        <Globe className="w-4 h-4" />
                        <span>Dominios</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="operations"
                        className="flex items-center gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-[var(--brand-pink)] dark:data-[state=active]:text-white data-[state=active]:shadow-sm rounded-lg py-2.5 transition-all"
                    >
                        <Globe className="w-4 h-4" />
                        <span>Operación</span>
                    </TabsTrigger>
                </TabsList>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 glass-card rounded-2xl p-6 min-h-[500px]">
                        <TabsContent value="brand" className="mt-0">
                            <IdentityTab
                                settings={settings}
                                onChange={setSettings}
                                tierFeatures={tierFeatures}
                            />
                        </TabsContent>

                        <TabsContent value="contact" className="mt-0">
                            <ContactTab
                                settings={settings}
                                onChange={handleSettingChange}
                            />
                        </TabsContent>

                        <TabsContent value="portal" className="mt-0">
                            {tierFeatures?.custom_colors || tierFeatures?.remove_pixy_branding ? (
                                <PortalTab
                                    settings={settings}
                                    onChange={setSettings}
                                    tierFeatures={tierFeatures}
                                />
                            ) : (
                                <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
                                    <CardHeader>
                                        <CardTitle className=" flex items-center gap-2 text-yellow-800 dark:text-yellow-500">
                                            <Lock className="h-5 w-5" />
                                            Portal Branding es una función Pro
                                        </CardTitle>
                                        <CardDescription className="text-yellow-700">
                                            Actualiza a Branding Total para personalizar el portal, colores y remover la marca de Pixy de tus documentos.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <DirectUpgradeButton />
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        <TabsContent value="documents" className="mt-0">
                            <DocumentsTab
                                settings={settings}
                                onChange={setSettings}
                                tierFeatures={tierFeatures}
                            />
                        </TabsContent>

                        <TabsContent value="domains" className="mt-0">
                            <DomainsTab
                                settings={settings}
                                onChange={setSettings}
                                tierFeatures={tierFeatures}
                            />
                        </TabsContent>

                        <TabsContent value="operations" className="mt-0">
                            <OperationsTab
                                settings={settings}
                                onChange={handleSettingChange}
                            />
                        </TabsContent>
                    </div>

                    <div className="lg:col-span-1">
                        <PreviewPane mode={previewMode} settings={settings} />
                    </div>
                </div>
            </Tabs>
        </div>
    )
}
