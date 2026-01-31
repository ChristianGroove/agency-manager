"use client"

import { BrandingConfig } from "@/types/branding"
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
    tierFeatures?: any
}



export function DocumentsTab({ settings, onChange, tierFeatures }: DocumentsTabProps) {
    return (
        <div className="flex flex-col h-full space-y-6">

            {/* Top Section: Settings - Distributed Horizontally */}
            <div className="space-y-4 shrink-0">
                <div className="space-y-1 border-b border-gray-100 pb-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Configuración</h3>
                </div>

                <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="pb-4 border-b border-gray-50">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-500">Estilos del Documento</CardTitle>
                        <CardDescription className="text-xs">Personaliza la apariencia de tus cotizaciones y propuestas.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Row 1: Colors */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-gray-700">Color de Acento</Label>
                                <div className="flex items-center gap-3">
                                    <Input
                                        type="color"
                                        value={settings.colors?.primary || '#000000'}
                                        onChange={(e) => onChange({ ...settings, colors: { ...settings.colors, primary: e.target.value } })}
                                        className="w-10 h-10 p-1 shrink-0 rounded-full cursor-pointer"
                                    />
                                    <Input
                                        value={settings.colors?.primary || '#000000'}
                                        onChange={(e) => onChange({ ...settings, colors: { ...settings.colors, primary: e.target.value } })}
                                        className="h-9 font-mono text-xs uppercase"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-gray-700">Color Encabezados</Label>
                                <div className="flex items-center gap-3">
                                    <Input
                                        type="color"
                                        value={settings.document_header_text_color || '#1F2937'}
                                        onChange={(e) => onChange({ ...settings, document_header_text_color: e.target.value })}
                                        className="w-10 h-10 p-1 shrink-0 rounded-full cursor-pointer"
                                    />
                                    <Input
                                        value={settings.document_header_text_color || ''}
                                        onChange={(e) => onChange({ ...settings, document_header_text_color: e.target.value })}
                                        className="h-9 font-mono text-xs uppercase"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-gray-700">Color Pie de Página</Label>
                                <div className="flex items-center gap-3">
                                    <Input
                                        type="color"
                                        value={settings.document_footer_text_color || '#6B7280'}
                                        onChange={(e) => onChange({ ...settings, document_footer_text_color: e.target.value })}
                                        className="w-10 h-10 p-1 shrink-0 rounded-full cursor-pointer"
                                    />
                                    <Input
                                        value={settings.document_footer_text_color || ''}
                                        onChange={(e) => onChange({ ...settings, document_footer_text_color: e.target.value })}
                                        className="h-9 font-mono text-xs uppercase"
                                    />
                                </div>
                            </div>

                            {/* Row 2: Typography & Assets */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-gray-700">Tipografía</Label>
                                <Select
                                    value={settings.document_font_family || 'Inter'}
                                    onValueChange={(val) => onChange({ ...settings, document_font_family: val })}
                                >
                                    <SelectTrigger className="h-10 text-xs">
                                        <SelectValue placeholder="Seleccionar fuente" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Inter">Inter (Sans)</SelectItem>
                                        <SelectItem value="Roboto">Roboto (Sans)</SelectItem>
                                        <SelectItem value="Open Sans">Open Sans (Sans)</SelectItem>
                                        <SelectItem value="Playfair Display">Playfair (Serif)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-gray-700">Tamaño del Logo</Label>
                                <Select
                                    value={settings.document_logo_size || 'medium'}
                                    onValueChange={(val: any) => onChange({ ...settings, document_logo_size: val })}
                                >
                                    <SelectTrigger className="h-10 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="small">Pequeño (80px)</SelectItem>
                                        <SelectItem value="medium">Mediano (120px)</SelectItem>
                                        <SelectItem value="large">Grande (160px)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-gray-700">Marca de Agua</Label>
                                <div className="flex items-center justify-between h-10 px-3 border rounded-md bg-gray-50/50">
                                    <span className="text-xs text-muted-foreground">Mostrar logo de fondo</span>
                                    <Switch
                                        checked={settings.document_show_watermark !== false}
                                        onCheckedChange={(checked) => onChange({ ...settings, document_show_watermark: checked })}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="hidden sm:flex items-center gap-2 px-1 text-[10px] text-muted-foreground">
                    <Info className="h-3 w-3" />
                    <p>Los documentos usan nombre y logo definidos en <strong>Identidad</strong>.</p>
                </div>
            </div>

            {/* Bottom Section: Preview - Full Width & Height */}
            <div className="flex-1 min-h-[500px] flex flex-col pt-2 pb-12">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Vista Previa</h3>
                    <span className="text-[10px] text-gray-400 font-mono">LIVE PREVIEW</span>
                </div>

                <div className="flex-1 w-full bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-200 p-8 flex items-start justify-center overflow-y-auto mb-10">
                    <div className="scale-95 origin-top w-full flex justify-center">
                        <DocumentPreview settings={settings} />
                    </div>
                </div>
            </div>
        </div>
    )
}
