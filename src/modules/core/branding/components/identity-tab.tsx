"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { BrandingConfig } from "../actions"
import { ImageUpload } from "@/components/ui/image-upload"
import { MagicPalette } from "./magic-palette"
import { EmailSignatureGenerator } from "./email-signature-generator"
import { Separator } from "@/components/ui/separator"
import { Globe } from "lucide-react"

interface IdentityTabProps {
    settings: BrandingConfig
    onChange: (newSettings: BrandingConfig) => void
}

export function IdentityTab({ settings, onChange }: IdentityTabProps) {

    const handleLogoChange = (url: string) => {
        onChange({
            ...settings,
            logos: { ...settings.logos, main: url }
        })
    }

    const handleFaviconChange = (url: string) => {
        onChange({
            ...settings,
            logos: { ...settings.logos, favicon: url }
        })
    }

    const handleColorsFound = (colors: { primary: string, secondary: string }) => {
        onChange({
            ...settings,
            colors: {
                primary: colors.primary,
                secondary: colors.secondary
            }
        })
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Agency Identity */}
                <Card>
                    <CardHeader>
                        <CardTitle>Identidad de la Agencia</CardTitle>
                        <CardDescription>
                            Información básica de tu agencia mostrada en correos y pies de página.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label>Nombre de la Agencia</Label>
                            <Input
                                value={settings.name}
                                onChange={(e) => onChange({ ...settings, name: e.target.value })}
                                placeholder="ej. Agencia Acme"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Sitio Web</Label>
                            <Input
                                value={settings.website}
                                onChange={(e) => onChange({ ...settings, website: e.target.value })}
                                placeholder="https://acme.com"
                            />
                        </div>

                        <Separator className="my-2" />

                        <div className="space-y-4">
                            <Label>Perfiles Sociales</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Facebook</Label>
                                    <Input
                                        value={settings.socials?.facebook || ''}
                                        onChange={(e) => onChange({ ...settings, socials: { ...settings.socials, facebook: e.target.value } })}
                                        placeholder="facebook.com/page"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Instagram</Label>
                                    <Input
                                        value={settings.socials?.instagram || ''}
                                        onChange={(e) => onChange({ ...settings, socials: { ...settings.socials, instagram: e.target.value } })}
                                        placeholder="@usuario"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Twitter / X</Label>
                                    <Input
                                        value={settings.socials?.twitter || ''}
                                        onChange={(e) => onChange({ ...settings, socials: { ...settings.socials, twitter: e.target.value } })}
                                        placeholder="@usuario"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">LinkedIn</Label>
                                    <Input
                                        value={settings.socials?.linkedin || ''}
                                        onChange={(e) => onChange({ ...settings, socials: { ...settings.socials, linkedin: e.target.value } })}
                                        placeholder="linkedin.com/company/..."
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator className="my-2" />

                        <div className="grid gap-2">
                            <Label className="flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                Slug del Portal
                            </Label>
                            <div className="flex items-center gap-2">
                                <div className="bg-muted px-3 py-2 rounded-l-md border border-r-0 text-muted-foreground text-sm">
                                    portal.pixy.com.co/
                                </div>
                                <Input
                                    className="rounded-l-none"
                                    placeholder="mi-agencia"
                                    disabled={true}
                                    value="mi-agencia (Próximamente)"
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                Cambiar esto invalidará los enlaces antiguos del portal.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Brand Assets */}
                <Card>
                    <CardHeader>
                        <CardTitle>Activos Visuales</CardTitle>
                        <CardDescription>
                            Sube tus logotipos. Los optimizaremos para todos los dispositivos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Main Logo (Dark Mode) */}
                        <div className="space-y-2">
                            <Label>Logo Principal (Fondo Oscuro)</Label>
                            <ImageUpload
                                value={settings.logos.main}
                                onChange={handleLogoChange}
                                label="Subir Logo (Oscuro)"
                                bucket="branding"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Se mostrará sobre fondos oscuros (Sidebar, Modo Oscuro).
                            </p>

                            {/* Magic Palette Trigger */}
                            {settings.logos.main && (
                                <div className="mt-2">
                                    <MagicPalette
                                        imageUrl={settings.logos.main}
                                        onColorsFound={handleColorsFound}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Main Logo (Light Mode) */}
                        <div className="space-y-2">
                            <Label>Logo Principal (Fondo Claro)</Label>
                            <ImageUpload
                                value={settings.logos.main_light || ''}
                                onChange={(url) => onChange({
                                    ...settings,
                                    logos: { ...settings.logos, main_light: url }
                                })}
                                label="Subir Logo (Claro)"
                                bucket="branding"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Se mostrará sobre fondos blancos (Sidebar Light Mode, Documentos).
                            </p>
                        </div>

                        <Separator />

                        {/* Favicon */}
                        <div className="space-y-3">
                            <Label>Favicon (Cuadrado)</Label>
                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                <div className="w-32 h-32 shrink-0">
                                    <ImageUpload
                                        value={settings.logos.favicon}
                                        onChange={handleFaviconChange}
                                        label="Icono"
                                        bucket="branding"
                                        className="h-full w-full object-contain"
                                        compact={true}
                                    />
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    <p>Recomendado: 512x512px PNG.</p>
                                    <p>Usado para pestañas del navegador e iconos móviles.</p>
                                </div>
                            </div>
                        </div>

                    </CardContent>
                </Card>
            </div>

            {/* Tools Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Herramientas</CardTitle>
                    <CardDescription>Utilidades generadas para tu equipo.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-4 max-w-xl">
                        <Label>Firma de Correo</Label>
                        <p className="text-sm text-gray-500 mb-2">
                            Genera una firma HTML estandarizada para los miembros de tu equipo usando tus activos de marca.
                        </p>
                        <EmailSignatureGenerator settings={settings} />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
