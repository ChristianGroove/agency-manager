"use client"

import React, { useState, useEffect } from "react"
import {
  StorefrontThemeConfig,
  UniversalCatalogItem,
  DEFAULT_STOREFRONT_THEME_CONFIG,
  StorefrontHeroSlide,
} from "@/types/catalog"
import {
  getStorefrontThemeConfigAction,
  updateStorefrontThemeConfigAction,
  resetStorefrontThemeConfigAction,
  getCustomDomainConfigAction,
  saveCustomDomainAction,
  verifyCustomDomainAction,
  removeCustomDomainAction,
} from "@/modules/features/catalog/customizer-actions"
import { LivePreviewFrame } from "./live-preview-frame"
import { ImageUpload } from "@/components/ui/image-upload"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
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
  Globe,
  ExternalLink,
  Copy,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  Link2,
  Info,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
  Layers,
  Sliders,
  Eye,
  EyeOff,
  Wand2,
  Building2,
  ShoppingBag,
  Briefcase,
  Zap,
  Calculator,
  ShoppingCart,
  Package,
  SlidersHorizontal,
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

const INDUSTRY_PRESETS = [
  {
    id: "auto",
    title: "Auto (Detección Inteligente)",
    subtitle: "Adapta la tienda según el tipo de catálogo",
    icon: Wand2,
    badge: "Recomendado",
    color: "text-brand-pink",
    border: "border-brand-pink/40 bg-brand-pink/5",
  },
  {
    id: "real_estate",
    title: "Inmobiliaria & PropTech",
    subtitle: "Filtros por m², habitaciones, canon y visitas",
    icon: Building2,
    badge: "PropTech",
    color: "text-emerald-500",
    border: "border-emerald-500/40 bg-emerald-500/5",
  },
  {
    id: "physical_retail",
    title: "Tienda & Retail Físico",
    subtitle: "Carrito flotante, stock, variantes y checkout",
    icon: ShoppingBag,
    badge: "E-Commerce",
    color: "text-blue-500",
    border: "border-blue-500/40 bg-blue-500/5",
  },
  {
    id: "professional_services",
    title: "Servicios & Consultoría B2B",
    subtitle: "Cotizaciones CRM, entregables, SLA y citas",
    icon: Briefcase,
    badge: "B2B / Agencia",
    color: "text-purple-500",
    border: "border-purple-500/40 bg-purple-500/5",
  },
  {
    id: "digital_software",
    title: "Software & Digital",
    subtitle: "Licenciamiento, descarga directa y accesos",
    icon: Zap,
    badge: "Digital",
    color: "text-amber-500",
    border: "border-amber-500/40 bg-amber-500/5",
  },
  {
    id: "hybrid",
    title: "Híbrido Multi-Catálogo",
    subtitle: "Navegador de clasificaciones para tiendas mixtas",
    icon: Globe,
    badge: "Multi-Industria",
    color: "text-indigo-500",
    border: "border-indigo-500/40 bg-indigo-500/5",
  },
]

export interface StoreCustomizerTabProps {
  initialThemeConfig?: StorefrontThemeConfig
  sampleItems?: UniversalCatalogItem[]
  orgName?: string
  organizationId?: string
  organization?: {
    id: string
    name: string
    slug?: string | null
    customDomain?: string | null
    customDomainStatus?: string | null
    logos?: {
      dark?: string | null
      light?: string | null
    }
  }
  darkLogo?: string | null
  lightLogo?: string | null
}

