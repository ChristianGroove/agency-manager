"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateOrganizationBranding, getOrganizationBranding } from "@/app/actions/branding-actions"
import { Loader2, Paintbrush } from "lucide-react"
import { toast } from "sonner"

export default function BrandingPage() {
    const [brandColor, setBrandColor] = useState("#4F46E5")
    const [secondaryColor, setSecondaryColor] = useState("#00E0FF")
    const [portalTitle, setPortalTitle] = useState("Portal de Cliente")
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        loadBranding()
    }, [])

    const loadBranding = async () => {
        try {
            const data = await getOrganizationBranding()
            if (data) {
                setBrandColor(data.portal_primary_color || "#4F46E5")
                setSecondaryColor(data.portal_secondary_color || "#00E0FF")
                setPortalTitle(data.portal_title || "Portal de Cliente")
            }
        } catch (error) {
            console.error("Error loading branding:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            await updateOrganizationBranding({
                portal_primary_color: brandColor,
                portal_secondary_color: secondaryColor,
                portal_title: portalTitle
            })
            toast.success("Configuración guardada correctamente")
        } catch (error) {
            console.error("Error saving branding:", error)
            toast.error("Error al guardar la configuración")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="p-8 max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
                <Paintbrush className="h-8 w-8" />
                <div>
                    <h1 className="text-3xl font-bold">Portal Branding</h1>
                    <p className="text-gray-500">Personaliza la apariencia del portal de tus clientes</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Configuration Panel */}
                <Card>
                    <CardHeader>
                        <CardTitle>Configuración</CardTitle>
                        <CardDescription>
                            Ajusta los colores y el título de tu portal
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="portal-title">Título del Portal</Label>
                            <Input
                                id="portal-title"
                                value={portalTitle}
                                onChange={(e) => setPortalTitle(e.target.value)}
                                placeholder="Portal de Cliente"
                            />
                        </div>

                        <div>
                            <Label htmlFor="primary-color">Color Principal</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="primary-color"
                                    type="color"
                                    value={brandColor}
                                    onChange={(e) => setBrandColor(e.target.value)}
                                    className="w-20 h-10"
                                />
                                <Input
                                    type="text"
                                    value={brandColor}
                                    onChange={(e) => setBrandColor(e.target.value)}
                                    className="flex-1"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="secondary-color">Color Secundario</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="secondary-color"
                                    type="color"
                                    value={secondaryColor}
                                    onChange={(e) => setSecondaryColor(e.target.value)}
                                    className="w-20 h-10"
                                />
                                <Input
                                    type="text"
                                    value={secondaryColor}
                                    onChange={(e) => setSecondaryColor(e.target.value)}
                                    className="flex-1"
                                />
                            </div>
                        </div>

                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                "Guardar Cambios"
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Preview Panel */}
                <Card>
                    <CardHeader>
                        <CardTitle>Vista Previa</CardTitle>
                        <CardDescription>
                            Así se verán los elementos en tu portal
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-500 mb-2">Botón Principal</p>
                            <Button
                                style={{ backgroundColor: brandColor, borderColor: brandColor }}
                                className="text-white w-full"
                            >
                                Pagar Facturas
                            </Button>
                        </div>

                        <div>
                            <p className="text-sm text-gray-500 mb-2">Título del Portal</p>
                            <div className="p-4 bg-gray-50 rounded-lg border">
                                <h3 className="text-xl font-bold">{portalTitle}</h3>
                            </div>
                        </div>

                        <div>
                            <p className="text-sm text-gray-500 mb-2">Elemento Activo</p>
                            <div
                                style={{ backgroundColor: brandColor }}
                                className="p-3 rounded-lg text-white font-medium"
                            >
                                Tab Activo
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
