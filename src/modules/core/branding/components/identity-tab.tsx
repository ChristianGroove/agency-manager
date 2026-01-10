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

                <div className="space-y-3 pt-2">
                    <Label className="text-xs font-semibold text-gray-700">Redes Sociales</Label>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { key: 'instagram', icon: '📸', placeholder: '@usuario' },
                            { key: 'facebook', icon: 'fb', placeholder: 'facebook.com/...' },
                            { key: 'linkedin', icon: 'in', placeholder: 'linkedin.com/...' },
                            { key: 'twitter', icon: 'x', placeholder: '@usuario' }
                        ].map(s => (
                            <div key={s.key} className="relative">
                                <Input
                                    className="pl-8 h-8 text-xs bg-white"
                                    placeholder={s.placeholder}
                                    value={settings.socials?.[s.key as keyof typeof settings.socials] || ''}
                                    onChange={(e) => onChange({ ...settings, socials: { ...settings.socials, [s.key]: e.target.value } })}
                                />
                                <span className="absolute left-2.5 top-2 text-[10px] text-gray-400 font-mono">{s.icon}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Assets Group */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Logos & Activos</h3>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <Label className="text-xs font-medium">Logo Principal (Oscuro)</Label>
                            <p className="text-[10px] text-muted-foreground">Para fondos oscuros.</p>
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
                            <Label className="text-xs font-medium">Logo Secundario (Claro)</Label>
                            <p className="text-[10px] text-muted-foreground">Para documentacion.</p>
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

                {/* Magic Palette - Full Width */}
                {settings.logos.main && (
                    <div className="pt-2">
                        <MagicPalette
                            imageUrl={settings.logos.main}
                            onColorsFound={handleColorsFound}
                        />
                    </div>
                )}

                {/* Favicon - Compact */}
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
        </div>
    )
}