export function StoreCustomizerTab({
  initialThemeConfig,
  sampleItems = [],
  orgName = "Mi Tienda",
  organizationId,
  organization,
  darkLogo,
  lightLogo,
}: StoreCustomizerTabProps) {
  const [config, setConfig] = useState<StorefrontThemeConfig>(
    initialThemeConfig || DEFAULT_STOREFRONT_THEME_CONFIG
  )
  const [isSaving, setIsSaving] = useState(false)

  // Custom Domain & Storefront Links State
  const [domainConfig, setDomainConfig] = useState<{
    slug: string
    defaultPortalUrl: string
    customDomain: string | null
    customDomainStatus: 'unconfigured' | 'pending' | 'active' | 'error'
    customDomainUrl: string | null
    dnsRecords: { type: string; name: string; value: string; ttl: string; status: string }[]
  }>({
    slug: organization?.slug || organizationId || "tienda",
    defaultPortalUrl: `/portal/${organization?.slug || organizationId || ""}`,
    customDomain: organization?.customDomain || null,
    customDomainStatus: (organization?.customDomainStatus as any) || (organization?.customDomain ? 'active' : 'unconfigured'),
    customDomainUrl: organization?.customDomain ? `https://${organization.customDomain}` : null,
    dnsRecords: [],
  })
  const [customDomainInput, setCustomDomainInput] = useState(organization?.customDomain || "")
  const [isSavingDomain, setIsSavingDomain] = useState(false)
  const [isVerifyingDomain, setIsVerifyingDomain] = useState(false)

  useEffect(() => {
    if (organizationId) {
      getCustomDomainConfigAction(organizationId).then((res) => {
        if (res.success && res.data) {
          setDomainConfig(res.data)
          if (res.data.customDomain) {
            setCustomDomainInput(res.data.customDomain)
          }
        }
      })
    }
  }, [organizationId])

  const handleSaveDomain = async () => {
    if (!customDomainInput.trim()) {
      toast.error("Ingresa un nombre de dominio")
      return
    }
    setIsSavingDomain(true)
    try {
      const res = await saveCustomDomainAction({
        customDomain: customDomainInput,
        orgId: organizationId,
      })
      if (res.success) {
        toast.success("Dominio guardado. Configura los registros DNS a continuación.")
        const fresh = await getCustomDomainConfigAction(organizationId)
        if (fresh.success && fresh.data) setDomainConfig(fresh.data)
      } else {
        toast.error(res.error || "Error al guardar dominio")
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsSavingDomain(false)
    }
  }

  const handleVerifyDomain = async () => {
    setIsVerifyingDomain(true)
    try {
      const res = await verifyCustomDomainAction({ orgId: organizationId })
      if (res.success) {
        toast.success(res.message)
        const fresh = await getCustomDomainConfigAction(organizationId)
        if (fresh.success && fresh.data) setDomainConfig(fresh.data)
      } else {
        toast.error(res.message || "No se pudo verificar el dominio")
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsVerifyingDomain(false)
    }
  }

  const handleRemoveDomain = async () => {
    if (!confirm("¿Eliminar el dominio personalizado? Tu tienda seguirá disponible a través del enlace por defecto.")) return
    setIsSavingDomain(true)
    try {
      const res = await removeCustomDomainAction({ orgId: organizationId })
      if (res.success) {
        toast.success("Dominio personalizado eliminado")
        setCustomDomainInput("")
        const fresh = await getCustomDomainConfigAction(organizationId)
        if (fresh.success && fresh.data) setDomainConfig(fresh.data)
      } else {
        toast.error(res.error || "Error al eliminar")
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsSavingDomain(false)
    }
  }

  const copyToClipboard = (text: string, label: string = "Enlace") => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado al portapapeles`)
  }

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

  // Hero slide handlers
  const handleAddHeroSlide = () => {
    setConfig((prev) => {
      const currentHero = prev.hero || DEFAULT_STOREFRONT_THEME_CONFIG.hero!
      const currentSlides = currentHero.slides || []
      return {
        ...prev,
        hero: {
          ...currentHero,
          background_type: "slideshow",
          slides: [
            ...currentSlides,
            {
              id: crypto.randomUUID(),
              image_url: "",
              title: "",
              subtitle: "",
              link_url: "#catalog",
            },
          ],
        },
      }
    })
  }

  const handleUpdateHeroSlide = (index: number, patch: Partial<StorefrontHeroSlide>) => {
    setConfig((prev) => {
      const currentHero = prev.hero || DEFAULT_STOREFRONT_THEME_CONFIG.hero!
      const currentSlides = [...(currentHero.slides || [])]
      currentSlides[index] = { ...currentSlides[index], ...patch }
      return {
        ...prev,
        hero: {
          ...currentHero,
          slides: currentSlides,
        },
      }
    })
  }

  const handleRemoveHeroSlide = (index: number) => {
    setConfig((prev) => {
      const currentHero = prev.hero || DEFAULT_STOREFRONT_THEME_CONFIG.hero!
      const currentSlides = [...(currentHero.slides || [])]
      currentSlides.splice(index, 1)
      return {
        ...prev,
        hero: {
          ...currentHero,
          slides: currentSlides,
        },
      }
    })
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
      const updated = [...(prev.faq || [])]
      updated[index] = { ...updated[index], ...patch }
      return { ...prev, faq: updated }
    })
  }

  const handleRemoveFaq = (index: number) => {
    setConfig((prev) => {
      const updated = [...(prev.faq || [])]
      updated.splice(index, 1)
      return { ...prev, faq: updated }
    })
  }
  const handleDeleteFaq = handleRemoveFaq

  // Testimonial handlers
  const handleAddTestimonial = () => {
    setConfig((prev) => ({
      ...prev,
      testimonials: [
        ...(prev.testimonials || []),
        { id: crypto.randomUUID(), name: "Cliente Satisfecho", role: "Empresario", quote: "Excelente atención y resultados...", rating: 5 },
      ],
    }))
  }

  const handleUpdateTestimonial = (index: number, patch: any) => {
    setConfig((prev) => {
      const updated = [...(prev.testimonials || [])]
      updated[index] = { ...updated[index], ...patch }
      return { ...prev, testimonials: updated }
    })
  }

  const handleRemoveTestimonial = (index: number) => {
    setConfig((prev) => {
      const updated = [...(prev.testimonials || [])]
      updated.splice(index, 1)
      return { ...prev, testimonials: updated }
    })
  }
  const handleDeleteTestimonial = handleRemoveTestimonial

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-300">
      {/* LEFT COLUMN: Controls & Settings Editor */}
      <div className="lg:col-span-5 flex flex-col bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm h-[820px]">
        {/* Editor Toolbar */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-pink/10 text-brand-pink">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Estudio de Personalización</h2>
              <p className="text-[11px] text-zinc-500">Configura temas, links, banners y contenido</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isSaving}
              className="rounded-xl text-xs h-9 px-3"
              title="Restablecer a valores por defecto"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Restablecer
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
          <Accordion type="multiple" defaultValue={["item-domain", "item-theme", "item-hero"]} className="space-y-3">
            {/* 0. Enlaces & Dominio de la Tienda */}
            <AccordionItem value="item-domain" className="border border-brand-pink/30 dark:border-brand-pink/20 rounded-2xl px-4 bg-brand-pink/5 dark:bg-brand-pink/10">
              <AccordionTrigger className="text-xs font-bold hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-brand-pink" />
                  <span>Dominio & Enlaces de la Tienda</span>
                  {domainConfig.customDomainStatus === 'active' ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] py-0">
                      Dominio Activo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-zinc-500/10 text-zinc-600 text-[10px] py-0">
                      Portal Oficial
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-1 pb-4">
                {/* 1. Default Portal Link */}
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5 text-zinc-400" />
                      Enlace Predeterminado (Por Defecto)
                    </Label>
                    <Badge variant="secondary" className="text-[9px] uppercase font-mono">
                      Siempre Activo
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={domainConfig.defaultPortalUrl}
                      className="h-8 text-xs font-mono bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 select-all"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(typeof window !== 'undefined' ? `${window.location.origin}${domainConfig.defaultPortalUrl}` : domainConfig.defaultPortalUrl, "Enlace del portal")}
                      className="h-8 px-2.5 rounded-lg text-xs shrink-0"
                      title="Copiar enlace"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(domainConfig.defaultPortalUrl, "_blank")}
                      className="h-8 px-2.5 rounded-lg text-xs shrink-0"
                      title="Abrir en pestaña nueva"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Tu tienda siempre está disponible en este enlace oficial seguro.
                  </p>
                </div>

                {/* 2. Custom Domain (White-label) */}
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-brand-pink" />
                      Dominio Personalizado (White-label)
                    </Label>
                    {domainConfig.customDomainStatus === 'active' ? (
                      <Badge className="bg-emerald-500 text-white text-[9px] uppercase">
                        Verificado & SSL
                      </Badge>
                    ) : domainConfig.customDomainStatus === 'pending' ? (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[9px] uppercase">
                        Pendiente DNS
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-zinc-500 text-[9px] uppercase">
                        Opcional
                      </Badge>
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-500">
                    Conecta tu propio dominio (ej. <span className="font-mono text-zinc-700 dark:text-zinc-300">tienda.miempresa.com</span> o <span className="font-mono text-zinc-700 dark:text-zinc-300">catalogo.com</span>) para que tus clientes compren bajo tu propia marca.
                  </p>

                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="tienda.tuempresa.com"
                      value={customDomainInput}
                      onChange={(e) => setCustomDomainInput(e.target.value)}
                      disabled={isSavingDomain || isVerifyingDomain}
                      className="h-8 text-xs font-mono rounded-lg"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveDomain}
                      disabled={isSavingDomain || isVerifyingDomain || !customDomainInput.trim()}
                      className="h-8 px-3 rounded-lg text-xs font-bold bg-brand-pink hover:bg-brand-pink/90 text-white shrink-0"
                    >
                      {isSavingDomain ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "Guardar"}
                    </Button>
                  </div>

                  {/* DNS Instructions Box */}
                  <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                        <Info className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Instrucciones de Configuración DNS:</span>
                      </div>
                      <span className="text-[10px] text-zinc-400">Paso obligatorio</span>
                    </div>

                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      Para que tu dominio apunte a tu tienda en Pixy, debes agregar el siguiente registro <strong className="text-zinc-700 dark:text-zinc-300 font-semibold">CNAME</strong> en el panel de DNS de tu proveedor de dominio (GoDaddy, Cloudflare, Namecheap, Hostinger, etc.):
                    </p>

                    {/* DNS Records Table */}
                    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950 p-3 font-mono text-[10px] space-y-2 border border-zinc-200/80 dark:border-zinc-800">
                      <div className="grid grid-cols-12 text-zinc-400 font-bold border-b border-zinc-200 dark:border-zinc-800 pb-1.5 text-[9px] uppercase tracking-wider">
                        <span className="col-span-2">Tipo</span>
                        <span className="col-span-4">Nombre / Host</span>
                        <span className="col-span-6">Valor / Destino</span>
                      </div>

                      {/* Row 1: CNAME */}
                      <div className="grid grid-cols-12 items-center text-zinc-800 dark:text-zinc-200 font-semibold pt-1">
                        <span className="col-span-2 text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">CNAME</span>
                        <span className="col-span-4 flex items-center gap-1 truncate" title={customDomainInput || domainConfig.customDomain || "tienda"}>
                          <span className="truncate">
                            {(customDomainInput || domainConfig.customDomain || "tienda").includes('.')
                              ? (customDomainInput || domainConfig.customDomain || "tienda").split('.')[0]
                              : (customDomainInput || domainConfig.customDomain || "tienda")}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(
                              (customDomainInput || domainConfig.customDomain || "tienda").includes('.')
                                ? (customDomainInput || domainConfig.customDomain || "tienda").split('.')[0]
                                : (customDomainInput || domainConfig.customDomain || "tienda"),
                              "Nombre de Host"
                            )}
                            className="text-zinc-400 hover:text-zinc-600 p-0.5"
                            title="Copiar Host"
                          >
                            <Copy className="h-2.5 w-2.5" />
                          </button>
                        </span>
                        <span className="col-span-6 flex items-center justify-between gap-1">
                          <span className="truncate text-zinc-600 dark:text-zinc-400">cname.pixy.com.co</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard("cname.pixy.com.co", "Destino CNAME")}
                            className="text-zinc-400 hover:text-zinc-600 p-0.5"
                            title="Copiar Destino"
                          >
                            <Copy className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      </div>
                    </div>

                    {/* Step-by-Step Educational Callout */}
                    <div className="p-2.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1.5">
                      <div className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1">
                        <span>¿Cómo funciona la conexión?</span>
                      </div>
                      <ol className="list-decimal list-inside space-y-1 text-[10px] leading-relaxed">
                        <li><strong>1. Agrega el CNAME</strong> en tu proveedor de dominio con los valores de la tabla arriba.</li>
                        <li><strong>2. Guarda y espera</strong> la propagación DNS (generalmente toma entre 2 y 15 minutos).</li>
                        <li><strong>3. Haz clic en "Verificar DNS y Activar"</strong> para certificar la conexión y emitir el SSL automático.</li>
                      </ol>
                    </div>

                    {/* Action buttons if domain saved */}
                    {domainConfig.customDomain && (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleVerifyDomain}
                          disabled={isVerifyingDomain}
                          className="h-7 text-[11px] font-bold gap-1 rounded-lg border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                        >
                          <CheckCircle2 className={cn("h-3 w-3", isVerifyingDomain && "animate-spin")} />
                          {isVerifyingDomain ? "Verificando DNS..." : "Verificar DNS y Activar"}
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveDomain}
                          disabled={isSavingDomain}
                          className="h-7 text-[11px] font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg px-2"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Quitar Dominio
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 1. Industria & Enfoque de la Tienda (Industry Engine Preset) */}
            <AccordionItem value="item-industry" className="border border-emerald-500/30 dark:border-emerald-500/20 rounded-2xl px-4 bg-emerald-500/5 dark:bg-emerald-500/10">
              <AccordionTrigger className="text-xs font-bold hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-emerald-500" />
                  <span>Industria & Enfoque de la Tienda</span>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] py-0 capitalize">
                    {config.industry_preset || "auto"}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-1 pb-4">
                <p className="text-[11px] text-zinc-500">
                  Selecciona la especialidad de tu tienda para adaptar automáticamente los filtros, widgets de búsqueda y botones de conversión a tu modelo de negocio.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {INDUSTRY_PRESETS.map((preset) => {
                    const isSelected = (config.industry_preset || "auto") === preset.id
                    const IconComp = preset.icon
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            industry_preset: preset.id as any,
                          }))
                        }
                        className={cn(
                          "p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2",
                          isSelected
                            ? cn("border-2 shadow-sm font-bold", preset.border)
                            : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300"
                        )}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-center gap-2">
                            <div className={cn("p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800", preset.color)}>
                              <IconComp className="h-4 w-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold block text-zinc-900 dark:text-white">
                                {preset.title}
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <Badge className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[9px] px-1.5 py-0">
                              Activo
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-tight">
                          {preset.subtitle}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 2. Control Modular de Widgets */}
            <AccordionItem value="item-widgets" className="border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 bg-zinc-50/50 dark:bg-zinc-900/40">
              <AccordionTrigger className="text-xs font-bold hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-brand-pink" />
                  <span>Widgets & Componentes Activos</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pt-1 pb-4">
                <p className="text-[11px] text-zinc-500">
                  Activa o desactiva módulos individuales en tu portal para adaptar la experiencia de tus clientes.
                </p>

                {/* 1. Filtros Inmobiliarios */}
                <div className="flex items-center justify-between p-3 rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold flex items-center gap-1.5 text-zinc-900 dark:text-white">
                      <Building2 className="h-3.5 w-3.5 text-emerald-500" />
                      Filtros Inmobiliarios (PropTech Strip)
                    </Label>
                    <p className="text-[11px] text-zinc-500">
                      Muestra filtros por operación (Venta/Arriendo), tipo de propiedad, habitaciones y m².
                    </p>
                  </div>
                  <Switch
                    checked={config.widget_config?.show_real_estate_filters ?? true}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({
                        ...prev,
                        widget_config: { ...(prev.widget_config || {}), show_real_estate_filters: checked },
                      }))
                    }
                  />
                </div>

                {/* 2. Carrito de Compras Persistente */}
                <div className="flex items-center justify-between p-3 rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold flex items-center gap-1.5 text-zinc-900 dark:text-white">
                      <ShoppingCart className="h-3.5 w-3.5 text-blue-500" />
                      Carrito de Compras y Drawer Desplegable
                    </Label>
                    <p className="text-[11px] text-zinc-500">
                      Habilita el botón flotante y panel de carrito para compras directas.
                    </p>
                  </div>
                  <Switch
                    checked={config.widget_config?.show_cart_drawer ?? true}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({
                        ...prev,
                        widget_config: { ...(prev.widget_config || {}), show_cart_drawer: checked },
                      }))
                    }
                  />
                </div>

                {/* 3. Simulador de Crédito Hipotecario */}
                <div className="flex items-center justify-between p-3 rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold flex items-center gap-1.5 text-zinc-900 dark:text-white">
                      <Calculator className="h-3.5 w-3.5 text-purple-500" />
                      Simulador de Crédito Hipotecario
                    </Label>
                    <p className="text-[11px] text-zinc-500">
                      Permite a los clientes simular su cuota bancaria en propiedades.
                    </p>
                  </div>
                  <Switch
                    checked={config.widget_config?.show_mortgage_calculator ?? true}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({
                        ...prev,
                        widget_config: { ...(prev.widget_config || {}), show_mortgage_calculator: checked },
                      }))
                    }
                  />
                </div>

                {/* 4. Badges de Stock y Disponibilidad */}
                <div className="flex items-center justify-between p-3 rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold flex items-center gap-1.5 text-zinc-900 dark:text-white">
                      <Package className="h-3.5 w-3.5 text-amber-500" />
                      Badges de Stock & Disponibilidad
                    </Label>
                    <p className="text-[11px] text-zinc-500">
                      Muestra alertas de "Agotado", "¡Últimas unidades!" y stock en vivo.
                    </p>
                  </div>
                  <Switch
                    checked={config.widget_config?.show_stock_badges ?? true}
                    onCheckedChange={(checked) =>
                      setConfig((prev) => ({
                        ...prev,
                        widget_config: { ...(prev.widget_config || {}), show_stock_badges: checked },
                      }))
                    }
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* 3. Theme Presets & Palette */}
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
              <AccordionContent className="space-y-4 pt-1 pb-4">
                {/* 1. Toggle Banner Enabled */}
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                  <div>
                    <Label className="text-xs font-bold">Mostrar Banner Hero</Label>
                    <p className="text-[10px] text-zinc-400">Activa o desactiva la cabecera principal de la tienda</p>
                  </div>
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

                {config.hero?.enabled !== false && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* 2. Background Type Selector */}
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-zinc-500">Tipo de Fondo</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "gradient", label: "Gradiente", icon: Palette },
                          { id: "image", label: "Imagen", icon: ImageIcon },
                          { id: "slideshow", label: "Multi-Banner", icon: Layers },
                        ].map((bType) => {
                          const Icon = bType.icon
                          const currentType = config.hero?.background_type || (config.hero?.slides && config.hero.slides.length > 0 ? "slideshow" : config.hero?.bg_image_url ? "image" : "gradient")
                          const isSelected = currentType === bType.id
                          return (
                            <button
                              key={bType.id}
                              type="button"
                              onClick={() =>
                                setConfig((prev) => ({
                                  ...prev,
                                  hero: {
                                    ...(prev.hero || DEFAULT_STOREFRONT_THEME_CONFIG.hero!),
                                    background_type: bType.id as any,
                                  },
                                }))
                              }
                              className={cn(
                                "flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold gap-1.5 transition-all cursor-pointer",
                                isSelected
                                  ? "border-brand-pink bg-brand-pink/5 text-brand-pink shadow-xs"
                                  : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                              )}
                            >
                              <Icon className="h-4 w-4" />
                              <span className="text-[11px]">{bType.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* 3. Conditional Background Controls */}
                    {/* A. Gradient Controls */}
                    {(config.hero?.background_type === "gradient" || (!config.hero?.background_type && !config.hero?.bg_image_url && (!config.hero?.slides || config.hero.slides.length === 0))) && (
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
                    )}

                    {/* B. Single Image Upload */}
                    {config.hero?.background_type === "image" && (
                      <div className="space-y-3 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60">
                        <Label className="text-[11px] font-bold">Imagen de Fondo Personalizada</Label>
                        <ImageUpload
                          value={config.hero?.bg_image_url || null}
                          onChange={(url) =>
                            setConfig((prev) => ({
                              ...prev,
                              hero: { ...(prev.hero || DEFAULT_STOREFRONT_THEME_CONFIG.hero!), bg_image_url: url },
                            }))
                          }
                          label="Subir Imagen de Fondo del Banner"
                          compact={false}
                        />

                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <Label className="text-[11px] font-bold">Oscurecer Fondo (Overlay)</Label>
                            <span className="text-zinc-400 font-mono text-[10px]">{config.hero?.overlay_opacity ?? 40}%</span>
                          </div>
                          <Select
                            value={String(config.hero?.overlay_opacity ?? 40)}
                            onValueChange={(val) =>
                              setConfig((prev) => ({
                                ...prev,
                                hero: { ...(prev.hero || DEFAULT_STOREFRONT_THEME_CONFIG.hero!), overlay_opacity: Number(val) },
                              }))
                            }
                          >
                            <SelectTrigger className="h-8 text-xs rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Sin oscurecimiento (0%)</SelectItem>
                              <SelectItem value="20">Sutil (20%)</SelectItem>
                              <SelectItem value="40">Equilibrado recomendado (40%)</SelectItem>
                              <SelectItem value="60">Oscuro para alto contraste (60%)</SelectItem>
                              <SelectItem value="80">Muy oscuro (80%)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* C. Multi-Banner Slideshow Manager */}
                    {config.hero?.background_type === "slideshow" && (
                      <div className="space-y-3 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-[11px] font-bold">Carrusel Multi-Banner ({config.hero?.slides?.length || 0})</Label>
                            <p className="text-[10px] text-zinc-400">Rotación automática de imágenes promocionales</p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handleAddHeroSlide}
                            className="h-7 text-xs font-bold gap-1 rounded-xl bg-brand-pink hover:bg-brand-pink/90 text-white"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Añadir Slide</span>
                          </Button>
                        </div>

                        {/* List of slides */}
                        <div className="space-y-3">
                          {(!config.hero?.slides || config.hero.slides.length === 0) ? (
                            <div className="text-center py-6 border border-dashed rounded-xl border-zinc-300 dark:border-zinc-700 text-zinc-400 space-y-1">
                              <ImageIcon className="h-6 w-6 mx-auto opacity-50" />
                              <p className="text-xs">No hay slides añadidos aún.</p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddHeroSlide}
                                className="h-7 text-xs rounded-xl mt-2"
                              >
                                Añadir Primer Slide
                              </Button>
                            </div>
                          ) : (
                            config.hero.slides.map((slide, idx) => (
                              <div
                                key={slide.id || idx}
                                className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-2.5 relative"
                              >
                                <div className="flex items-center justify-between">
                                  <Badge variant="outline" className="text-[10px] font-mono">
                                    Slide #{idx + 1}
                                  </Badge>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveHeroSlide(idx)}
                                    className="text-zinc-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                                    title="Eliminar este slide"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                <ImageUpload
                                  value={slide.image_url || null}
                                  onChange={(url) => handleUpdateHeroSlide(idx, { image_url: url })}
                                  label={`Subir Imagen para Slide #${idx + 1}`}
                                  compact={true}
                                />

                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-bold">Título Opcional</Label>
                                    <Input
                                      value={slide.title || ""}
                                      placeholder="Dejar en blanco si no aplica"
                                      onChange={(e) => handleUpdateHeroSlide(idx, { title: e.target.value })}
                                      className="h-7 text-xs rounded-lg"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-bold">Enlace al Clic</Label>
                                    <Input
                                      value={slide.link_url || ""}
                                      placeholder="#catalog o https://..."
                                      onChange={(e) => handleUpdateHeroSlide(idx, { link_url: e.target.value })}
                                      className="h-7 text-xs rounded-lg font-mono text-[11px]"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[11px]">
                          <Label className="text-[11px] font-bold">Velocidad de Rotación</Label>
                          <Select
                            value={String(config.hero?.slide_interval ?? 5000)}
                            onValueChange={(val) =>
                              setConfig((prev) => ({
                                ...prev,
                                hero: { ...(prev.hero || DEFAULT_STOREFRONT_THEME_CONFIG.hero!), slide_interval: Number(val) },
                              }))
                            }
                          >
                            <SelectTrigger className="h-7 w-32 text-xs rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="3000">Rápido (3 seg)</SelectItem>
                              <SelectItem value="5000">Normal (5 seg)</SelectItem>
                              <SelectItem value="7000">Lento (7 seg)</SelectItem>
                              <SelectItem value="10000">Pausado (10 seg)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* 4. Banner Height Selector */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold">Altura del Banner</Label>
                      <Select
                        value={config.hero?.banner_height || "medium"}
                        onValueChange={(val: any) =>
                          setConfig((prev) => ({
                            ...prev,
                            hero: { ...(prev.hero || DEFAULT_STOREFRONT_THEME_CONFIG.hero!), banner_height: val },
                          }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="compact">Compacto (Menos altura)</SelectItem>
                          <SelectItem value="medium">Medio (Recomendado estándar)</SelectItem>
                          <SelectItem value="tall">Amplio (Mayor impacto visual)</SelectItem>
                          <SelectItem value="full">Pantalla Completa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 5. Graphical Banner Mode (Hide Text) */}
                    <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60">
                      <div>
                        <Label className="text-xs font-bold">Modo Banner Gráfico Puro</Label>
                        <p className="text-[10px] text-zinc-400">Oculta títulos y subtítulos si tus imágenes ya contienen el diseño publicitario</p>
                      </div>
                      <Switch
                        checked={config.hero?.hide_text ?? false}
                        onCheckedChange={(checked) =>
                          setConfig((prev) => ({
                            ...prev,
                            hero: { ...(prev.hero || DEFAULT_STOREFRONT_THEME_CONFIG.hero!), hide_text: checked },
                          }))
                        }
                      />
                    </div>

                    {/* 6. Typography & Text Alignment (If not in pure graphic mode) */}
                    {!config.hero?.hide_text && (
                      <div className="space-y-3 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 animate-in fade-in duration-200">
                        {/* Text Alignment */}
                        <div className="space-y-1.5">
                          <Label className="text-[11px] font-bold text-zinc-500">Alineación de Texto</Label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: "left", label: "Izquierda", icon: AlignLeft },
                              { id: "center", label: "Centrado", icon: AlignCenter },
                              { id: "right", label: "Derecha", icon: AlignRight },
                            ].map((align) => {
                              const Icon = align.icon
                              const isSelected = (config.hero?.text_align || "center") === align.id
                              return (
                                <button
                                  key={align.id}
                                  type="button"
                                  onClick={() =>
                                    setConfig((prev) => ({
                                      ...prev,
                                      hero: {
                                        ...(prev.hero || DEFAULT_STOREFRONT_THEME_CONFIG.hero!),
                                        text_align: align.id as any,
                                      },
                                    }))
                                  }
                                  className={cn(
                                    "flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer",
                                    isSelected
                                      ? "border-brand-pink bg-brand-pink/10 text-brand-pink shadow-xs"
                                      : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                                  )}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                  <span>{align.label}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Badge Text */}
                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold">Texto Badge Superior</Label>
                          <Input
                            value={config.hero?.badge_text || ""}
                            placeholder="Ej: Catálogo Oficial 2026"
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                hero: { ...(prev.hero || DEFAULT_STOREFRONT_THEME_CONFIG.hero!), badge_text: e.target.value },
                              }))
                            }
                            className="h-8 text-xs rounded-xl"
                          />
                        </div>

                        {/* Main Title */}
                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold">Título Principal</Label>
                          <Input
                            value={config.hero?.title || ""}
                            placeholder="Título impactante de tu tienda..."
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                hero: { ...(prev.hero || DEFAULT_STOREFRONT_THEME_CONFIG.hero!), title: e.target.value },
                              }))
                            }
                            className="h-8 text-xs rounded-xl font-bold"
                          />
                        </div>

                        {/* Subtitle */}
                        <div className="space-y-1">
                          <Label className="text-[11px] font-bold">Subtítulo / Bajada</Label>
                          <Textarea
                            rows={2}
                            value={config.hero?.subtitle || ""}
                            placeholder="Descripción de propuesta de valor..."
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                hero: { ...(prev.hero || DEFAULT_STOREFRONT_THEME_CONFIG.hero!), subtitle: e.target.value },
                              }))
                            }
                            className="text-xs rounded-xl"
                          />
                        </div>
                      </div>
                    )}

                    {/* 7. Action Buttons (CTAs) Controls */}
                    <div className="space-y-3 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60">
                      <Label className="text-[11px] font-bold text-zinc-500">Botones de Acción (CTAs)</Label>

                      {/* Primary CTA Toggle */}
                      <div className="space-y-2 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold">Botón Principal (CTA)</Label>
                          <Switch
                            checked={config.hero?.cta_enabled ?? true}
                            onCheckedChange={(checked) =>
                              setConfig((prev) => ({
                                ...prev,
                                hero: { ...(prev.hero || DEFAULT_STOREFRONT_THEME_CONFIG.hero!), cta_enabled: checked },
                              }))
                            }
                          />
                        </div>

                        {config.hero?.cta_enabled !== false && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold">Texto Botón</Label>
                              <Input
                                value={config.hero?.cta_text || ""}
                                placeholder="Explorar Catálogo"
                                onChange={(e) =>
                                  setConfig((prev) => ({
                                    ...prev,
                                    hero: { ...(prev.hero || DEFAULT_STOREFRONT_THEME_CONFIG.hero!), cta_text: e.target.value },
                                  }))
                                }
                                className="h-7 text-xs rounded-lg"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-bold">Enlace / Destino</Label>
                              <Input
                                value={config.hero?.cta_url || ""}
                                placeholder="#catalog"
                                onChange={(e) =>
                                  setConfig((prev) => ({
                                    ...prev,
                                    hero: { ...(prev.hero || DEFAULT_STOREFRONT_THEME_CONFIG.hero!), cta_url: e.target.value },
                                  }))
                                }
                                className="h-7 text-xs rounded-lg font-mono text-[11px]"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* WhatsApp Direct CTA Toggle */}
                      <div className="space-y-2 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold">Botón WhatsApp Directo</Label>
                          <Switch
                            checked={config.hero?.whatsapp_cta_enabled ?? true}
                            onCheckedChange={(checked) =>
                              setConfig((prev) => ({
                                ...prev,
                                hero: { ...(prev.hero || DEFAULT_STOREFRONT_THEME_CONFIG.hero!), whatsapp_cta_enabled: checked },
                              }))
                            }
                          />
                        </div>

                        {config.hero?.whatsapp_cta_enabled !== false && (
                          <div className="space-y-1 pt-1">
                            <Label className="text-[10px] font-bold">Texto Botón WhatsApp</Label>
                            <Input
                              value={config.hero?.whatsapp_cta_text || ""}
                              placeholder="WhatsApp Directo"
                              onChange={(e) =>
                                setConfig((prev) => ({
                                  ...prev,
                                  hero: { ...(prev.hero || DEFAULT_STOREFRONT_THEME_CONFIG.hero!), whatsapp_cta_text: e.target.value },
                                }))
                              }
                              className="h-7 text-xs rounded-lg"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
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
              <AccordionContent className="space-y-4 pt-1 pb-4">
                {/* Global Primary CTA Selector */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-brand-pink" />
                      Canal de Acción Principal (Global Primary CTA)
                    </Label>
                    <Badge variant="outline" className="text-[10px] bg-brand-pink/10 text-brand-pink border-brand-pink/30 font-semibold py-0">
                      Global
                    </Badge>
                  </div>

                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Define la acción por defecto para todos los productos y servicios de la tienda.
                  </p>

                  <Select
                    value={config.primary_cta || "whatsapp"}
                    onValueChange={(val: any) =>
                      setConfig((prev) => ({
                        ...prev,
                        primary_cta: val,
                      }))
                    }
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl font-medium">
                      <SelectValue placeholder="Selecciona el CTA principal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">
                        <div className="flex items-center gap-2 text-xs">
                          <span>💬</span>
                          <div>
                            <span className="font-bold">WhatsApp Directo</span>
                            <span className="text-[11px] text-zinc-400 ml-1.5">— Pedir directamente por WhatsApp</span>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="cart">
                        <div className="flex items-center gap-2 text-xs">
                          <span>🛒</span>
                          <div>
                            <span className="font-bold">Carrito de Compras</span>
                            <span className="text-[11px] text-zinc-400 ml-1.5">— Carrito de Compras y Slide-Over Drawer</span>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="buy">
                        <div className="flex items-center gap-2 text-xs">
                          <span>💳</span>
                          <div>
                            <span className="font-bold">Compra Directa Online</span>
                            <span className="text-[11px] text-zinc-400 ml-1.5">— Compra Directa Online con Wompi</span>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="quote">
                        <div className="flex items-center gap-2 text-xs">
                          <span>📋</span>
                          <div>
                            <span className="font-bold">Cotización Formal CRM</span>
                            <span className="text-[11px] text-zinc-400 ml-1.5">— Solicitar Cotización Formal 1-Click</span>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="booking">
                        <div className="flex items-center gap-2 text-xs">
                          <span>📅</span>
                          <div>
                            <span className="font-bold">Agendar Cita</span>
                            <span className="text-[11px] text-zinc-400 ml-1.5">— Agendamiento Directo de Citas</span>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Helpful description badge */}
                  <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 text-zinc-400 mt-0.5 shrink-0" />
                    <span className="leading-snug">
                      <strong>Nota:</strong> Cada producto o servicio en el <em>Editor de Ítems</em> puede sobreescribir este canal global (ej. un producto físico puede usar Carrito mientras una consultoría usa Cotización o Cita).
                    </span>
                  </div>
                </div>

                <div className="pt-1 space-y-3">
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
          darkLogo={darkLogo || organization?.logos?.dark || null}
          lightLogo={lightLogo || organization?.logos?.light || null}
        />
      </div>
    </div>
  )
}
