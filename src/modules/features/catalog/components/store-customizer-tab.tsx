"use client"

import React, { useState, useEffect } from "react"
import {
  StorefrontThemeConfig,
  UniversalCatalogItem,
} from "@/types/catalog"
import {
  getStorefrontThemeConfigAction,
  updateStorefrontThemeConfigAction,
  resetStorefrontThemeConfigAction,
  DEFAULT_STOREFRONT_THEME_CONFIG,
} from "@/modules/features/catalog/customizer-actions"
import { LivePreviewFrame } from "./live-preview-frame"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Palette,
  Sparkles,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  HelpCircle,
  MessageSquare,
  Share2,
  Layout,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/modules/infrastructure/utils/utils"

const THEME_PRESETS = [
  { id: "modern", name: "Modern Clean", primary: "#4F46E5", secondary: "#EC4899", accent: "#10B981" },
  { id: "dark_luxe", name: "Dark Luxe", primary: "#D97706", secondary: "#18181B", accent: "#F59E0B" },
  { id: "vibrant", name: "Vibrant Punch", primary: "#EC4899", secondary: "#8B5CF6", accent: "#06B6D4" },
  { id: "minimal", name: "Minimal Monolith", primary: "#18181B", secondary: "#71717A", accent: "#27272A" },
  { id: "editorial", name: "Editorial Serif", primary: "#9A3412", secondary: "#EA580C", accent: "#C2410C" },
  { id: "cyber_glass_3d", name: "Cyber Glass 3D", primary: "#06B6D4", secondary: "#3B82F6", accent: "#8B5CF6" },
  { id: "gourmet_elegance", name: "Gourmet Elegance", primary: "#B45309", secondary: "#78350F", accent: "#D97706" },
  { id: "swiss", name: "Swiss Minimal", primary: "#DC2626", secondary: "#1E293B", accent: "#0EA5E9" },
  { id: "neo_brutalist", name: "Neo Brutalist", primary: "#000000", secondary: "#FFE600", accent: "#FF5757" },
  { id: "modern_glass", name: "Modern Glass", primary: "#6366F1", secondary: "#A855F7", accent: "#38BDF8" },
]

const GRADIENT_PRESETS = [
  { label: "Indigo Slate", value: "from-indigo-900 via-slate-900 to-black" },
  { label: "Sunset Amber", value: "from-amber-700 via-rose-900 to-black" },
  { label: "Emerald Deep", value: "from-emerald-900 via-teal-950 to-black" },
  { label: "Purple Velvet", value: "from-purple-900 via-fuchsia-950 to-black" },
  { label: "Midnight Noir", value: "from-zinc-900 via-zinc-950 to-black" },
]

export interface StoreCustomizerTabProps {
  initialThemeConfig?: StorefrontThemeConfig
  sampleItems?: UniversalCatalogItem[]
  orgName?: string
  organizationId?: string
}

