"use client"

import React, { useState } from "react"
import { CatalogClassification } from "@/types/catalog"
import {
  generateCatalogCopyAction,
  AICopyTone,
  CatalogCopyData,
} from "@/modules/features/catalog/ai-actions"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sparkles,
  Loader2,
  Check,
  Tag,
  Wand2,
  RefreshCw,
  Search,
  CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/modules/infrastructure/utils/utils"

export interface AICopywriterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialName?: string
  initialCategory?: string
  initialClassification?: CatalogClassification
  initialDescription?: string
  onApplyCopy: (copy: {
    name: string
    description: string
    features: string[]
    seo_title: string
    seo_description: string
    search_tags: string[]
  }) => void
}

const TONES: Array<{ id: AICopyTone; label: string; desc: string }> = [
  { id: "persuasive", label: "Persuasivo", desc: "Enfocado en ventas y llamados a la acción" },
  { id: "luxurious", label: "Exclusivo / Lujo", desc: "Elegante, premium y sofisticado" },
  { id: "professional", label: "Profesional", desc: "Claro, sobrio y corporativo" },
  { id: "technical", label: "Técnico / B2B", desc: "Enfocado en métricas y especificaciones" },
  { id: "casual", label: "Cercano / Casual", desc: "Amigable, directo y conversacional" },
  { id: "playful", label: "Creativo / Juvenil", desc: "Divertido, fresco y dinámico" },
]

