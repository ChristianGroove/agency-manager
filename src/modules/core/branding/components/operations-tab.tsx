"use client"

import { BrandingConfig } from "@/types/branding"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Globe, Settings2, Calendar, DollarSign, Languages, Clock } from "lucide-react"

interface OperationsTabProps {
    settings: BrandingConfig
    onChange: (key: string, value: any) => void
}

export function OperationsTab({ settings, onChange }: OperationsTabProps) {
    return (
        <div className="space-y-6">

            {/* Regional Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-indigo-500" />
                        Configuración Regional
                    </CardTitle>
                    <CardDescription>
                        Define la ubicación y moneda de tu operación.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="country">País</Label>
                            <Input
                                id="country"
                                value={settings.country || ''}
                                onChange={(e) => onChange('country', e.target.value)}
                                placeholder="Ej: Colombia"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="currency">Moneda Base</Label>
                            <Select
                                value={settings.currency || 'COP'}
                                onValueChange={(val) => onChange('currency', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar moneda" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="COP">COP (Peso Colombiano)</SelectItem>
                                    <SelectItem value="USD">USD (Dólar Americanos)</SelectItem>
                                    <SelectItem value="EUR">EUR (Euro)</SelectItem>
                                    <SelectItem value="MXN">MXN (Peso Mexicano)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="timezone">Zona Horaria</Label>
                            <Input
                                id="timezone"
                                value={settings.timezone || ''}
                                onChange={(e) => onChange('timezone', e.target.value)}
                                placeholder="Ej: America/Bogota"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* System Preferences */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5 text-indigo-500" />
                        Preferencias del Sistema
                    </CardTitle>
                    <CardDescription>
                        Define formatos y lenguajes por defecto.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Languages */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Languages className="h-4 w-4 text-gray-500" /> Lenguaje App
                            </Label>
                            <Select
                                value={settings.language || 'es'}
                                onValueChange={(val) => onChange('language', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="es">Español</SelectItem>
                                    <SelectItem value="en">English</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Languages className="h-4 w-4 text-gray-500" /> Lenguaje Portal
                            </Label>
                            <Select
                                value={settings.portal_language || 'es'}
                                onValueChange={(val) => onChange('portal_language', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="es">Español</SelectItem>
                                    <SelectItem value="en">English</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Formats */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-500" /> Formato Fecha
                            </Label>
                            <Select
                                value={settings.date_format || 'DD/MM/YYYY'}
                                onValueChange={(val) => onChange('date_format', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</SelectItem>
                                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</SelectItem>
                                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-gray-500" /> Formato Moneda
                            </Label>
                            <Select
                                value={settings.currency_format || 'es-CO'}
                                onValueChange={(val) => onChange('currency_format', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="es-CO">Colombia ($ 1.000.000)</SelectItem>
                                    <SelectItem value="en-US">USA ($1,000,000.00)</SelectItem>
                                    <SelectItem value="es-MX">México ($ 1,000,000.00)</SelectItem>
                                    <SelectItem value="de-DE">Europa (1.000.000,00 €)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