export function StoreCustomizerTab({
  initialThemeConfig,
  sampleItems = [],
  orgName = "Mi Tienda",
  organizationId,
}: StoreCustomizerTabProps) {
  const [config, setConfig] = useState<StorefrontThemeConfig>(
    initialThemeConfig || DEFAULT_STOREFRONT_THEME_CONFIG
  )
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await updateStorefrontThemeConfigAction(config)
      if (res.success) {
        toast.success("Configuración de tienda guardada exitosamente")
      } else {
        toast.error(res.error || "Error al guardar configuración")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al guardar")
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm("¿Restablecer todos los estilos a los valores por defecto?")) return
    setIsSaving(true)
    try {
      const res = await resetStorefrontThemeConfigAction()
      if (res.success && res.data) {
        setConfig(res.data)
        toast.success("Estilos restablecidos")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al restablecer")
    } finally {
      setIsSaving(false)
    }
  }

  // FAQ handlers
  const handleAddFaq = () => {
    setConfig((prev) => ({
      ...prev,
      faq: [
        ...(prev.faq || []),
        { id: crypto.randomUUID(), question: "Nueva pregunta frecuente", answer: "Respuesta detallada..." },
      ],
    }))
  }

  const handleUpdateFaq = (index: number, patch: { question?: string; answer?: string; category?: string }) => {
    setConfig((prev) => {
      const list = [...(prev.faq || [])]
      list[index] = { ...list[index], ...patch }
      return { ...prev, faq: list }
    })
  }

  const handleDeleteFaq = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      faq: (prev.faq || []).filter((_, i) => i !== index),
    }))
  }

  // Testimonials handlers
  const handleAddTestimonial = () => {
    setConfig((prev) => ({
      ...prev,
      testimonials: [
        ...(prev.testimonials || []),
        { id: crypto.randomUUID(), name: "Nombre Cliente", role: "CEO", company: "Empresa", quote: "Excelente servicio y entrega a tiempo.", rating: 5 },
      ],
    }))
  }

  const handleUpdateTestimonial = (index: number, patch: { name?: string; role?: string; company?: string; quote?: string; rating?: number }) => {
    setConfig((prev) => {
      const list = [...(prev.testimonials || [])]
      list[index] = { ...list[index], ...patch }
      return { ...prev, testimonials: list }
    })
  }

  const handleDeleteTestimonial = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      testimonials: (prev.testimonials || []).filter((_, i) => i !== index),
    }))
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-14rem)] min-h-[700px]">
      {/* LEFT COLUMN: Controls Studio */}
      <div className="lg:col-span-5 flex flex-col h-full bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-white/10 shadow-xl overflow-hidden">
        {/* Sticky Header with Save / Reset */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-white/10 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-pink/10 text-brand-pink rounded-xl">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">Estudio de Personalización</h2>
              <p className="text-[11px] text-zinc-500">Diseña la experiencia visual de tu portal</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isSaving}
              className="rounded-xl h-9 text-xs"
              title="Restablecer valores"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-brand-pink hover:bg-brand-pink/90 text-white rounded-xl text-xs font-bold h-9 px-4 shadow-sm"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>

        {/* Scrollable Control Accordions */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          <Accordion type="multiple" defaultValue={["item-theme", "item-hero"]} className="space-y-3">
            {/* 1. Theme Presets & Palette */}
            <AccordionItem value="item-theme" className="border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 bg-zinc-50/50 dark:bg-zinc-900/40">
              <AccordionTrigger className="text-xs font-bold hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-brand-pink" />
                  <span>Tema & Paleta de Colores</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-1 pb-4">
                {/* Preset Chips */}
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-zinc-500">Temas Preconfigurados</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {THEME_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            theme: preset.id as any,
                            primary_color: preset.primary,
                            secondary_color: preset.secondary,
                            accent_color: preset.accent,
                          }))
                        }
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer",
                          config.theme === preset.id
                            ? "border-brand-pink bg-brand-pink/5 font-bold"
                            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400"
                        )}
                      >
                        <span className="truncate">{preset.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.primary }} />
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.secondary }} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Hex Pickers */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold">Primario</Label>
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={config.primary_color}
                        onChange={(e) => setConfig((prev) => ({ ...prev, primary_color: e.target.value }))}
                        className="h-8 w-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                      />
                      <Input
                        value={config.primary_color}
                        onChange={(e) => setConfig((prev) => ({ ...prev, primary_color: e.target.value }))}
                        className="h-8 text-[11px] font-mono rounded-lg px-2"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold">Secundario</Label>
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={config.secondary_color}
                        onChange={(e) => setConfig((prev) => ({ ...prev, secondary_color: e.target.value }))}
                        className="h-8 w-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                      />
                      <Input
                        value={config.secondary_color}
                        onChange={(e) => setConfig((prev) => ({ ...prev, secondary_color: e.target.value }))}
                        className="h-8 text-[11px] font-mono rounded-lg px-2"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold">Acento</Label>
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={config.accent_color || "#10B981"}
                        onChange={(e) => setConfig((prev) => ({ ...prev, accent_color: e.target.value }))}
                        className="h-8 w-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                      />
                      <Input
                        value={config.accent_color || "#10B981"}
                        onChange={(e) => setConfig((prev) => ({ ...prev, accent_color: e.target.value }))}
                        className="h-8 text-[11px] font-mono rounded-lg px-2"
                      />
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 2. Hero Banner & Branding */}
            <AccordionItem value="item-hero" className="border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 bg-zinc-50/50 dark:bg-zinc-900/40">
              <AccordionTrigger className="text-xs font-bold hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Banner Principal (Hero)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-1 pb-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">Mostrar Banner Hero</Label>
                  <Switch
                    checked={config.hero?.enabled ?? true}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({
                        ...prev,
                        hero: { ...(prev.hero || DEFAULT_STOREFRONT_THEME_CONFIG.hero!), enabled: checked },
                      }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold">Título Principal</Label>
                  <Input
                    value={config.hero?.title || ""}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        hero: { ...(prev.hero || DEFAULT_STOREFRONT_THEME_CONFIG.hero!), title: e.target.value },
                      }))
                    }
                    className="h-8 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold">Subtítulo / Bajada</Label>
                  <Textarea
                    rows={2}
                    value={config.hero?.subtitle || ""}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        hero: { ...(prev.hero || DEFAULT_STOREFRONT_THEME_CONFIG.hero!), subtitle: e.target.value },
                      }))
                    }
                    className="text-xs rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Texto Botón (CTA)</Label>
                    <Input
                      value={config.hero?.cta_text || ""}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          hero: { ...(prev.hero || DEFAULT_STOREFRONT_THEME_CONFIG.hero!), cta_text: e.target.value },
                        }))
                      }
                      className="h-8 text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold">Texto Badge</Label>
                    <Input
                      value={config.hero?.badge_text || ""}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          hero: { ...(prev.hero || DEFAULT_STOREFRONT_THEME_CONFIG.hero!), badge_text: e.target.value },
                        }))
                      }
                      className="h-8 text-xs rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold">Fondo con Gradiente</Label>
                  <Select
                    value={config.hero?.bg_gradient || "from-indigo-900 via-slate-900 to-black"}
                    onValueChange={(val: any) =>
                      setConfig((prev) => ({
                        ...prev,
                        hero: { ...(prev.hero || DEFAULT_STOREFRONT_THEME_CONFIG.hero!), bg_gradient: val },
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADIENT_PRESETS.map((g) => (
                        <SelectItem key={g.value} value={g.value}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 3. Navigation & Layout */}
            <AccordionItem value="item-layout" className="border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 bg-zinc-50/50 dark:bg-zinc-900/40">
              <AccordionTrigger className="text-xs font-bold hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <Layout className="h-4 w-4 text-blue-500" />
                  <span>Navegación & Disposición de Tarjetas</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-1 pb-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold">Estilo de Categorías</Label>
                  <Select
                    value={config.navigation_style || "pills"}
                    onValueChange={(val: any) => setConfig((prev) => ({ ...prev, navigation_style: val }))}
                  >
                    <SelectTrigger className="h-8 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pills">Píldoras Flotantes (Pills)</SelectItem>
                      <SelectItem value="tabs">Pestañas Clásicas (Tabs)</SelectItem>
                      <SelectItem value="underline_tabs">Línea Inferior (Underline)</SelectItem>
                      <SelectItem value="glass_cards">Tarjetas de Cristal (Glass)</SelectItem>
                      <SelectItem value="floating_dock">Dock Flotante Inferior</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold">Disposición de Tarjetas</Label>
                  <Select
                    value={config.card_layout || "grid"}
                    onValueChange={(val: any) => setConfig((prev) => ({ ...prev, card_layout: val }))}
                  >
                    <SelectTrigger className="h-8 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid">Cuadrícula (Grid 3 columnas)</SelectItem>
                      <SelectItem value="masonry">Mosaico Fluido (Masonry)</SelectItem>
                      <SelectItem value="list">Lista Horizontal Detallada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 4. Action Hub & Features */}
            <AccordionItem value="item-features" className="border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 bg-zinc-50/50 dark:bg-zinc-900/40">
              <AccordionTrigger className="text-xs font-bold hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-emerald-500" />
                  <span>Funciones & Canales de Venta</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-1 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Buscador de Productos</span>
                  <Switch
                    checked={config.enable_search ?? true}
                    onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, enable_search: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Checkout WhatsApp Inteligente</span>
                  <Switch
                    checked={config.enable_whatsapp_checkout ?? true}
                    onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, enable_whatsapp_checkout: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Solicitud de Cotización CRM</span>
                  <Switch
                    checked={config.enable_quote_request ?? true}
                    onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, enable_quote_request: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Generador de Códigos QR</span>
                  <Switch
                    checked={config.enable_qr_code ?? true}
                    onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, enable_qr_code: checked }))}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 5. FAQ Editor */}
            <AccordionItem value="item-faq" className="border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 bg-zinc-50/50 dark:bg-zinc-900/40">
              <AccordionTrigger className="text-xs font-bold hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-purple-500" />
                  <span>Preguntas Frecuentes ({config.faq?.length || 0})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-1 pb-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddFaq}
                  className="w-full text-xs rounded-xl h-8 border-dashed"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Agregar Pregunta
                </Button>

                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {(config.faq || []).map((faq, fIdx) => (
                    <div key={faq.id || fIdx} className="p-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Input
                          placeholder="Pregunta..."
                          value={faq.question}
                          onChange={(e) => handleUpdateFaq(fIdx, { question: e.target.value })}
                          className="h-7 text-xs font-bold rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteFaq(fIdx)}
                          className="h-7 w-7 text-zinc-400 hover:text-red-600 rounded-lg shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Textarea
                        rows={2}
                        placeholder="Respuesta..."
                        value={faq.answer}
                        onChange={(e) => handleUpdateFaq(fIdx, { answer: e.target.value })}
                        className="text-xs rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 6. Testimonials Studio */}
            <AccordionItem value="item-testimonials" className="border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 bg-zinc-50/50 dark:bg-zinc-900/40">
              <AccordionTrigger className="text-xs font-bold hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-pink-500" />
                  <span>Testimonios de Clientes ({config.testimonials?.length || 0})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-1 pb-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTestimonial}
                  className="w-full text-xs rounded-xl h-8 border-dashed"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Agregar Testimonio
                </Button>

                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {(config.testimonials || []).map((testi, tIdx) => (
                    <div key={testi.id || tIdx} className="p-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Input
                          placeholder="Nombre Cliente"
                          value={testi.name}
                          onChange={(e) => handleUpdateTestimonial(tIdx, { name: e.target.value })}
                          className="h-7 text-xs font-bold rounded-lg"
                        />
                        <Input
                          placeholder="Cargo / Empresa"
                          value={testi.role || ""}
                          onChange={(e) => handleUpdateTestimonial(tIdx, { role: e.target.value })}
                          className="h-7 text-xs rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTestimonial(tIdx)}
                          className="h-7 w-7 text-zinc-400 hover:text-red-600 rounded-lg shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Textarea
                        rows={2}
                        placeholder="Testimonio o reseña..."
                        value={testi.quote}
                        onChange={(e) => handleUpdateTestimonial(tIdx, { quote: e.target.value })}
                        className="text-xs rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 7. Business Info & Social Links */}
            <AccordionItem value="item-socials" className="border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 bg-zinc-50/50 dark:bg-zinc-900/40">
              <AccordionTrigger className="text-xs font-bold hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-teal-500" />
                  <span>Horarios de Atención & Redes Sociales</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-1 pb-4">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold">Horario de Atención (Texto)</Label>
                  <Input
                    placeholder="Lunes a Viernes: 8:00 AM - 6:00 PM"
                    value={config.business_hours_text || ""}
                    onChange={(e) => setConfig((prev) => ({ ...prev, business_hours_text: e.target.value }))}
                    className="h-8 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-bold">Enlaces de Redes Sociales</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Instagram @usuario"
                      value={config.social_links?.instagram || ""}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          social_links: { ...(prev.social_links || {}), instagram: e.target.value },
                        }))
                      }
                      className="h-8 text-xs rounded-xl"
                    />
                    <Input
                      placeholder="WhatsApp (ej. 573001234567)"
                      value={config.social_links?.whatsapp || ""}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          social_links: { ...(prev.social_links || {}), whatsapp: e.target.value },
                        }))
                      }
                      className="h-8 text-xs rounded-xl"
                    />
                    <Input
                      placeholder="Sitio Web (https://...)"
                      value={config.social_links?.website || ""}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          social_links: { ...(prev.social_links || {}), website: e.target.value },
                        }))
                      }
                      className="h-8 text-xs rounded-xl"
                    />
                    <Input
                      placeholder="TikTok @usuario"
                      value={config.social_links?.tiktok || ""}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          social_links: { ...(prev.social_links || {}), tiktok: e.target.value },
                        }))
                      }
                      className="h-8 text-xs rounded-xl"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Live Preview Frame */}
      <div className="lg:col-span-7 h-full">
        <LivePreviewFrame
          themeConfig={config}
          sampleItems={sampleItems}
          orgName={orgName}
        />
      </div>
    </div>
  )
}
