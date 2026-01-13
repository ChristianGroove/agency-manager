"use client"

import { BrandingConfig } from "@/types/branding"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Globe, ShieldCheck, AlertTriangle } from "lucide-react"

interface DomainsTabProps {
    settings: BrandingConfig
    onChange: (newSettings: BrandingConfig) => void
}

export function DomainsTab({ settings, onChange }: DomainsTabProps) {
    const hasDomain = !!settings.custom_domain

    return (
        <div className="max-w-3xl space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Dominio Personalizado</CardTitle>
                    <CardDescription>
                        Sirve tu portal desde tu propio dominio (ej. portal.miagencia.com)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    <div className="space-y-4">
                        <Label>Tu Dominio</Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="portal.miagencia.com"
                                value={settings.custom_domain || ''}
                                onChange={(e) => onChange({ ...settings, custom_domain: e.target.value })}
                            />
                            {hasDomain && (
                                <Button variant="outline" className="border-yellow-500 text-yellow-600 bg-yellow-50">
                                    Verificación Pendiente
                                </Button>
                            )}
                        </div>
                        <p className="text-sm text-gray-500">
                            Ingresa el dominio completo que deseas usar.
                        </p>
                    </div>

                    {hasDomain && (
                        <div className="bg-gray-50 rounded-lg p-4 space-y-4 border">
                            <h4 className="font-semibold text-sm">Configuración DNS</h4>
                            <p className="text-sm text-gray-500">
                                Configura el siguiente registro en tu proveedor de DNS.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="p-3 bg-white border rounded">
                                    <span className="block font-medium mb-1">Tipo</span>
                                    <code className="bg-gray-100 px-2 py-0.5 rounded">CNAME</code>
                                </div>
                                <div className="p-3 bg-white border rounded">
                                    <span className="block font-medium mb-1">Nombre</span>
                                    <code className="bg-gray-100 px-2 py-0.5 rounded">portal</code> (o subdominio)
                                </div>
                                <div className="p-3 bg-white border rounded md:col-span-2">
                                    <span className="block font-medium mb-1">Valor / Destino</span>
                                    <code className="bg-gray-100 px-2 py-0.5 rounded w-full block mt-1">cname.pixy.com.co</code>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-yellow-600 text-xs bg-yellow-50 p-2 rounded">
                                <AlertTriangle className="h-4 w-4" />
                                <span>La propagación DNS puede tomar hasta 24 horas.</span>
                            </div>
                        </div>
                    )}

                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Certificado SSL</CardTitle>
                    <CardDescription>
                        La seguridad es automática. Gestionamos los certificados por ti.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                        <ShieldCheck className="h-5 w-5 text-green-500" />
                        <span>Gestión automática de SSL activa.</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
