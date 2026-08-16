"use client"

import React, { useState } from "react"
import { StorefrontThemeConfig, UniversalCatalogItem } from "@/types/catalog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
  Search,
  MessageCircle,
  Star,
  ChevronDown,
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
}

export function LivePreviewFrame({
  themeConfig,
  sampleItems = [],
  orgName = "Mi Tienda",
  portalUrl = "/portal",
}: LivePreviewFrameProps) {
  const [viewport, setViewport] = useState<ViewportMode>("desktop")
  const [activeCategory, setActiveCategory] = useState("all")
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null)

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
          <div className="flex flex-col flex-1 overflow-y-auto">
            {/* Header */}
            <header className="sticky top-0 z-30 px-6 py-3.5 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-7 w-7 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-xs"
                  style={{ backgroundColor: themeConfig.primary_color }}
                >
                  P
                </span>
                <span className="font-extrabold text-sm text-zinc-900 dark:text-white tracking-tight">
                  {orgName}
                </span>
              </div>

              {themeConfig.enable_search && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-400 w-44">
                  <Search className="h-3.5 w-3.5" />
                  <span>Buscar catálogo...</span>
                </div>
              )}
            </header>

            {/* Hero Section */}
            {hero.enabled && (
              <section className={cn("p-8 sm:p-12 text-white bg-linear-to-r relative overflow-hidden", hero.bg_gradient)}>
                <div className="max-w-2xl space-y-3 relative z-10">
                  {hero.badge_text && (
                    <Badge className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-md border-transparent text-xs font-semibold px-3 py-0.5">
                      {hero.badge_text}
                    </Badge>
                  )}
                  <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                    {hero.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                    {hero.subtitle}
                  </p>
                  <div className="pt-2">
                    <Button
                      style={{ backgroundColor: themeConfig.primary_color }}
                      className="text-white font-bold rounded-2xl text-xs h-10 px-6 shadow-lg shadow-black/20"
                    >
                      {hero.cta_text}
                    </Button>
                  </div>
                </div>
              </section>
            )}

            {/* Category Navigation Bar */}
            <section className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex gap-2 overflow-x-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-all",
                    activeCategory === cat
                      ? "text-white shadow-sm"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                  )}
                  style={activeCategory === cat ? { backgroundColor: themeConfig.primary_color } : {}}
                >
                  {cat === "all" ? "Todos los Servicios" : cat}
                </button>
              ))}
            </section>

            {/* Catalog Grid */}
            <section className="p-6">
              <div
                className={cn(
                  "gap-4",
                  themeConfig.card_layout === "list"
                    ? "flex flex-col"
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
                      className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
                    >
                      {item.image_url && (
                        <div className="h-36 w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden relative">
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
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            {item.category}
                          </span>
                          <h3 className="font-bold text-sm text-zinc-900 dark:text-white mt-0.5 line-clamp-1">
                            {item.name}
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                            {item.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                          <span className="font-black text-sm text-zinc-900 dark:text-white">
                            ${item.base_price.toLocaleString()} COP
                          </span>
                          {themeConfig.enable_whatsapp_checkout && (
                            <Button
                              size="sm"
                              className="h-8 px-3 rounded-xl text-xs font-bold text-white gap-1"
                              style={{ backgroundColor: themeConfig.primary_color }}
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              Pedir
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </section>

            {/* FAQ Accordion Section Preview */}
            {themeConfig.faq && themeConfig.faq.length > 0 && (
              <section className="px-6 py-8 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800">
                <div className="max-w-2xl mx-auto space-y-4">
                  <div className="text-center space-y-1">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                      Preguntas Frecuentes
                    </h2>
                    <p className="text-xs text-zinc-500">
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
                          className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() => setExpandedFaqId(isOpen ? null : id)}
                            className="w-full px-4 py-3 text-left font-bold text-xs text-zinc-900 dark:text-white flex items-center justify-between cursor-pointer"
                          >
                            <span>{faq.question}</span>
                            <ChevronDown className={cn("h-4 w-4 text-zinc-400 transition-transform", isOpen && "rotate-180")} />
                          </button>
                          {isOpen && (
                            <div className="px-4 pb-3 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-800 pt-2">
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

            {/* Testimonials Preview */}
            {themeConfig.testimonials && themeConfig.testimonials.length > 0 && (
              <section className="px-6 py-8 border-t border-zinc-100 dark:border-zinc-800">
                <div className="text-center space-y-1 mb-6">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                    Opiniones de Clientes
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {themeConfig.testimonials.map((t, idx) => (
                    <div key={t.id || idx} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center gap-1 text-amber-400">
                        {Array.from({ length: t.rating || 5 }).map((_, r) => (
                          <Star key={r} className="h-3.5 w-3.5 fill-amber-400" />
                        ))}
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 italic">
                        &ldquo;{t.quote}&rdquo;
                      </p>
                      <div className="text-xs font-bold text-zinc-900 dark:text-white">
                        {t.name} <span className="font-normal text-zinc-400">• {t.role || t.company}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Footer Preview */}
            <footer className="mt-auto px-6 py-6 bg-zinc-900 text-zinc-400 border-t border-zinc-800 text-xs">
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
        </div>
      </div>
    </div>
  )
}
