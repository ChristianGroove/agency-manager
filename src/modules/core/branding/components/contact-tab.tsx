"use client"

import { BrandingConfig } from "@/types/branding"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Facebook, Instagram, Linkedin, Twitter, Youtube, Globe, MapPin, Mail, Phone } from "lucide-react"

interface ContactTabProps {
    settings: BrandingConfig
    onChange: (key: string, value: any) => void
}

export function ContactTab({ settings, onChange }: ContactTabProps) {
    const handleSocialChange = (key: string, value: string) => {
        onChange('socials', {
            ...settings.socials,
            [key]: value
        })
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Contact Info */}
            <Card className="border-gray-100 dark:border-white/10 shadow-sm bg-white dark:bg-white/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-indigo-500" />
                        Información de Contacto
                    </CardTitle>
                    <CardDescription>
                        Datos públicos que aparecen en el pie de página de tus documentos y portal.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Correo de Contacto</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={settings.email || ''}
                                onChange={(e) => onChange('email', e.target.value)}
                                placeholder="contacto@tuagencia.com"
                                className="pl-9"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Teléfono / WhatsApp</Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={settings.phone || ''}
                                onChange={(e) => onChange('phone', e.target.value)}
                                placeholder="+57 300 123 4567"
                                className="pl-9"
                            />
                        </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label>Dirección Física</Label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={settings.address || ''}
                                onChange={(e) => onChange('address', e.target.value)}
                                placeholder="Calle 123 # 45-67, Ciudad"
                                className="pl-9"
                            />
                        </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label>Sitio Web</Label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={settings.website || ''}
                                onChange={(e) => onChange('website', e.target.value)}
                                placeholder="https://www.tuagencia.com"
                                className="pl-9"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Social Media */}
            <Card className="border-gray-100 dark:border-white/10 shadow-sm bg-white dark:bg-white/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="w-5 h-5 text-pink-500" />
                        Redes Sociales
                    </CardTitle>
                    <CardDescription>
                        Enlaces a tus perfiles sociales para el portal de clientes.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-xs font-medium"><Instagram className="w-3.5 h-3.5 text-pink-600" /> Instagram</Label>
                            <Input
                                value={settings.socials.instagram || ''}
                                onChange={(e) => handleSocialChange('instagram', e.target.value)}
                                placeholder="https://instagram.com/..."
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-xs font-medium"><Facebook className="w-3.5 h-3.5 text-blue-600" /> Facebook</Label>
                            <Input
                                value={settings.socials.facebook || ''}
                                onChange={(e) => handleSocialChange('facebook', e.target.value)}
                                placeholder="https://facebook.com/..."
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-xs font-medium"><Linkedin className="w-3.5 h-3.5 text-blue-700" /> LinkedIn</Label>
                            <Input
                                value={settings.socials.linkedin || ''}
                                onChange={(e) => handleSocialChange('linkedin', e.target.value)}
                                placeholder="https://linkedin.com/in/..."
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-xs font-medium"><Twitter className="w-3.5 h-3.5 text-sky-500" /> X (Twitter)</Label>
                            <Input
                                value={settings.socials.twitter || ''}
                                onChange={(e) => handleSocialChange('twitter', e.target.value)}
                                placeholder="https://x.com/..."
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-xs font-medium"><Youtube className="w-3.5 h-3.5 text-red-600" /> YouTube</Label>
                            <Input
                                value={settings.socials.youtube || ''}
                                onChange={(e) => handleSocialChange('youtube', e.target.value)}
                                placeholder="https://youtube.com/..."
                                className="h-9"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
