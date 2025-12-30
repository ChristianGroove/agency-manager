"use client"

import { useState, useEffect } from "react"
import { getPlatformSettings, updatePlatformSettings, BrandingConfig } from "@/modules/core/branding/actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Loader2, Save, Upload, Palette } from "lucide-react"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"

export default function GlobalBrandingPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [branding, setBranding] = useState<BrandingConfig | null>(null)

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        try {
            const data = await getPlatformSettings()
            setBranding(data)
        } catch (error) {
            console.error(error)
            toast.error("Error al cargar configuración de marca")
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!branding) return
        setSaving(true)
        try {
            await updatePlatformSettings(branding)
            toast.success("Marca Global actualizada correctamente")
        } catch (error) {
            console.error(error)
            toast.error("Error al guardar cambios")
        } finally {
            setSaving(false)
        }
    }

    const updateName = (value: string) => {
        if (!branding) return
        setBranding({ ...branding, name: value })
    }

    const updateLogo = (type: keyof BrandingConfig['logos'], value: string) => {
        if (!branding) return
        setBranding({
            ...branding,
            logos: { ...branding.logos, [type]: value }
        })
    }

    const updateColor = (type: keyof BrandingConfig['colors'], value: string) => {
        if (!branding) return
        setBranding({
            ...branding,
            colors: { ...branding.colors, [type]: value }
        })
    }

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!branding) return null

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <Link href="/platform/admin">
                            <Button variant="ghost" size="icon" className="-ml-3 h-8 w-8 text-muted-foreground hover:text-foreground">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight">Marca Global</h1>
                    </div>
                    <p className="text-muted-foreground">
                        Define la identidad visual base de la plataforma (Queen Brand).
                    </p>
                </div>
                <Button onClick={handleSave} disabled={saving} size="lg" className="bg-indigo-600 hover:bg-indigo-700">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Cambios
                </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                {/* Left Column */}
                <div className="space-y-6">
                    {/* Identity Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Upload className="h-5 w-5 text-indigo-500" />
                                Logos e Identidad
                            </CardTitle>
                            <CardDescription>
                                Configura los activos gráficos principales de la plataforma.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Nombre de la Plataforma</Label>
                                <Input
                                    value={branding.name}
                                    onChange={(e) => updateName(e.target.value)}
                                    placeholder="Ej: Pixy Agency Manager"
                                />
                            </div>

                            <Separator />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Main Logo */}
                                <div className="space-y-3">
                                    <Label>Logo Principal (Dashboard)</Label>
                                    <div className="border border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-4 bg-gray-50/50 min-h-[120px]">
                                        {branding.logos.main ? (
                                            <img src={branding.logos.main} className="max-h-12 w-auto object-contain" alt="Main Logo" />
                                        ) : (
                                            <div className="text-xs text-start text-muted-foreground">Sin logo</div>
                                        )}
                                    </div>
                                    <Input
                                        placeholder="https://..."
                                        value={branding.logos.main || ''}
                                        onChange={(e) => updateLogo('main', e.target.value)}
                                        className="text-xs"
                                    />
                                </div>

                                {/* Portal Logo */}
                                <div className="space-y-3">
                                    <Label>Logo del Portal</Label>
                                    <div className="border border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-4 bg-gray-50/50 min-h-[120px]">
                                        {branding.logos.portal ? (
                                            <img src={branding.logos.portal} className="max-h-12 w-auto object-contain" alt="Portal Logo" />
                                        ) : (
                                            <div className="text-xs text-start text-muted-foreground">Sin logo</div>
                                        )}
                                    </div>
                                    <Input
                                        placeholder="https://..."
                                        value={branding.logos.portal || ''}
                                        onChange={(e) => updateLogo('portal', e.target.value)}
                                        className="text-xs"
                                    />
                                </div>
                            </div>

                            {/* Favicon Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label>Favicon / Isotipo</Label>
                                    <div className="border border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-4 bg-gray-50/50 h-[80px]">
                                        {branding.logos.favicon ? (
                                            <img src={branding.logos.favicon} className="h-8 w-8 object-contain" alt="Favicon" />
                                        ) : (
                                            <div className="text-xs text-start text-muted-foreground">Sin icono</div>
                                        )}
                                    </div>
                                    <Input
                                        placeholder="https://..."
                                        value={branding.logos.favicon || ''}
                                        onChange={(e) => updateLogo('favicon', e.target.value)}
                                        className="text-xs"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Colors Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Palette className="h-5 w-5 text-pink-500" />
                                Paleta de Colores
                            </CardTitle>
                            <CardDescription>
                                Define los colores primarios para botones, enlaces y acentos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <Label>Color Primario</Label>
                                    <div className="flex gap-2">
                                        <div
                                            className="w-10 h-10 rounded-lg border shadow-sm shrink-0"
                                            style={{ backgroundColor: branding.colors.primary }}
                                        />
                                        <Input
                                            value={branding.colors.primary}
                                            onChange={(e) => updateColor('primary', e.target.value)}
                                            placeholder="#000000"
                                            className="font-mono"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Color Secundario (Acento)</Label>
                                    <div className="flex gap-2">
                                        <div
                                            className="w-10 h-10 rounded-lg border shadow-sm shrink-0"
                                            style={{ backgroundColor: branding.colors.secondary }}
                                        />
                                        <Input
                                            value={branding.colors.secondary}
                                            onChange={(e) => updateColor('secondary', e.target.value)}
                                            placeholder="#000000"
                                            className="font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Login Background */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Pantalla de Acceso</CardTitle>
                            <CardDescription>
                                Imagen de fondo para la pantalla de Login y Portales.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <Label>Background URL</Label>
                                <Input
                                    placeholder="https://..."
                                    value={branding.logos.login_bg || ''}
                                    onChange={(e) => updateLogo('login_bg', e.target.value)}
                                />
                                {branding.logos.login_bg && (
                                    <div className="mt-4 rounded-lg overflow-hidden h-48 w-full border relative bg-gray-100">
                                        <img
                                            src={branding.logos.login_bg}
                                            className="absolute inset-0 w-full h-full object-cover"
                                            alt="Login Background"
                                        />
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    )
}
