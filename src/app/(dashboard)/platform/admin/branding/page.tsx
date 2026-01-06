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
import { ImageUpload } from "@/components/ui/image-upload"

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
                <Button onClick={handleSave} disabled={saving} size="lg" className="bg-brand-pink hover:bg-brand-pink/90">
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
                                    <ImageUpload
                                        value={branding.logos.main}
                                        onChange={(url) => updateLogo('main', url)}
                                        label="Subir Logo Dashboard"
                                    />
                                </div>

                                {/* Portal Logo */}
                                <div className="space-y-3">
                                    <Label>Logo del Portal</Label>
                                    <ImageUpload
                                        value={branding.logos.portal}
                                        onChange={(url) => updateLogo('portal', url)}
                                        label="Subir Logo Portal"
                                    />
                                </div>
                            </div>

                            {/* Favicon Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label>Favicon / Isotipo</Label>
                                    <ImageUpload
                                        value={branding.logos.favicon}
                                        onChange={(url) => updateLogo('favicon', url)}
                                        label="Subir Icono (32x32)"
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
                                <Palette className="h-5 w-5 text-brand-pink" />
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
                                        <div className="relative w-10 h-10 rounded-lg border shadow-sm shrink-0 overflow-hidden">
                                            <div
                                                className="absolute inset-0"
                                                style={{ backgroundColor: branding.colors.primary }}
                                            />
                                            <input
                                                type="color"
                                                value={branding.colors.primary}
                                                onChange={(e) => updateColor('primary', e.target.value)}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                        </div>
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
                                        <div className="relative w-10 h-10 rounded-lg border shadow-sm shrink-0 overflow-hidden">
                                            <div
                                                className="absolute inset-0"
                                                style={{ backgroundColor: branding.colors.secondary }}
                                            />
                                            <input
                                                type="color"
                                                value={branding.colors.secondary}
                                                onChange={(e) => updateColor('secondary', e.target.value)}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                        </div>
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
                                <ImageUpload
                                    value={branding.logos.login_bg}
                                    onChange={(url) => updateLogo('login_bg', url)}
                                    label="Subir Fondo"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    )
}
