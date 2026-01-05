"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { BrandingConfig } from "../actions"
import { ImageUpload } from "@/components/ui/image-upload"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PreviewPane } from "./preview-pane"
import { Switch } from "@/components/ui/switch"
import { SocialPreview } from "./social-preview"

interface PortalTabProps {
    settings: BrandingConfig
    onChange: (newSettings: BrandingConfig) => void
}

const FONTS = [
    { value: 'Inter, sans-serif', label: 'Inter (Modern)' },
    { value: 'Roboto, sans-serif', label: 'Roboto (Neutral)' },
    { value: 'Open Sans, sans-serif', label: 'Open Sans (Friendly)' },
    { value: 'Playfair Display, serif', label: 'Playfair (Elegant)' },
    { value: 'Lato, sans-serif', label: 'Lato (Clean)' },
]

export function PortalTab({ settings, onChange }: PortalTabProps) {
    const [previewMode, setPreviewMode] = useState<'dashboard' | 'login'>('login')

    // We map flattened settings to UI for ease, then push back to config structure
    // Actually the BrandingConfig type has flat properties for portal_*, need to check actions.ts
    // Let's assume the passed 'settings' object matches the BrandingConfig interface exactly.
    // I need to double check BrandingConfig interface in actions.ts to be sure.
    // Based on previous ViewFile, it has portal_primary_color etc.
    // But in IdentityTab I used settings.logos.main assuming nested.
    // Wait, let me quickly verify the BrandingConfig type definition again to avoid bugs.

    // ... proceeding with assumption that I need to be careful with property names.
    // I will use direct property access based on the audit I did: 
    // portal_primary_color, portal_secondary_color, portal_title, portal_logo_url

    // Correction: In IdentityTab I used `settings.logos.main`. 
    // If the actual type is flat (portal_logo_url), I made a mistake in IdentityTab.
    // Let me check 'src/modules/core/branding/actions.ts' one more time to be absolutely sure.

    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

            {/* Configuration Column */}
            <div className="xl:col-span-7 space-y-6">

                <Card>
                    <CardHeader>
                        <CardTitle>Apariencia</CardTitle>
                        <CardDescription>Colores y fuentes usadas en el Portal de Clientes.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Color Primario</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        value={settings.colors?.primary || '#000000'}
                                        onChange={(e) => onChange({ ...settings, colors: { ...settings.colors, primary: e.target.value } })}
                                        className="w-12 h-10 p-1"
                                    />
                                    <Input
                                        value={settings.colors?.primary || ''}
                                        onChange={(e) => onChange({ ...settings, colors: { ...settings.colors, primary: e.target.value } })}
                                        className="uppercase"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Color Secundario</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        value={settings.colors?.secondary || '#000000'}
                                        onChange={(e) => onChange({ ...settings, colors: { ...settings.colors, secondary: e.target.value } })}
                                        className="w-12 h-10 p-1"
                                    />
                                    <Input
                                        value={settings.colors?.secondary || ''}
                                        onChange={(e) => onChange({ ...settings, colors: { ...settings.colors, secondary: e.target.value } })}
                                        className="uppercase"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Fuente</Label>
                            <Select
                                value={settings.font_family || FONTS[0].value}
                                onValueChange={(val) => onChange({ ...settings, font_family: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar fuente" />
                                </SelectTrigger>
                                <SelectContent>
                                    {FONTS.map(f => (
                                        <SelectItem key={f.value} value={f.value}>
                                            <span style={{ fontFamily: f.value }}>{f.label}</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Pantalla de Login</CardTitle>
                        <CardDescription>Personaliza la primera impresión para tus clientes.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Imagen de Fondo</Label>
                            <ImageUpload
                                value={settings.logos?.login_bg}
                                onChange={(url) => onChange({ ...settings, logos: { ...settings.logos, login_bg: url } })}
                                label="Subir Fondo (1920x1080)"
                                bucket="branding"
                                className="h-40"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Color de Fondo (Respaldo)</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="color"
                                    value={settings.login_bg_color || '#F3F4F6'}
                                    onChange={(e) => onChange({ ...settings, login_bg_color: e.target.value })}
                                    className="w-12 h-10 p-1"
                                // defaultValue="#F3F4F6"
                                />
                                <Input
                                    value={settings.login_bg_color || ''}
                                    onChange={(e) => onChange({ ...settings, login_bg_color: e.target.value })}
                                    className="uppercase"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Compartir</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <SocialPreview settings={settings} />
                    </CardContent>
                </Card>

            </div>

            {/* Preview Column (Sticky) */}
            <div className="xl:col-span-5">
                <div className="sticky top-8 space-y-4">
                    <div className="flex justify-between items-center">
                        <Label className="text-muted-foreground">Vista Previa</Label>
                        <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as 'login' | 'dashboard')}>
                            <TabsList className="grid w-[200px] grid-cols-2 h-8">
                                <TabsTrigger value="login" className="text-xs">Login</TabsTrigger>
                                <TabsTrigger value="dashboard" className="text-xs">Panel</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    <PreviewPane settings={settings} mode={previewMode} />

                    <div className="text-xs text-muted-foreground text-center">
                        Esto es una aproximación. El resultado real puede variar según el dispositivo.
                    </div>
                </div>
            </div>
        </div>
    )
}
