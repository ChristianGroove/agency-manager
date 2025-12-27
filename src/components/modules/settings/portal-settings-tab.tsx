"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Globe, Palette, Eye, Layout } from "lucide-react"

interface PortalSettingsTabProps {
    settings: any
    activeModules: string[]
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
    onSelectChange: (name: string, value: string) => void
    onSwitchChange: (name: string, checked: boolean) => void
}

export function PortalSettingsTab({
    settings,
    activeModules,
    onChange,
    onSelectChange,
    onSwitchChange
}: PortalSettingsTabProps) {
    const hasWhitelabelModule = activeModules.includes('module_whitelabel')

    return (
        <div className="space-y-6">
            {/* Portal Branding Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Palette className="w-5 h-5" />
                        <CardTitle>Branding del Portal</CardTitle>
                    </div>
                    <CardDescription>
                        Personaliza la apariencia de tu portal de clientes
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Logo Portal */}
                    <div className="space-y-2">
                        <Label htmlFor="portal_logo_url">Logo del Portal</Label>
                        <Input
                            id="portal_logo_url"
                            name="portal_logo_url"
                            value={settings.portal_logo_url || ''}
                            onChange={onChange}
                            placeholder="URL del logo (PNG o SVG recomendado)"
                        />
                        <p className="text-xs text-muted-foreground">
                            Logo que verán tus clientes en el portal
                        </p>
                    </div>

                    {/* Primary Color */}
                    <div className="space-y-2">
                        <Label htmlFor="portal_primary_color">Color Primario</Label>
                        <div className="flex gap-2">
                            <Input
                                id="portal_primary_color"
                                name="portal_primary_color"
                                type="color"
                                value={settings.portal_primary_color || '#F205E2'}
                                onChange={onChange}
                                className="w-20"
                            />
                            <Input
                                value={settings.portal_primary_color || '#F205E2'}
                                readOnly
                                className="flex-1"
                            />
                        </div>
                    </div>

                    {/* Secondary Color */}
                    <div className="space-y-2">
                        <Label htmlFor="portal_secondary_color">Color Secundario</Label>
                        <div className="flex gap-2">
                            <Input
                                id="portal_secondary_color"
                                name="portal_secondary_color"
                                type="color"
                                value={settings.portal_secondary_color || '#00E0FF'}
                                onChange={onChange}
                                className="w-20"
                            />
                            <Input
                                value={settings.portal_secondary_color || '#00E0FF'}
                                readOnly
                                className="flex-1"
                            />
                        </div>
                    </div>

                    <Separator className="my-6" />

                    {/* PREMIUM: Favicon */}
                    <div className="space-y-2">
                        <Label htmlFor="portal_favicon_url" className="flex items-center gap-2">
                            Favicon del Portal
                            {!hasWhitelabelModule && (
                                <Badge variant="outline" className="text-xs">Premium</Badge>
                            )}
                        </Label>
                        <Input
                            id="portal_favicon_url"
                            name="portal_favicon_url"
                            value={settings.portal_favicon_url || ''}
                            onChange={onChange}
                            placeholder="URL del favicon (.ico recomendado)"
                            disabled={!hasWhitelabelModule}
                        />
                        <p className="text-xs text-muted-foreground">
                            Icono que aparece en la pestaña del navegador
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Login Screen Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Layout className="w-5 h-5" />
                        <CardTitle>Pantalla de Login</CardTitle>
                        {!hasWhitelabelModule && (
                            <Badge variant="outline">Premium</Badge>
                        )}
                    </div>
                    <CardDescription>
                        Personaliza la experiencia de inicio de sesión
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Background Image */}
                    <div className="space-y-2">
                        <Label htmlFor="portal_login_background_url">
                            Imagen de Fondo
                        </Label>
                        <Input
                            id="portal_login_background_url"
                            name="portal_login_background_url"
                            value={settings.portal_login_background_url || ''}
                            onChange={onChange}
                            placeholder="URL de imagen de fondo"
                            disabled={!hasWhitelabelModule}
                        />
                        <p className="text-xs text-muted-foreground">
                            Imagen de fondo para la pantalla de login
                        </p>
                    </div>

                    {/* Background Color */}
                    <div className="space-y-2">
                        <Label htmlFor="portal_login_background_color">
                            Color de Fondo
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                id="portal_login_background_color"
                                name="portal_login_background_color"
                                type="color"
                                value={settings.portal_login_background_color || '#F3F4F6'}
                                onChange={onChange}
                                disabled={!hasWhitelabelModule}
                                className="w-20"
                            />
                            <Input
                                value={settings.portal_login_background_color || '#F3F4F6'}
                                readOnly
                                disabled={!hasWhitelabelModule}
                                className="flex-1"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Se usa si no hay imagen de fondo
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* SEO & Meta Tags */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Globe className="w-5 h-5" />
                        <CardTitle>SEO y Meta Tags</CardTitle>
                    </div>
                    <CardDescription>
                        Optimiza cómo se comparte tu portal en redes sociales
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* OG Title */}
                    <div className="space-y-2">
                        <Label htmlFor="portal_og_title">Título (Meta OG)</Label>
                        <Input
                            id="portal_og_title"
                            name="portal_og_title"
                            value={settings.portal_og_title || ''}
                            onChange={onChange}
                            placeholder="Título para WhatsApp, Facebook, etc."
                        />
                    </div>

                    {/* OG Description */}
                    <div className="space-y-2">
                        <Label htmlFor="portal_og_description">Descripción (Meta OG)</Label>
                        <Textarea
                            id="portal_og_description"
                            name="portal_og_description"
                            value={settings.portal_og_description || ''}
                            onChange={onChange}
                            placeholder="Descripción breve para compartir"
                            rows={2}
                        />
                    </div>

                    {/* OG Image */}
                    <div className="space-y-2">
                        <Label htmlFor="portal_og_image_url">Imagen (Meta OG)</Label>
                        <Input
                            id="portal_og_image_url"
                            name="portal_og_image_url"
                            value={settings.portal_og_image_url || ''}
                            onChange={onChange}
                            placeholder="URL de imagen para compartir (1200x630px recomendado)"
                        />
                        <p className="text-xs text-muted-foreground">
                            Imagen que aparece al compartir en WhatsApp, Facebook, Twitter
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Advanced Branding */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Eye className="w-5 h-5" />
                        <CardTitle>Branding Avanzado</CardTitle>
                        {!hasWhitelabelModule && (
                            <Badge variant="outline">Premium</Badge>
                        )}
                    </div>
                    <CardDescription>
                        Personalización completa de la identidad visual
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Font Family */}
                    <div className="space-y-2">
                        <Label htmlFor="brand_font_family">Tipografía de Marca</Label>
                        <Select
                            value={settings.brand_font_family || 'Inter'}
                            onValueChange={(value) => onSelectChange('brand_font_family', value)}
                            disabled={!hasWhitelabelModule}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Inter">Inter (Default)</SelectItem>
                                <SelectItem value="Roboto">Roboto</SelectItem>
                                <SelectItem value="Poppins">Poppins</SelectItem>
                                <SelectItem value="Montserrat">Montserrat</SelectItem>
                                <SelectItem value="Open Sans">Open Sans</SelectItem>
                                <SelectItem value="Lato">Lato</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Powered By Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="show_powered_by_footer">
                                Mostrar "Powered by"
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Pie de página con atribución en el portal
                            </p>
                        </div>
                        <Switch
                            id="show_powered_by_footer"
                            checked={settings.show_powered_by_footer ?? true}
                            onCheckedChange={(checked) => onSwitchChange('show_powered_by_footer', checked)}
                            disabled={!hasWhitelabelModule}
                        />
                    </div>

                    {/* Email Footer Text */}
                    <div className="space-y-2">
                        <Label htmlFor="email_footer_text">Pie de Página en Emails</Label>
                        <Textarea
                            id="email_footer_text"
                            name="email_footer_text"
                            value={settings.email_footer_text || ''}
                            onChange={onChange}
                            placeholder="Texto personalizado para footer de emails transaccionales"
                            rows={3}
                            disabled={!hasWhitelabelModule}
                        />
                        <p className="text-xs text-muted-foreground">
                            Aviso legal, confidencialidad, etc. para emails automáticos
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Premium Module CTA */}
            {!hasWhitelabelModule && (
                <Card className="border-dashed border-2">
                    <CardContent className="pt-6 text-center">
                        <h3 className="text-lg font-semibold mb-2">
                            Desbloquea White-Label Completo
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Activa el módulo <Badge variant="secondary">module_whitelabel</Badge> para acceder a:
                        </p>
                        <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                            <li>✨ Favicon personalizado</li>
                            <li>✨ Pantalla de login personalizada</li>
                            <li>✨ Tipografía de marca custom</li>
                            <li>✨ Remover "Powered by"</li>
                            <li>✨ Footer de emails personalizado</li>
                        </ul>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
