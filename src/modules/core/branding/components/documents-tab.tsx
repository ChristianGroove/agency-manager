"use client"

import { BrandingConfig } from "../actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Info } from "lucide-react"
import { DocumentPreview } from "./document-preview"

interface DocumentsTabProps {
    settings: BrandingConfig
    onChange: (newSettings: BrandingConfig) => void
}

export function DocumentsTab({ settings, onChange }: DocumentsTabProps) {
    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-5 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Estilo de Documento</CardTitle>
                        <CardDescription>
                            Configura cómo se ven tus Facturas y Cotizaciones en PDF.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3 text-sm">
                            <Info className="h-5 w-5 text-blue-600 shrink-0" />
                            <div className="text-blue-700">
                                <span className="font-semibold block text-blue-800 mb-1">Estilo Automático</span>
                                Tus documentos usan automáticamente el <strong>Nombre de la Agencia</strong> y el <strong>Logo Principal</strong> definidos en la pestaña de Identidad.
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>Color de Acento</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="color"
                                        value={settings.colors?.primary || '#000000'}
                                        onChange={(e) => onChange({ ...settings, colors: { ...settings.colors, primary: e.target.value } })}
                                        className="w-12 h-10 p-1"
                                    />
                                    <Input
                                        value={settings.colors?.primary || '#000000'}
                                        onChange={(e) => onChange({ ...settings, colors: { ...settings.colors, primary: e.target.value } })}
                                        className="w-28"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Tamaño del Logo</Label>
                                <Select
                                    value={settings.document_logo_size || 'medium'}
                                    onValueChange={(val: any) => onChange({ ...settings, document_logo_size: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="small">Pequeño</SelectItem>
                                        <SelectItem value="medium">Mediano</SelectItem>
                                        <SelectItem value="large">Grande</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center justify-between border p-3 rounded-lg">
                                <div className="space-y-0.5">
                                    <Label className="text-sm">Mostrar Marca de Agua</Label>
                                    <p className="text-xs text-muted-foreground">Mostrar logo tenue en el fondo</p>
                                </div>
                                <Switch
                                    checked={settings.document_show_watermark !== false}
                                    onCheckedChange={(checked) => onChange({ ...settings, document_show_watermark: checked })}
                                />
                            </div>
                        </div>

                    </CardContent>
                </Card>
            </div>

            <div className="xl:col-span-7">
                <div className="sticky top-8">
                    <div className="mb-4 flex items-center justify-between">
                        <Label className="text-muted-foreground">Vista Previa de PDF</Label>
                    </div>
                    <DocumentPreview settings={settings} />
                </div>
            </div>
        </div>
    )
}
