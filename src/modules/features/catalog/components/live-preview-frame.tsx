"use client"

import React, { useState, useEffect } from "react"
import { StorefrontThemeConfig, UniversalCatalogItem } from "@/types/catalog"
import { StorefrontHeroBanner } from "@/modules/features/portal/components/universal-storefront/storefront-hero-banner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
  Search,
  MessageCircle,
  ShoppingCart,
  CreditCard,
  FileSpreadsheet,
  Calendar,
  Star,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Quote,
  Instagram,
  Facebook,
  Globe,
  Twitter,
  Linkedin,
  Youtube,
} from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"

export type ViewportMode = "desktop" | "tablet" | "mobile"

export interface LivePreviewFrameProps {
  themeConfig: StorefrontThemeConfig
  sampleItems?: UniversalCatalogItem[]
  orgName?: string
  portalUrl?: string
  darkLogo?: string | null
  lightLogo?: string | null
}

export function LivePreviewFrame({
  themeConfig,
  sampleItems = [],
  orgName = "Mi Tienda",
  portalUrl = "/portal",
  darkLogo = null,
  lightLogo = null,
}: LivePreviewFrameProps) {
  const [viewport, setViewport] = useState<ViewportMode>("desktop")
  const [activeCategory, setActiveCategory] = useState("all")
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null)
  const [activeTestimonialIdx, setActiveTestimonialIdx] = useState(0)
  const [isTestimonialsPaused, setIsTestimonialsPaused] = useState(false)

  const testimonialsCount = themeConfig.testimonials?.length || 0
  const visibleCards = viewport === "desktop" ? 3 : viewport === "tablet" ? 2 : 1
  const maxIndex = Math.max(0, testimonialsCount - visibleCards)
  const hasMultipleSlides = testimonialsCount > visibleCards

  useEffect(() => {
    if (activeTestimonialIdx > maxIndex) {
      setActiveTestimonialIdx(maxIndex)
    }
  }, [activeTestimonialIdx, maxIndex])

  useEffect(() => {
    if (!hasMultipleSlides || isTestimonialsPaused) return
    const timer = setInterval(() => {
      setActiveTestimonialIdx((prev) => (prev >= maxIndex ? 0 : prev + 1))
    }, 4500)
    return () => clearInterval(timer)
  }, [hasMultipleSlides, maxIndex, isTestimonialsPaused])

  const hero = themeConfig.hero || {
    enabled: true,
    title: "Descubre Nuestras Soluciones",
    subtitle: "Calidad superior, innovación y servicio personalizado.",
    cta_text: "Explorar Catálogo",
    cta_url: "#catalog",
    bg_gradient: "from-indigo-900 via-slate-900 to-black",
    badge_text: "Portafolio 2026",
  }

  // Fallback demo items if none passed
  const displayItems = sampleItems.length > 0 ? sampleItems : [
    {
      id: "demo-1",
      organization_id: "demo",
      name: "Consultoría Estratégica & Growth",
      category: "Estrategia",
      base_price: 1500000,
      description: "Diagnóstico completo y plan táctico de escalamiento comercial.",
      image_url: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&auto=format&fit=crop&q=80",
      type: "one_off" as const,
      is_visible_in_portal: true,
      has_variants: true,
      badges: ["Destacado"],
    },
    {
      id: "demo-2",
      organization_id: "demo",
      name: "Desarrollo E-Commerce Premium",
      category: "Desarrollo",
      base_price: 3200000,
      description: "Plataforma de ventas con pasarela de pagos integrada y SEO.",
      image_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
      type: "one_off" as const,
      is_visible_in_portal: true,
      has_variants: false,
      badges: ["Novedad"],
    },
    {
      id: "demo-3",
      organization_id: "demo",
      name: "Membresía Branding Continuo",
      category: "Diseño",
      base_price: 850000,
      description: "Diseño ilimitado mensual para redes, empaques y campañas.",
      image_url: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600&auto=format&fit=crop&q=80",
      type: "recurring" as const,
      frequency: "monthly" as const,
      is_visible_in_portal: true,
      has_variants: false,
      badges: ["Suscripción"],
    },
  ]

  const categories = ["all", ...Array.from(new Set(displayItems.map((i) => i.category)))]

  return (
    <div className="flex flex-col h-full rounded-3xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 overflow-hidden shadow-2xl">
      {/* Top Device & Viewport Controller Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/10 shrink-0">
        {/* Viewport Switchers */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setViewport("desktop")}
            className={cn(
              "h-8 px-3 rounded-lg text-xs font-semibold gap-1.5 transition-all",
              viewport === "desktop" ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs" : "text-zinc-500"
            )}
          >
            <Monitor className="h-3.5 w-3.5" />
            Desktop
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setViewport("tablet")}
            className={cn(
              "h-8 px-3 rounded-lg text-xs font-semibold gap-1.5 transition-all",
              viewport === "tablet" ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs" : "text-zinc-500"
            )}
          >
            <Tablet className="h-3.5 w-3.5" />
            Tablet
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setViewport("mobile")}
            className={cn(
              "h-8 px-3 rounded-lg text-xs font-semibold gap-1.5 transition-all",
              viewport === "mobile" ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs" : "text-zinc-500"
            )}
          >
            <Smartphone className="h-3.5 w-3.5" />
            Móvil
          </Button>
        </div>

        {/* Mock Browser URL & Actions */}
        <div className="hidden sm:flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 px-3 py-1 rounded-xl border border-zinc-200 dark:border-white/5 text-xs text-zinc-400 font-mono max-w-[280px] truncate">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="truncate">pixy.agency/portal/live-preview</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => window.open(portalUrl, "_blank")}
            className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-xl"
            title="Abrir portal en nueva pestaña"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Frame Canvas Simulator Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex items-start justify-center bg-zinc-200/50 dark:bg-zinc-900/50">
        <div
          className={cn(
            "transition-all duration-300 bg-white dark:bg-[#09090b] shadow-2xl rounded-3xl overflow-hidden border border-zinc-300 dark:border-zinc-800 flex flex-col",
            viewport === "desktop" && "w-full max-w-5xl min-h-[640px]",
            viewport === "tablet" && "w-[768px] min-h-[600px] border-[8px] border-zinc-800 rounded-[2.5rem]",
            viewport === "mobile" && "w-[375px] min-h-[600px] border-[10px] border-zinc-900 rounded-[3rem]"
          )}
        >
          {/* Simulated Storefront Content */}
          {(() => {
            const isDarkTheme =
              themeConfig.theme === "dark_luxe" ||
              themeConfig.theme === "cyber_glass_3d" ||
              themeConfig.theme === "modern_glass" ||
              themeConfig.color_mode === "dark" ||
              (typeof (themeConfig as any).dark_mode === "boolean" ? (themeConfig as any).dark_mode : false)

            const orgLogo = isDarkTheme ? (darkLogo || lightLogo) : (lightLogo || darkLogo)

            return (
              <div className={cn(
                "flex flex-col flex-1 overflow-y-auto",
                themeConfig.theme === "editorial" ? "font-serif" : themeConfig.theme === "swiss" ? "font-mono" : "font-sans",
                isDarkTheme ? "bg-zinc-950 text-white" : themeConfig.theme === "gourmet_elegance" ? "bg-amber-50/20 text-stone-900" : "bg-zinc-50 text-zinc-900"
              )}>
                {/* Header */}
                <header className={cn(
                  "sticky top-0 z-30 px-6 py-3.5 backdrop-blur-md border-b flex items-center justify-between",
                  isDarkTheme ? "bg-zinc-950/80 border-zinc-800 text-white" : "bg-white/80 border-zinc-200 text-zinc-900"
                )}>
                  <div className="flex items-center gap-2">
                    {orgLogo ? (
                      <img
                        src={orgLogo}
                        alt={orgName}
                        className="h-7 max-w-[140px] object-contain object-left"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span
                          className="h-7 w-7 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-xs"
                          style={{ backgroundColor: themeConfig.primary_color }}
                        >
                          {orgName?.charAt(0)?.toUpperCase() || "P"}
                        </span>
                        <span className={cn("font-extrabold text-sm tracking-tight", isDarkTheme ? "text-white" : "text-zinc-900")}>
                          {orgName}
                        </span>
                      </div>
                    )}
                  </div>

                  {themeConfig.enable_search && (
                    <div className={cn(
                      "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs w-44",
                      isDarkTheme ? "bg-zinc-900 text-zinc-400" : "bg-zinc-100 text-zinc-400"
                    )}>
                      <Search className="h-3.5 w-3.5" />
                      <span>Buscar catálogo...</span>
                    </div>
                  )}
                </header>

                {/* Hero Section */}
                {hero.enabled && (
                  <StorefrontHeroBanner
                    hero={hero}
                    primaryColor={themeConfig.primary_color}
                    secondaryColor={themeConfig.secondary_color}
                    isDarkTheme={isDarkTheme}
                    isPreview={true}
                  />
                )}

                {/* Category Navigation Bar Supporting All Customizer Styles */}
                <section className={cn("px-6 py-4 border-b", isDarkTheme ? "border-zinc-800" : "border-zinc-100")}>
                  {/* 1. TABS STYLE */}
                  {themeConfig.navigation_style === "tabs" && (
                    <div className={cn(
                      "inline-flex p-1 rounded-xl border max-w-full overflow-x-auto",
                      isDarkTheme ? "bg-zinc-800 border-zinc-700" : "bg-zinc-100 border-zinc-200"
                    )}>
                      {categories.map((cat) => {
                        const isSelected = activeCategory === cat
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setActiveCategory(cat)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                              isSelected
                                ? isDarkTheme ? "bg-zinc-900 text-white shadow-xs" : "bg-white text-zinc-900 shadow-xs"
                                : isDarkTheme ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
                            )}
                          >
                            <span style={isSelected ? { color: themeConfig.primary_color } : {}}>
                              {cat === "all" ? "Todos" : cat}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* 2. UNDERLINE TABS STYLE */}
                  {themeConfig.navigation_style === "underline_tabs" && (
                    <div className="flex items-center gap-4 overflow-x-auto pb-0">
                      {categories.map((cat) => {
                        const isSelected = activeCategory === cat
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setActiveCategory(cat)}
                            className={cn(
                              "pb-2 text-xs font-bold whitespace-nowrap relative cursor-pointer",
                              isSelected
                                ? isDarkTheme ? "text-white font-extrabold" : "text-zinc-900 font-extrabold"
                                : isDarkTheme ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-400 hover:text-zinc-600"
                            )}
                          >
                            <span style={isSelected ? { color: themeConfig.primary_color } : {}}>
                              {cat === "all" ? "Todos" : cat}
                            </span>
                            {isSelected && (
                              <span
                                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                                style={{ backgroundColor: themeConfig.primary_color }}
                              />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* 3. GLASS CARDS STYLE */}
                  {themeConfig.navigation_style === "glass_cards" && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {categories.map((cat) => {
                        const isSelected = activeCategory === cat
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setActiveCategory(cat)}
                            className={cn(
                              "p-2.5 rounded-xl border text-left transition-all backdrop-blur-md cursor-pointer",
                              isSelected
                                ? "border-transparent text-white shadow-sm font-bold"
                                : isDarkTheme
                                ? "border-zinc-800 bg-zinc-900/60 text-zinc-300"
                                : "border-zinc-200 bg-white text-zinc-700"
                            )}
                            style={isSelected ? { backgroundColor: themeConfig.primary_color } : {}}
                          >
                            <span className="text-[10px] uppercase font-mono opacity-80 block">Categoría</span>
                            <span className="text-xs font-bold truncate mt-0.5 block">{cat === "all" ? "Todos" : cat}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* 4. FLOATING DOCK STYLE */}
                  {themeConfig.navigation_style === "floating_dock" && (
                    <div className="flex justify-center w-full">
                      <div className={cn(
                        "inline-flex items-center gap-1 p-1.5 rounded-full backdrop-blur-xl border shadow-lg overflow-x-auto",
                        isDarkTheme ? "bg-zinc-900/90 border-zinc-800" : "bg-white/90 border-zinc-200"
                      )}>
                        {categories.map((cat) => {
                          const isSelected = activeCategory === cat
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setActiveCategory(cat)}
                              className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer",
                                isSelected
                                  ? "text-white shadow-xs"
                                  : isDarkTheme ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-900"
                              )}
                              style={isSelected ? { backgroundColor: themeConfig.primary_color } : {}}
                            >
                              {cat === "all" ? "Todos" : cat}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* 5. PILLS STYLE (DEFAULT) */}
                  {(themeConfig.navigation_style === "pills" || (!["tabs", "underline_tabs", "glass_cards", "floating_dock"].includes(themeConfig.navigation_style || ""))) && (
                    <div className="flex gap-2 overflow-x-auto">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setActiveCategory(cat)}
                          className={cn(
                            "px-4 py-1.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-all cursor-pointer",
                            activeCategory === cat
                              ? "text-white shadow-sm"
                              : isDarkTheme
                              ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                          )}
                          style={activeCategory === cat ? { backgroundColor: themeConfig.primary_color } : {}}
                        >
                          {cat === "all" ? "Todos los Servicios" : cat}
                        </button>
                      ))}
                    </div>
                  )}
                </section>

                {/* Catalog Grid / List / Masonry */}
                <section className="p-6">
                  {themeConfig.card_layout === "list" ? (
                    /* LIST LAYOUT */
                    <div className="flex flex-col gap-3">
                      {displayItems
                        .filter((i) => activeCategory === "all" || i.category === activeCategory)
                        .map((item) => (
                          <div
                            key={item.id}
                            className={cn(
                              "group rounded-2xl border overflow-hidden transition-all flex flex-col sm:flex-row items-center",
                              themeConfig.theme === "neo_brutalist"
                                ? "border-2 border-black rounded-none bg-white text-zinc-900 shadow-[3px_3px_0px_0px_#000000]"
                                : themeConfig.theme === "cyber_glass_3d" || themeConfig.theme === "modern_glass"
                                ? "border border-cyan-500/20 bg-zinc-900/60 backdrop-blur-xl shadow-lg text-white"
                                : isDarkTheme
                                ? "border-zinc-800 bg-zinc-900 text-white shadow-xs"
                                : "border-zinc-200 bg-white text-zinc-900 shadow-xs"
                            )}
                          >
                            {item.image_url && (
                              <div className={cn("w-full sm:w-44 h-28 shrink-0 overflow-hidden relative", isDarkTheme ? "bg-zinc-800" : "bg-zinc-100")}>
                                <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                                {item.badges && item.badges.length > 0 && (
                                  <Badge className="absolute top-2 left-2 text-[9px] font-bold text-white" style={{ backgroundColor: themeConfig.accent_color || themeConfig.primary_color }}>
                                    {typeof item.badges[0] === "string" ? item.badges[0] : (item.badges[0] as any)?.label}
                                  </Badge>
                                )}
                              </div>
                            )}
                            <div className="p-3.5 flex-1 flex flex-col justify-between space-y-1.5 w-full">
                              <div>
                                <span className={cn("text-[9px] font-bold uppercase tracking-wider", isDarkTheme ? "text-zinc-400" : "text-zinc-400")}>{item.category}</span>
                                <h3 className={cn("font-bold text-xs line-clamp-1", isDarkTheme ? "text-white" : "text-zinc-900")}>{item.name}</h3>
                                <p className={cn("text-[11px] line-clamp-1", isDarkTheme ? "text-zinc-400" : "text-zinc-500")}>{item.description}</p>
                              </div>
                              <div className={cn("flex items-center justify-between pt-1.5 border-t", isDarkTheme ? "border-zinc-800" : "border-zinc-100")}>
                                <span className="font-black text-xs" style={{ color: themeConfig.primary_color }}>
                                  ${item.base_price.toLocaleString()} COP
                                </span>
                                <Button size="sm" className="h-7 px-3 rounded-lg text-[11px] font-bold text-white" style={{ backgroundColor: themeConfig.primary_color }}>
                                  Acción
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    /* GRID & MASONRY LAYOUTS */
                    <div
                      className={cn(
                        "gap-4",
                        themeConfig.card_layout === "masonry"
                          ? viewport === "mobile" ? "columns-1" : "columns-2 sm:columns-3 space-y-4 [column-fill:_balance]"
                          : viewport === "mobile"
                          ? "grid grid-cols-1"
                          : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                      )}
                    >
                      {displayItems
                        .filter((i) => activeCategory === "all" || i.category === activeCategory)
                        .map((item) => (
                          <div
                            key={item.id}
                            className={cn(
                              "group rounded-2xl border overflow-hidden transition-all flex flex-col",
                              themeConfig.card_layout === "masonry" && "break-inside-avoid mb-4",
                              themeConfig.theme === "neo_brutalist"
                                ? "border-2 border-black rounded-none bg-white text-zinc-900 shadow-[3px_3px_0px_0px_#000000]"
                                : themeConfig.theme === "cyber_glass_3d" || themeConfig.theme === "modern_glass"
                                ? "border border-cyan-500/20 bg-zinc-900/60 backdrop-blur-xl shadow-lg text-white"
                                : isDarkTheme
                                ? "border-zinc-800 bg-zinc-900 text-white shadow-xs"
                                : "border-zinc-200 bg-white text-zinc-900 shadow-xs hover:shadow-md"
                            )}
                          >
                            {item.image_url && (
                              <div className={cn("h-36 w-full overflow-hidden relative", isDarkTheme ? "bg-zinc-800" : "bg-zinc-100")}>
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                {item.badges && item.badges.length > 0 && (
                                  <Badge
                                    className="absolute top-2 left-2 text-[10px] font-bold text-white shadow-xs"
                                    style={{ backgroundColor: themeConfig.accent_color || themeConfig.primary_color }}
                                  >
                                    {typeof item.badges[0] === "string" ? item.badges[0] : (item.badges[0] as any)?.label}
                                  </Badge>
                                )}
                              </div>
                            )}
                            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                              <div>
                                <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDarkTheme ? "text-zinc-400" : "text-zinc-400")}>
                                  {item.category}
                                </span>
                                <h3 className={cn("font-bold text-sm mt-0.5 line-clamp-1", isDarkTheme ? "text-white" : "text-zinc-900")}>
                                  {item.name}
                                </h3>
                                <p className={cn("text-xs mt-1 line-clamp-2", isDarkTheme ? "text-zinc-400" : "text-zinc-500")}>
                                  {item.description}
                                </p>
                              </div>

                              <div className={cn("flex items-center justify-between pt-2 border-t", isDarkTheme ? "border-zinc-800" : "border-zinc-100")}>
                                <span className="font-black text-sm" style={{ color: themeConfig.primary_color }}>
                                  ${item.base_price.toLocaleString()} COP
                                </span>
                                {(() => {
                                  const effectiveCta = item.cta_type || themeConfig.primary_cta || "whatsapp"
                                  switch (effectiveCta) {
                                    case "cart":
                                    case "add_to_cart":
                                      return (
                                        <Button
                                          size="sm"
                                          className="h-8 px-3 rounded-xl text-xs font-bold text-white gap-1"
                                          style={{ backgroundColor: themeConfig.primary_color }}
                                        >
                                          <ShoppingCart className="h-3.5 w-3.5" />
                                          Añadir
                                        </Button>
                                      )
                                    case "buy":
                                      return (
                                        <Button
                                          size="sm"
                                          className="h-8 px-3 rounded-xl text-xs font-bold text-white gap-1"
                                          style={{ backgroundColor: themeConfig.primary_color }}
                                        >
                                          <CreditCard className="h-3.5 w-3.5" />
                                          Comprar
                                        </Button>
                                      )
                                    case "quote":
                                      return (
                                        <Button
                                          size="sm"
                                          className="h-8 px-3 rounded-xl text-xs font-bold text-white gap-1"
                                          style={{ backgroundColor: themeConfig.primary_color }}
                                        >
                                          <FileSpreadsheet className="h-3.5 w-3.5" />
                                          Cotizar
                                        </Button>
                                      )
                                    case "booking":
                                    case "appointment":
                                      return (
                                        <Button
                                          size="sm"
                                          className="h-8 px-3 rounded-xl text-xs font-bold text-white gap-1"
                                          style={{ backgroundColor: themeConfig.primary_color }}
                                        >
                                          <Calendar className="h-3.5 w-3.5" />
                                          Agendar
                                        </Button>
                                      )
                                    case "whatsapp":
                                    default:
                                      if (themeConfig.enable_whatsapp_checkout === false) return null
                                      return (
                                        <Button
                                          size="sm"
                                          className="h-8 px-3 rounded-xl text-xs font-bold text-white gap-1"
                                          style={{ backgroundColor: themeConfig.primary_color }}
                                        >
                                          <MessageCircle className="h-3.5 w-3.5" />
                                          Pedir
                                        </Button>
                                      )
                                  }
                                })()}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </section>

                {/* FAQ Accordion Section Preview */}
                {themeConfig.faq && themeConfig.faq.length > 0 && (
                  <section className={cn(
                    "px-6 py-8 border-t",
                    isDarkTheme ? "bg-zinc-900/50 border-zinc-800" : "bg-zinc-50 border-zinc-100"
                  )}>
                    <div className="max-w-2xl mx-auto space-y-4">
                      <div className="text-center space-y-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] uppercase font-mono px-2.5 py-0.5 rounded-full border font-semibold tracking-wider transition-colors",
                            isDarkTheme
                              ? "bg-zinc-850 border-zinc-700 text-zinc-100 shadow-xs"
                              : "bg-zinc-100 border-zinc-200 text-zinc-800"
                          )}
                        >
                          Preguntas Frecuentes
                        </Badge>
                        <h2 className={cn("text-lg font-bold", isDarkTheme ? "text-white" : "text-zinc-900")}>
                          Preguntas Frecuentes
                        </h2>
                        <p className={cn("text-xs", isDarkTheme ? "text-zinc-400" : "text-zinc-500")}>
                          Todo lo que necesitas saber antes de contratar
                        </p>
                      </div>

                      <div className="space-y-2">
                        {themeConfig.faq.map((faq, fIdx) => {
                          const id = faq.id || `faq-${fIdx}`
                          const isOpen = expandedFaqId === id
                          return (
                            <div
                              key={id}
                              className={cn(
                                "rounded-2xl border overflow-hidden",
                                isDarkTheme ? "border-zinc-800 bg-zinc-900" : "border-zinc-200 bg-white"
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => setExpandedFaqId(isOpen ? null : id)}
                                className={cn(
                                  "w-full px-4 py-3 text-left font-bold text-xs flex items-center justify-between cursor-pointer",
                                  isDarkTheme ? "text-white" : "text-zinc-900"
                                )}
                              >
                                <span>{faq.question}</span>
                                <ChevronDown className={cn("h-4 w-4 text-zinc-400 transition-transform", isOpen && "rotate-180")} />
                              </button>
                              {isOpen && (
                                <div className={cn(
                                  "px-4 pb-3 text-xs leading-relaxed border-t pt-2",
                                  isDarkTheme ? "text-zinc-400 border-zinc-800" : "text-zinc-600 border-zinc-100"
                                )}>
                                  {faq.answer}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </section>
                )}

                {/* Testimonials Animated Slider Preview */}
                {themeConfig.testimonials && themeConfig.testimonials.length > 0 && (
                  <section
                    className={cn(
                      "px-6 py-8 border-t space-y-4 select-none",
                      isDarkTheme ? "border-zinc-800" : "border-zinc-100"
                    )}
                    onMouseEnter={() => setIsTestimonialsPaused(true)}
                    onMouseLeave={() => setIsTestimonialsPaused(false)}
                  >
                    {/* Centered Symmetrical Header */}
                    <div className="text-center space-y-1 mb-4">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] uppercase font-mono px-2.5 py-0.5 rounded-full border font-semibold tracking-wider transition-colors",
                          isDarkTheme
                            ? "bg-zinc-850 border-zinc-700 text-zinc-100 shadow-xs"
                            : "bg-zinc-100 border-zinc-200 text-zinc-800"
                        )}
                      >
                        Experiencias de Clientes
                      </Badge>
                      <h2 className={cn("text-base font-bold", isDarkTheme ? "text-white" : "text-zinc-900")}>
                        Opiniones de Clientes
                      </h2>
                    </div>

                    {/* Sliding Track */}
                    <div className="overflow-hidden relative -mx-1">
                      <div
                        className="flex transition-transform duration-500 ease-out"
                        style={{
                          transform: `translateX(-${activeTestimonialIdx * (100 / visibleCards)}%)`,
                        }}
                      >
                        {themeConfig.testimonials.map((t, idx) => (
                          <div
                            key={t.id || idx}
                            className="w-full shrink-0 px-1 sm:w-1/2 lg:w-1/3"
                          >
                            <div
                              className={cn(
                                "p-4 rounded-2xl border space-y-3 relative overflow-hidden h-full flex flex-col justify-between",
                                isDarkTheme ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-200 shadow-xs"
                              )}
                            >
                              <Quote className="absolute top-3 right-3 h-6 w-6 text-zinc-400/20 pointer-events-none" />
                              <div className="flex items-center gap-1 text-amber-400">
                                {Array.from({ length: t.rating || 5 }).map((_, r) => (
                                  <Star key={r} className="h-3.5 w-3.5 fill-amber-400" />
                                ))}
                              </div>
                              <p className={cn("text-xs italic leading-relaxed line-clamp-3", isDarkTheme ? "text-zinc-300" : "text-zinc-600")}>
                                &ldquo;{t.quote}&rdquo;
                              </p>
                              <div className={cn("text-xs font-bold pt-2 border-t", isDarkTheme ? "border-zinc-800 text-white" : "border-zinc-100 text-zinc-900")}>
                                {t.name} <span className="font-normal text-zinc-400">• {t.role || t.company || "Cliente"}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Centered Navigation Bar (Arrows + Dots) */}
                    {hasMultipleSlides && (
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setActiveTestimonialIdx((prev) => (prev <= 0 ? maxIndex : prev - 1))}
                          className={cn(
                            "h-6 w-6 rounded-full flex items-center justify-center border transition-all cursor-pointer",
                            isDarkTheme ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white" : "bg-white border-zinc-200 text-zinc-700 hover:text-zinc-900"
                          )}
                          aria-label="Anterior"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </button>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: maxIndex + 1 }).map((_, dIdx) => (
                            <button
                              key={dIdx}
                              type="button"
                              onClick={() => setActiveTestimonialIdx(dIdx)}
                              className={cn(
                                "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                                activeTestimonialIdx === dIdx
                                  ? "w-4 bg-primary"
                                  : "w-1.5 bg-zinc-300 dark:bg-zinc-700 opacity-60"
                              )}
                              style={activeTestimonialIdx === dIdx ? { backgroundColor: themeConfig.primary_color } : {}}
                              aria-label={`Posición ${dIdx + 1}`}
                            />
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveTestimonialIdx((prev) => (prev >= maxIndex ? 0 : prev + 1))}
                          className={cn(
                            "h-6 w-6 rounded-full flex items-center justify-center border transition-all cursor-pointer",
                            isDarkTheme ? "bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white" : "bg-white border-zinc-200 text-zinc-700 hover:text-zinc-900"
                          )}
                          aria-label="Siguiente"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </section>
                )}

                {/* Footer Preview */}
                <footer className={cn(
                  "mt-auto px-6 py-6 border-t text-xs",
                  isDarkTheme ? "bg-zinc-950 text-zinc-400 border-zinc-800" : "bg-zinc-900 text-zinc-400 border-zinc-800"
                )}>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{orgName}</span>
                      <span>• Todos los derechos reservados</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {themeConfig.social_links?.instagram && <Instagram className="h-4 w-4 hover:text-white cursor-pointer" />}
                      {themeConfig.social_links?.facebook && <Facebook className="h-4 w-4 hover:text-white cursor-pointer" />}
                      {themeConfig.social_links?.twitter && <Twitter className="h-4 w-4 hover:text-white cursor-pointer" />}
                      {themeConfig.social_links?.linkedin && <Linkedin className="h-4 w-4 hover:text-white cursor-pointer" />}
                      {themeConfig.social_links?.youtube && <Youtube className="h-4 w-4 hover:text-white cursor-pointer" />}
                      <Globe className="h-4 w-4 hover:text-white cursor-pointer" />
                    </div>
                  </div>
                </footer>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
