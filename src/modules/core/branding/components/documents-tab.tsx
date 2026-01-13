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
}



export function DocumentsTab({ settings, onChange }: DocumentsTabProps) {
    return (
        <div className="flex flex-col h-full space-y-6">

            {/* Top Section: Settings - Distributed Horizontally */}
            <div className="space-y-4 shrink-0">
                <div className="space-y-1 border-b border-gray-100 pb-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Configuración</h3>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-8 items-end">

                    {/* Color Settings */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Acento</Label>
                        <div className="flex items-center gap-3">
                            <div className="relative shrink-0 group">
                                <div
                                    className="w-10 h-10 rounded-full shadow-sm ring-1 ring-black/5 hover:scale-110 transition-transform"
                                    style={{ backgroundColor: settings.colors?.primary || '#000000' }}
                                />
                                <Input
                                    type="color"
                                    value={settings.colors?.primary || '#000000'}
                                    onChange={(e) => onChange({ ...settings, colors: { ...settings.colors, primary: e.target.value } })}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                            </div>
                            <div className="flex-1">
                                <Input
                                    value={settings.colors?.primary || '#000000'}
                                    onChange={(e) => onChange({ ...settings, colors: { ...settings.colors, primary: e.target.value } })}
                                    className="h-9 font-mono text-xs uppercase bg-gray-50 border-gray-200"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Size Settings */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Tamaño Logo</Label>
                        <Select
                            value={settings.document_logo_size || 'medium'}
                            onValueChange={(val: any) => onChange({ ...settings, document_logo_size: val })}
                        >
                            <SelectTrigger className="h-10 text-xs bg-gray-50 border-gray-200">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="small" className="text-xs">Pequeño (80px)</SelectItem>
                                <SelectItem value="medium" className="text-xs">Mediano (120px)</SelectItem>
                                <SelectItem value="large" className="text-xs">Grande (160px)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Watermark Toggle */}
                    <div className="flex items-center justify-between gap-4 h-10 px-1">
                        <div className="space-y-0.5">
                            <Label className="text-xs font-bold text-gray-700 uppercase tracking-wide block">Marca de Agua</Label>
                            <p className="text-[10px] text-muted-foreground leading-none">Logo de fondo</p>
                        </div>
                        <Switch
                            checked={settings.document_show_watermark !== false}
                            onCheckedChange={(checked) => onChange({ ...settings, document_show_watermark: checked })}
                        />
                    </div>
                </div>

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
