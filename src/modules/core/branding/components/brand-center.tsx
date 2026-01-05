"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Globe, LayoutTemplate, Palette, FileText, Lock } from "lucide-react"
import { BrandingConfig, updateOrganizationBranding } from "../actions"
import { toast } from "sonner"

import { IdentityTab } from "./identity-tab"
import { PortalTab } from "./portal-tab"
import { DocumentsTab } from "./documents-tab"
import { DomainsTab } from "./domains-tab"

interface BrandCenterProps {
    initialSettings: BrandingConfig
    activeModules: string[]
    variant?: 'page' | 'sheet'
}

export function BrandCenter({ initialSettings, activeModules, variant = 'page' }: BrandCenterProps) {
    const [settings, setSettings] = useState<BrandingConfig>(initialSettings)
    const [saving, setSaving] = useState(false)
    const hasWhiteLabel = activeModules.includes("module_whitelabel")

    const handleSave = async () => {
        setSaving(true)
        try {
            // Call server action to update
            await updateOrganizationBranding(settings)
            // await new Promise(resolve => setTimeout(resolve, 1000)) 
            toast.success("Branding actualizado correctamente")
        } catch (error) {
            toast.error("Error al actualizar branding")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                {variant === 'page' && (
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Centro de Marca</h2>
                        <p className="text-muted-foreground">
                            Gestiona la identidad de tu agencia en todos los puntos de contacto.
                        </p>
                    </div>
                )}
                {/* Always show save button, maybe float it or adjust if in sheet? 
                    For now keep it compatible. If in sheet, maybe it should be sticky or just inline.
                */}
                <div className={variant === 'sheet' ? "ml-auto" : ""}>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="identity" className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
                    <TabsTrigger value="identity">
                        <Globe className="mr-2 h-4 w-4" /> Identidad
                    </TabsTrigger>
                    <TabsTrigger value="portal">
                        <LayoutTemplate className="mr-2 h-4 w-4" /> Portal
                    </TabsTrigger>
                    <TabsTrigger value="documents">
                        <FileText className="mr-2 h-4 w-4" /> Documentos
                    </TabsTrigger>
                    <TabsTrigger value="domains">
                        {hasWhiteLabel ? <Globe className="mr-2 h-4 w-4 text-primary" /> : <Lock className="mr-2 h-4 w-4" />}
                        Dominios
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="identity" className="mt-6">
                    <IdentityTab settings={settings} onChange={setSettings} />
                </TabsContent>

                <TabsContent value="portal" className="mt-6">
                    {hasWhiteLabel ? (
                        <PortalTab settings={settings} onChange={setSettings} />
                    ) : (
                        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
                            <CardHeader>
                                <CardTitle className=" flex items-center gap-2 text-yellow-800 dark:text-yellow-500">
                                    <Lock className="h-5 w-5" />
                                    Portal Branding es una función Pro
                                </CardTitle>
                                <CardDescription className="text-yellow-700">
                                    Actualiza a White Label (Marca Blanca) para personalizar los colores, fuentes y pantalla de inicio del portal de clientes.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button className="bg-yellow-600 hover:bg-yellow-700 text-white">
                                    Desbloquear White Label
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="documents" className="mt-6">
                    <DocumentsTab settings={settings} onChange={setSettings} />
                </TabsContent>

                <TabsContent value="domains" className="mt-6">
                    {!hasWhiteLabel ? (
                        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
                            <CardHeader>
                                <CardTitle className=" flex items-center gap-2 text-yellow-800 dark:text-yellow-500">
                                    <Lock className="h-5 w-5" />
                                    Dominios Personalizados es una función Pro
                                </CardTitle>
                                <CardDescription className="text-yellow-700">
                                    Actualiza a White Label para servir el portal desde tu propio dominio (ej: portal.miagencia.com).
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button className="bg-yellow-600 hover:bg-yellow-700 text-white">
                                    Desbloquear White Label
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <DomainsTab settings={settings} onChange={setSettings} />
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