export function AICopywriterDialog({
  open,
  onOpenChange,
  initialName = "",
  initialCategory = "",
  initialClassification = "service",
  initialDescription = "",
  onApplyCopy,
}: AICopywriterDialogProps) {
  // Input states
  const [name, setName] = useState(initialName)
  const [category, setCategory] = useState(initialCategory)
  const [classification, setClassification] = useState<CatalogClassification>(initialClassification)
  const [tone, setTone] = useState<AICopyTone>("persuasive")
  const [keywords, setKeywords] = useState<string>("")
  const [language, setLanguage] = useState<string>("es")
  const [isGenerating, setIsGenerating] = useState(false)

  // Result state
  const [result, setResult] = useState<CatalogCopyData | null>(null)
  const [selectedTitle, setSelectedTitle] = useState<string>(initialName)
  const [editableDesc, setEditableDesc] = useState<string>(initialDescription)
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [seoTitle, setSeoTitle] = useState<string>("")
  const [seoDesc, setSeoDesc] = useState<string>("")
  const [searchTags, setSearchTags] = useState<string[]>([])

  // Reset when dialog opens with new initial props
  React.useEffect(() => {
    if (open) {
      setName(initialName)
      setCategory(initialCategory)
      setClassification(initialClassification)
      setSelectedTitle(initialName)
      setEditableDesc(initialDescription)
    }
  }, [open, initialName, initialCategory, initialClassification, initialDescription])

  const handleGenerate = async () => {
    if (!name.trim()) {
      toast.error("Ingresa el nombre o concepto del producto para redactar")
      return
    }

    setIsGenerating(true)
    try {
      const parsedKeywords = keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)

      const res = await generateCatalogCopyAction({
        name: name.trim(),
        category: category || undefined,
        classification,
        tone,
        keywords: parsedKeywords,
        language,
      })

      if (res.success && res.data) {
        setResult(res.data)
        setSelectedTitle(res.data.title || name)
        setEditableDesc(res.data.description || "")
        const feats = res.data.features || res.data.bullet_points || []
        setSelectedFeatures(feats)
        setSeoTitle(res.data.seo_title || res.data.seo?.meta_title || "")
        setSeoDesc(res.data.seo_description || res.data.seo?.meta_description || "")
        setSearchTags(res.data.search_tags || res.data.seo?.search_tags || [])
        toast.success("¡Texto generado exitosamente!")
      } else {
        toast.error(res.error || "No se pudo generar el texto")
      }
    } catch (err: any) {
      console.error("AI Copy generation error:", err)
      toast.error(err.message || "Error al comunicarse con el asistente de IA")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleToggleFeature = (feat: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat]
    )
  }

  const handleApply = () => {
    onApplyCopy({
      name: selectedTitle || name,
      description: editableDesc,
      features: selectedFeatures,
      seo_title: seoTitle,
      seo_description: seoDesc,
      search_tags: searchTags,
    })
    toast.success("Contenido aplicado al formulario")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-3xl p-0 overflow-hidden border border-zinc-200 dark:border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-brand-pink/10 text-brand-pink">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                Redactor Inteligente con IA
                <Badge className="bg-brand-pink/20 text-brand-pink text-[10px] font-bold border-none">
                  OpenAI GPT-4o
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500">
                Genera títulos persuasivos, descripciones de alta conversión y SEO instantáneo
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body Split */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Controls Form (5 cols) */}
          <div className="md:col-span-5 space-y-4 pr-0 md:pr-2 border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800 pb-4 md:pb-0">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Nombre o Idea del Producto/Servicio</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. Auditoría SEO Avanzada"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Tono de Voz</Label>
              <Select value={tone} onValueChange={(val: any) => setTone(val)}>
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="font-semibold">{t.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Palabras Clave (Separadas por coma)</Label>
              <Input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="tráfico web, backlinks, auditoría técnica"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Idioma</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !name.trim()}
              className="w-full bg-brand-pink hover:bg-brand-pink/90 text-white rounded-xl text-xs font-bold h-10 shadow-md gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redactando con IA...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generar Copy Ahora
                </>
              )}
            </Button>
          </div>

          {/* Results Pane (7 cols) */}
          <div className="md:col-span-7 space-y-4">
            {!result ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 min-h-[300px]">
                <Sparkles className="h-10 w-10 text-brand-pink/50 mb-2 animate-pulse" />
                <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  Listo para generar contenido
                </h4>
                <p className="text-xs text-zinc-400 max-w-xs mt-1">
                  Completa los parámetros a la izquierda y presiona &ldquo;Generar Copy Ahora&rdquo; para ver las propuestas.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Title Suggestions */}
                {result.title_suggestions && result.title_suggestions.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Sugerencias de Título (Haz clic para seleccionar)
                    </Label>
                    <div className="space-y-1.5">
                      {result.title_suggestions.map((titleOpt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedTitle(titleOpt)}
                          className={cn(
                            "w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all",
                            selectedTitle === titleOpt
                              ? "border-brand-pink bg-brand-pink/10 font-bold text-zinc-900 dark:text-white"
                              : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 text-zinc-600 dark:text-zinc-400"
                          )}
                        >
                          <span>{titleOpt}</span>
                          {selectedTitle === titleOpt && (
                            <CheckCircle2 className="h-4 w-4 text-brand-pink shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Descripción Comercial Optimizada
                  </Label>
                  <Textarea
                    rows={4}
                    value={editableDesc}
                    onChange={(e) => setEditableDesc(e.target.value)}
                    className="text-xs rounded-xl"
                  />
                </div>

                {/* Features / Bullet Points */}
                {(result.features || result.bullet_points) && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Puntos Clave / Entregables Incluidos
                    </Label>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {(result.features || result.bullet_points || []).map((feat, idx) => (
                        <label
                          key={idx}
                          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/50 cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={selectedFeatures.includes(feat)}
                            onChange={() => handleToggleFeature(feat)}
                            className="rounded text-brand-pink focus:ring-brand-pink"
                          />
                          <span className="text-zinc-700 dark:text-zinc-300">{feat}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* SEO Metadata */}
                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-bold text-xs">
                    <Search className="h-3.5 w-3.5 text-blue-500" />
                    Vista Previa SEO
                  </div>
                  <Input
                    placeholder="Meta Title"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    className="h-7 text-xs rounded-lg font-mono"
                  />
                  <Textarea
                    rows={2}
                    placeholder="Meta Description"
                    value={seoDesc}
                    onChange={(e) => setSeoDesc(e.target.value)}
                    className="text-xs rounded-lg font-mono"
                  />
                  {searchTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {searchTags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[10px] px-2 py-0">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={!result}
            className="bg-brand-pink hover:bg-brand-pink/90 text-white rounded-xl text-xs font-bold px-6 shadow-sm"
          >
            <Check className="h-4 w-4 mr-1.5" />
            Aplicar al Producto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
