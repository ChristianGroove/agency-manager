"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { BrandingConfig } from "@/types/branding"
import { ImageUpload } from "@/components/ui/image-upload"
import { MagicPalette } from "./magic-palette"
import { EmailSignatureGenerator } from "./email-signature-generator"
import { Separator } from "@/components/ui/separator"
import { Globe, Lock } from "lucide-react"

interface IdentityTabProps {
    settings: BrandingConfig
    onChange: (newSettings: BrandingConfig) => void
    tierFeatures?: any
}

export function IdentityTab({ settings, onChange, tierFeatures }: IdentityTabProps) {

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
        <div className="space-y-8">
            {/* Identity Group */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Identidad Digital</h3>
                </div>

                <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">Nombre de la Agencia</Label>
                        <Input
                            value={settings.name}
                            onChange={(e) => onChange({ ...settings, name: e.target.value })}
                            placeholder="Agency Name"
                            className="bg-white h-9"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-700">Sitio Web</Label>
                        <Input
                            value={settings.website}
                            onChange={(e) => onChange({ ...settings, website: e.target.value })}
                            placeholder="https://agency.com"
                            className="bg-white h-9"
                        />
                    </div>
                </div>

            </div>

            {/* Assets Group */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100 justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Logos & Activos</h3>
                    {tierFeatures && !tierFeatures.custom_logo && (
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            <Lock className="w-3 h-3" />
                            <span>Función Pro</span>
                        </div>
                    )}
                </div>

                <div className={tierFeatures && !tierFeatures.custom_logo ? "opacity-50 pointer-events-none grayscale relative" : ""}>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-medium">Logo Principal</Label>
                                <p className="text-[10px] text-muted-foreground">Para fondos oscuros (Ej: Sidebar, Header).</p>
                            </div>
                            <ImageUpload
                                value={settings.logos.main}
                                onChange={handleLogoChange}
                                label="Subir"
                                bucket="branding"
                                className="h-24 bg-gray-900/5 hover:bg-gray-900/10 transition-colors border-dashed"
                                compact={true}
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-medium">Logo Secundario</Label>
                                <p className="text-[10px] text-muted-foreground">Para fondos claros y documentación.</p>
                            </div>
                            <ImageUpload
                                value={settings.logos.main_light || ''}
                                onChange={(url) => onChange({ ...settings, logos: { ...settings.logos, main_light: url } })}
                                label="Subir"
                                bucket="branding"
                                className="h-24 bg-gray-50 hover:bg-gray-100 transition-colors border-dashed"
                                compact={true}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Brand Colors & Magic Palette */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100 justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Colores de Marca</h3>
                    {tierFeatures && !tierFeatures.custom_colors && (
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            <Lock className="w-3 h-3" />
                            <span>Función Pro</span>
                        </div>
                    )}
                </div>

                <div className={tierFeatures && !tierFeatures.custom_colors ? "opacity-50 pointer-events-none grayscale" : ""}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Magic Palette (Left) */}
                        <div className="space-y-3">
                            {settings.logos.main ? (
                                <MagicPalette
                                    imageUrl={settings.logos.main}
                                    onColorsFound={handleColorsFound}
                                />
                            ) : (
                                <div className="p-4 border border-dashed rounded-lg bg-gray-50 text-xs text-muted-foreground text-center">
                                    Sube un Logo Principal para usar Magic Palette
                                </div>
                            )}
                        </div>

                        {/* Editable Colors (Right) */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium">Primario</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        value={settings.colors?.primary || '#000000'}
                                        onChange={(e) => onChange({ ...settings, colors: { ...settings.colors, primary: e.target.value } })}
                                        className="w-10 h-9 p-1 shrink-0"
                                    />
                                    <Input
                                        value={settings.colors?.primary || ''}
                                        onChange={(e) => onChange({ ...settings, colors: { ...settings.colors, primary: e.target.value } })}
                                        className="uppercase h-9 font-mono text-xs"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-medium">Secundario</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        value={settings.colors?.secondary || '#000000'}
                                        onChange={(e) => onChange({ ...settings, colors: { ...settings.colors, secondary: e.target.value } })}
                                        className="w-10 h-9 p-1 shrink-0"
                                    />
                                    <Input
                                        value={settings.colors?.secondary || ''}
                                        onChange={(e) => onChange({ ...settings, colors: { ...settings.colors, secondary: e.target.value } })}
                                        className="uppercase h-9 font-mono text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Favicon Section */}
            <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Favicon</h3>
                </div>

                <div className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                    <div className="w-16 h-16 shrink-0 aspect-square">
                        <ImageUpload
                            value={settings.logos.favicon}
                            onChange={handleFaviconChange}
                            label=""
                            bucket="branding"
                            className="h-full w-full object-contain bg-white"
                            compact={true}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs font-semibold">Favicon</Label>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                            Icono pequeño (512px) para pestañas del navegador y app móvil.
                        </p>
                    </div>
                </div>
            </div>



            {/* Portal Info */}
            <div className="bg-brand-pink/5 border border-brand-pink/10 rounded-xl p-4 flex items-center justify-between">
                <div className="space-y-1">
                    <Label className="text-brand-pink font-bold text-xs">DIRECCIÓN DEL PORTAL</Label>
                    <div className="flex items-center gap-1 text-sm text-brand-pink/80">
                        portal.pixy.com.co/<span className="font-bold underline">mi-agencia</span>
                    </div>
                </div>
                {/* Could add 'Copy' button here */}
            </div>
        </div >
    )
}

