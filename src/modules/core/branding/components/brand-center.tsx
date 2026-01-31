"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Globe, LayoutTemplate, Palette, FileText, Lock } from "lucide-react"
import { updateOrganizationBranding } from "../actions"; import { BrandingConfig } from "@/types/branding"
import { toast } from "sonner"

import { IdentityTab } from "./identity-tab"
import { PortalTab } from "./portal-tab"
import { DocumentsTab } from "./documents-tab"
import { DomainsTab } from "./domains-tab"

interface BrandCenterProps {
    initialSettings: BrandingConfig
    tierFeatures: Record<string, any>
    variant?: 'page' | 'sheet'
}

export function BrandCenter({ initialSettings, tierFeatures, variant = 'page' }: BrandCenterProps) {
    const [settings, setSettings] = useState<BrandingConfig>(initialSettings)
    const [saving, setSaving] = useState(false)

    // Tier-based permissions
    const canCustomizePortal = tierFeatures.custom_colors === true || tierFeatures.remove_pixy_branding === true
    const canCustomizeDomain = tierFeatures.custom_domain === true

    const handleSave = async () => {
        setSaving(true)
        try {
            await updateOrganizationBranding(settings)
            toast.success("Branding actualizado correctamente")

            // Force sidebar update
            window.dispatchEvent(new Event('branding-updated'))

            // Optional: router.refresh() if needed, but actions usually handle it.
        } catch (error) {
            toast.error("Error al actualizar branding")
        } finally {
            setSaving(false)
        }
    }

    // Unified render for both variants (Sheet and Page)
    // If page, we wrap in standard container, otherwise full height
    const content = (
        <div className="flex flex-col h-full relative bg-background">
            {/* Header - Only for Sheet or if we want sticky header in page too */}
            {variant === 'sheet' && (
                <div className="px-8 py-5 border-b border-gray-100 dark:border-white/10 bg-white/50 backdrop-blur z-20 flex-none text-left">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Centro de Marca</h2>
                    <p className="text-sm text-muted-foreground">Gestiona la identidad visual, portal y documentos.</p>
                </div>
            )}

            <Tabs defaultValue="identity" className="flex-1 flex flex-col overflow-hidden">
                {/* Sticky Tabs List */}
                <div className="px-8 py-2 bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 flex-none sticky top-0 z-10 backdrop-blur-md">
                    <TabsList className="bg-transparent p-0 w-full justify-start h-auto gap-6">
                        <TabsTrigger value="identity" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-brand-pink data-[state=active]:border-b-2 data-[state=active]:border-brand-pink rounded-none px-0 pb-2 text-gray-500 font-medium text-sm flex items-center gap-2">
                            <Globe className="h-3.5 w-3.5" /> Identidad
                        </TabsTrigger>
                        <TabsTrigger value="portal" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-brand-pink data-[state=active]:border-b-2 data-[state=active]:border-brand-pink rounded-none px-0 pb-2 text-gray-500 font-medium text-sm flex items-center gap-2">
                            <LayoutTemplate className="h-3.5 w-3.5" /> Portal
                        </TabsTrigger>
                        <TabsTrigger value="documents" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-brand-pink data-[state=active]:border-b-2 data-[state=active]:border-brand-pink rounded-none px-0 pb-2 text-gray-500 font-medium text-sm flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5" /> Documentos
                        </TabsTrigger>
                        <TabsTrigger value="domains" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-brand-pink data-[state=active]:border-b-2 data-[state=active]:border-brand-pink rounded-none px-0 pb-2 text-gray-500 font-medium text-sm flex items-center gap-2">
                            {canCustomizeDomain ? <Globe className="h-3.5 w-3.5 text-primary" /> : <Lock className="h-3.5 w-3.5" />}
                            Dominios
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto bg-gray-50/30">
                    <div className="p-6 m-0 animate-in fade-in-50 pb-24">
                        <TabsContent value="identity" className="mt-0 space-y-6">
                            <IdentityTab settings={settings} onChange={setSettings} tierFeatures={tierFeatures} />
                        </TabsContent>

                        <TabsContent value="portal" className="mt-0">
                            {canCustomizePortal ? (
                                <PortalTab settings={settings} onChange={setSettings} />
                            ) : (
                                <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
                                    <CardHeader>
                                        <CardTitle className=" flex items-center gap-2 text-yellow-800 dark:text-yellow-500">
                                            <Lock className="h-5 w-5" />
                                            Portal Branding es una función Pro
                                        </CardTitle>
                                        <CardDescription className="text-yellow-700">
                                            Actualiza a White Label para personalizar el portal.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Button className="bg-yellow-600 hover:bg-yellow-700 text-white">Desbloquear</Button>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        <TabsContent value="documents" className="mt-0">
                            <DocumentsTab settings={settings} onChange={setSettings} />
                        </TabsContent>

                        <TabsContent value="domains" className="mt-0">
                            {canCustomizeDomain ? (
                                <DomainsTab settings={settings} onChange={setSettings} />
                            ) : (
                                <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
                                    <CardHeader>
                                        <CardTitle className=" flex items-center gap-2 text-yellow-800 dark:text-yellow-500">
                                            <Lock className="h-5 w-5" />
                                            Dominios Personalizados es una función Pro
                                        </CardTitle>
                                    </CardHeader>
                                </Card>
                            )}
                        </TabsContent>
                    </div>
                </div>

                {/* Sticky Footer */}
                <div className="p-5 border-t border-gray-100 bg-white/80 backdrop-blur flex items-center justify-end gap-3 z-20 absolute bottom-0 left-0 right-0">
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-brand-pink hover:bg-brand-pink/90 text-white shadow-lg shadow-brand-pink/20 rounded-xl px-8"
                    >
                        {saving ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                </div>
            </Tabs>
        </div>
    )

    if (variant === 'page') {
        return <div className="h-[calc(100vh-100px)] rounded-xl border border-gray-200 overflow-hidden shadow-sm">{content}</div>
    }

    return content
}
