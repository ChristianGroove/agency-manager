"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  UniversalCatalogItem,
  StorefrontThemeConfig,
  DEFAULT_STOREFRONT_THEME_CONFIG,
  StorefrontActionPayload,
} from "@/types/catalog"
import { ProductDetailModal } from "../product-detail-modal"
import { StorefrontCartDrawer } from "./storefront-cart-drawer"
import { StorefrontHeroBanner } from "./storefront-hero-banner"
import { useStorefrontCart } from "@/hooks/use-storefront-cart"
import {
  StatusBadge,
  evaluateDynamicBadges,
  isOutOfStockGuard,
} from "../status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  MessageCircle,
  Star,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Quote,
  Sparkles,
  ShoppingBag,
  ShoppingCart,
  CreditCard,
  FileSpreadsheet,
  Calendar,
  ExternalLink,
  Layers,
  CheckCircle2,
  Clock,
  Instagram,
  Facebook,
  Globe,
  Twitter,
  Linkedin,
  Youtube,
  ArrowRight,
  Shield,
  HelpCircle,
  Box,
  FileCode2,
  Briefcase,
  Repeat,
  Image as ImageIcon,
  Share2,
  Package,
  MapPin,
  Building2,
  Zap,
  Tag,
  Key,
  CalendarRange,
  Home,
  Bed,
  ArrowUpDown,
  SlidersHorizontal,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/modules/infrastructure/utils/utils"
import { getPortalCatalog } from "@/modules/features/portal/services/portal-service"

export interface UniversalStorefrontLayoutProps {
  token?: string
  client?: any
  organization?: any
  settings?: any
  catalog?: UniversalCatalogItem[]
  themeConfig?: StorefrontThemeConfig
  currency?: string
}

function StorefrontTestimonialsSlider({
  testimonials,
  primaryColor,
  isDarkTheme,
}: {
  testimonials: NonNullable<StorefrontThemeConfig["testimonials"]>
  primaryColor?: string
  isDarkTheme?: boolean
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [visibleCards, setVisibleCards] = useState(3)
  const count = testimonials.length

  // Dynamically track visible cards per viewport (1 mobile, 2 tablet, 3 desktop)
  useEffect(() => {
    const updateVisible = () => {
      if (typeof window === "undefined") return
      if (window.innerWidth >= 1024) {
        setVisibleCards(3)
      } else if (window.innerWidth >= 640) {
        setVisibleCards(2)
      } else {
        setVisibleCards(1)
      }
    }
    updateVisible()
    window.addEventListener("resize", updateVisible)
    return () => window.removeEventListener("resize", updateVisible)
  }, [])

  const maxIndex = Math.max(0, count - visibleCards)
  const hasMultipleSlides = count > visibleCards

  // If resize reduced maxIndex below currentIndex, adjust safely
  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex)
    }
  }, [currentIndex, maxIndex])

  // Auto-play interval: rotates smoothly only if there are actually more items than visible slots
  useEffect(() => {
    if (!hasMultipleSlides || isPaused) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1))
    }, 4500)
    return () => clearInterval(timer)
  }, [hasMultipleSlides, maxIndex, isPaused])

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1))
  }

  if (!testimonials || count === 0) return null

  return (
    <section
      className={cn(
        "pt-12 border-t space-y-6 select-none",
        isDarkTheme ? "border-zinc-800" : "border-zinc-200"
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Centered Symmetrical Header with Title & Badge */}
      <div className="text-center space-y-1 max-w-lg mx-auto">
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] uppercase font-mono px-3 py-1 rounded-full border font-semibold tracking-wider transition-colors",
            isDarkTheme
              ? "bg-zinc-850 border-zinc-700 text-zinc-100 shadow-xs"
              : "bg-zinc-100 border-zinc-200 text-zinc-800"
          )}
        >
          Experiencias de Clientes
        </Badge>
        <h2 className={cn("text-2xl font-black tracking-tight", isDarkTheme ? "text-white" : "text-zinc-900")}>
          Lo que opinan de nosotros
        </h2>
      </div>

      {/* Horizontal Sliding Carousel Track */}
      <div className="overflow-hidden relative -mx-2 sm:-mx-3">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{
            transform: `translateX(-${currentIndex * (100 / visibleCards)}%)`,
          }}
        >
          {testimonials.map((testi, idx) => {
            const initials = testi.name
              ? testi.name
                  .split(" ")
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
              : "CL"

            return (
              <div
                key={testi.id || idx}
                className="w-full shrink-0 px-2 sm:px-3 sm:w-1/2 lg:w-1/3"
              >
                <div
                  className={cn(
                    "p-6 rounded-3xl border space-y-4 flex flex-col justify-between h-full relative overflow-hidden transition-all",
                    isDarkTheme
                      ? "bg-zinc-900/50 border-zinc-800 text-white hover:border-zinc-700"
                      : "bg-white border-zinc-200 text-zinc-900 shadow-xs hover:shadow-md"
                  )}
                >
                  <Quote className={cn(
                    "absolute top-4 right-4 h-8 w-8 pointer-events-none opacity-10",
                    isDarkTheme ? "text-white" : "text-zinc-900"
                  )} />

                  <div className="flex items-center gap-1 text-amber-400">
                    {Array.from({ length: testi.rating || 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  <p className={cn(
                    "text-xs italic leading-relaxed relative z-10 line-clamp-4",
                    isDarkTheme ? "text-zinc-300" : "text-zinc-600"
                  )}>
                    &ldquo;{testi.quote}&rdquo;
                  </p>

                  <div className={cn(
                    "pt-3 border-t flex items-center gap-3 text-xs",
                    isDarkTheme ? "border-zinc-800" : "border-zinc-100"
                  )}>
                    {testi.avatar_url ? (
                      <img
                        src={testi.avatar_url}
                        alt={testi.name}
                        className="h-9 w-9 rounded-full object-cover shrink-0 border border-zinc-200"
                      />
                    ) : (
                      <div
                        className="h-9 w-9 rounded-full flex items-center justify-center font-black text-xs text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: primaryColor || "#4F46E5" }}
                      >
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-bold truncate">{testi.name}</div>
                      <div className={cn("text-[11px] truncate", isDarkTheme ? "text-zinc-500" : "text-zinc-400")}>
                        {testi.role || "Cliente"} {testi.company ? `• ${testi.company}` : ""}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Symmetrical Centered Navigation Bar (Arrows + Dots) */}
      {hasMultipleSlides && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={handlePrev}
            className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center border transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-xs",
              isDarkTheme
                ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
                : "bg-white border-zinc-200 text-zinc-700 hover:text-zinc-950 hover:border-zinc-300"
            )}
            aria-label="Testimonio anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: maxIndex + 1 }).map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={() => setCurrentIndex(dotIdx)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300 cursor-pointer",
                  currentIndex === dotIdx
                    ? "w-6 shadow-xs"
                    : "w-2 opacity-30 hover:opacity-70",
                  isDarkTheme ? "bg-white" : "bg-zinc-900"
                )}
                style={currentIndex === dotIdx ? { backgroundColor: primaryColor } : {}}
                aria-label={`Ir a la posición ${dotIdx + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center border transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-xs",
              isDarkTheme
                ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
                : "bg-white border-zinc-200 text-zinc-700 hover:text-zinc-950 hover:border-zinc-300"
            )}
            aria-label="Testimonio siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </section>
  )
}

export function UniversalStorefrontLayout({
  token,
  client,
  organization,
  settings = {},
  catalog = [],
  themeConfig: initialThemeConfig,
  currency = "COP",
}: UniversalStorefrontLayoutProps) {
  const theme: StorefrontThemeConfig = initialThemeConfig || settings?.portal_theme_config || DEFAULT_STOREFRONT_THEME_CONFIG
  const orgName = organization?.name || settings?.agency_name || "Tienda Comercial"
  const orgPhone = settings?.agency_phone || settings?.phone || theme?.social_links?.whatsapp || ""

  // Storefront Cart Store
  const {
    items: cartItems,
    getTotalItems,
    getSubtotal,
    setDrawerOpen,
    addItem,
    setOrgId,
  } = useStorefrontCart()

  const totalCartItems = getTotalItems()
  const cartSubtotal = getSubtotal()

  // Sync Organization Context in Cart Store
  useEffect(() => {
    if (organization?.id) {
      setOrgId(organization.id)
    }
  }, [organization?.id, setOrgId])

  // Local state
  const [items, setItems] = useState<UniversalCatalogItem[]>(catalog || [])
  const [searchTerm, setSearchTerm] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null)

  // Interactive Product Detail Modal State & URL Deep Linking
  const [selectedItem, setSelectedItem] = useState<UniversalCatalogItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [initialVariantId, setInitialVariantId] = useState<string | null>(null)
  const [initialAddonIds, setInitialAddonIds] = useState<string[]>([])

  useEffect(() => {
    if (catalog && catalog.length > 0) {
      setItems(catalog)
    } else if (token) {
      getPortalCatalog(token)
        .then((data) => {
          if (data && data.length > 0) {
            setItems(data)
          }
        })
        .catch((err) => console.error("Error fallback loading catalog:", err))
    }
  }, [catalog, token])

  // URL Deep Link Listener (?item=...&variant=...)
  useEffect(() => {
    if (typeof window !== "undefined" && items.length > 0) {
      const searchParams = new URLSearchParams(window.location.search)
      const itemId = searchParams.get("item")
      const variantId = searchParams.get("variant")
      const addonsParam = searchParams.get("addons")

      if (itemId) {
        const found = items.find((i) => i.id === itemId)
        if (found) {
          setSelectedItem(found)
          setInitialVariantId(variantId || null)
          setInitialAddonIds(addonsParam ? addonsParam.split(",") : [])
          setIsModalOpen(true)
        }
      }
    }
  }, [items])

  const openDetail = (item: UniversalCatalogItem) => {
    setSelectedItem(item)
    setInitialVariantId(null)
    setInitialAddonIds([])
    setIsModalOpen(true)
  }

  const closeDetail = () => {
    setIsModalOpen(false)
    setSelectedItem(null)
    setInitialVariantId(null)
    setInitialAddonIds([])
  }

  // Multi-Industry Classification Detection
  const availableClassifications = useMemo(() => {
    const set = new Set<string>()
    items.forEach((i) => set.add(i.classification || "service"))
    return Array.from(set)
  }, [items])

  const [selectedClassification, setSelectedClassification] = useState<string>("all")

  // Real Estate Filter States
  const [reOperationFilter, setReOperationFilter] = useState<string>("all")
  const [reTypeFilter, setReTypeFilter] = useState<string>("all")
  const [reBedroomsFilter, setReBedroomsFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("default")

  // Categories list (Scoped to active classification if selected)
  const categories = useMemo(() => {
    const scopedItems = selectedClassification === "all"
      ? items
      : items.filter((i) => i.classification === selectedClassification)
    const raw = scopedItems.map((i) => i.category).filter(Boolean) as string[]
    return ["all", ...Array.from(new Set(raw))]
  }, [items, selectedClassification])

  // Industry Preset & Modular Widget Config
  const industryPreset = theme.industry_preset || "auto"
  const widgetConfig = theme.widget_config || {}

  const isCartEnabled = useMemo(() => {
    if (widgetConfig.show_cart_drawer === false) return false
    if (industryPreset === "real_estate") return false
    return true
  }, [widgetConfig.show_cart_drawer, industryPreset])

  const showIndustrySwitcher = useMemo(() => {
    if (industryPreset === "hybrid") return availableClassifications.length > 1
    if (industryPreset === "auto") return availableClassifications.length > 1
    return false
  }, [industryPreset, availableClassifications])

  // Determines whether the user is currently viewing Real Estate listings
  const isRealEstateContext = useMemo(() => {
    // If widget explicitly disabled by admin, return false
    if (widgetConfig.show_real_estate_filters === false) return false

    // Explicit Preset enforcement
    if (industryPreset === "real_estate") return true
    if (industryPreset === "physical_retail" || industryPreset === "professional_services" || industryPreset === "digital_software") {
      return false
    }

    // Auto / Hybrid detection
    if (selectedClassification === "real_estate") return true
    if (activeCategory !== "all") {
      const itemsInCat = items.filter((i) => i.category === activeCategory)
      return itemsInCat.length > 0 && itemsInCat.every((i) => i.classification === "real_estate")
    }
    return items.length > 0 && items.every((i) => i.classification === "real_estate")
  }, [widgetConfig.show_real_estate_filters, industryPreset, selectedClassification, activeCategory, items])

  // Dynamic Industry-Adaptive Search Placeholder
  const searchPlaceholder = useMemo(() => {
    if (isRealEstateContext || selectedClassification === "real_estate" || industryPreset === "real_estate") {
      return "Buscar inmuebles por sector, barrio, ciudad o tipo..."
    }
    if (industryPreset === "physical_retail" || selectedClassification === "physical") {
      return "Buscar productos por nombre, referencia o SKU..."
    }
    if (industryPreset === "professional_services" || selectedClassification === "service") {
      return "Buscar servicios, asesorías o soluciones..."
    }
    if (industryPreset === "digital_software" || selectedClassification === "digital") {
      return "Buscar productos digitales, licencias o recursos..."
    }
    return "Buscar en el catálogo..."
  }, [isRealEstateContext, selectedClassification, industryPreset])

  // Filtered items (Strict classification isolation)
  const filteredItems = useMemo(() => {
    let result = items.filter((item) => {
      // 1. Classification Scope Filter
      if (selectedClassification !== "all" && item.classification !== selectedClassification) {
        return false
      }

      // 2. Search Text (Universal multi-field match)
      const term = searchTerm.toLowerCase().trim()
      let matchesSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term) ||
        item.category?.toLowerCase().includes(term) ||
        (item.sku && item.sku.toLowerCase().includes(term))

      // Also search Real Estate specific metadata when available
      if (!matchesSearch && (item.classification === "real_estate" || item.real_estate_details || item.classification_metadata?.real_estate)) {
        const re = item.real_estate_details || item.classification_metadata?.real_estate || {}
        if (
          (re.neighborhood && re.neighborhood.toLowerCase().includes(term)) ||
          (re.city && re.city.toLowerCase().includes(term)) ||
          (re.address && re.address.toLowerCase().includes(term)) ||
          (re.property_type && re.property_type.toLowerCase().includes(term)) ||
          (Array.isArray(re.common_areas) && re.common_areas.some((a: string) => a.toLowerCase().includes(term)))
        ) {
          matchesSearch = true
        }
      }

      // 3. Category
      const matchesCat = activeCategory === "all" || item.category === activeCategory

      if (!matchesSearch || !matchesCat) return false

      // 4. Real Estate Specific Filters (ONLY apply when in Real Estate Context)
      if (isRealEstateContext && item.classification === "real_estate") {
        const re = item.real_estate_details || item.classification_metadata?.real_estate || {}
        
        if (reOperationFilter !== "all") {
          const op = re.operation || re.operation_type || (Number(item.base_price || 0) > 50000000 ? "sale" : "rent")
          if (op !== reOperationFilter) return false
        }

        if (reTypeFilter !== "all") {
          const type = re.property_type || "apartment"
          if (type !== reTypeFilter) return false
        }

        if (reBedroomsFilter !== "all") {
          const minBeds = Number(reBedroomsFilter)
          const itemBeds = Number(re.bedrooms) || 0
          if (itemBeds < minBeds) return false
        }
      }

      return true
    })

    // 5. Sorting
    if (sortBy === "price_asc") {
      result = [...result].sort((a, b) => (a.base_price || 0) - (b.base_price || 0))
    } else if (sortBy === "price_desc") {
      result = [...result].sort((a, b) => (b.base_price || 0) - (a.base_price || 0))
    } else if (sortBy === "area_desc") {
      result = [...result].sort((a, b) => {
        const areaA = a.classification === "real_estate" ? (a.real_estate_details || a.classification_metadata?.real_estate)?.area_total_m2 || 0 : 0
        const areaB = b.classification === "real_estate" ? (b.real_estate_details || b.classification_metadata?.real_estate)?.area_total_m2 || 0 : 0
        return areaB - areaA
      })
    }

    return result
  }, [items, selectedClassification, searchTerm, activeCategory, isRealEstateContext, reOperationFilter, reTypeFilter, reBedroomsFilter, sortBy])

  const formatPrice = (price?: number) => {
    if (!price || price === 0) return "Consultar precio"
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: currency || "COP",
      maximumFractionDigits: 0,
    }).format(price)
  }

  const handleWhatsAppQuickContact = (item?: UniversalCatalogItem) => {
    const cleanPhone = orgPhone.replace(/\D/g, "")
    const targetPhone = cleanPhone || "573000000000"
    let text = `Hola ${orgName}, me gustaría conocer más información sobre sus servicios y catálogo.`
    if (item) {
      if (item.classification === "real_estate" || item.real_estate_details) {
        const re = item.real_estate_details || item.classification_metadata?.real_estate || {}
        const op = re.operation_type === "rent" ? "arriendo" : re.operation_type === "temporary_rent" ? "arriendo temporal" : "venta"
        const location = re.neighborhood ? `${re.neighborhood}, ${re.city || ""}` : re.city || ""
        const area = re.area_total_m2 ? `${re.area_total_m2} m²` : ""
        text = `Hola ${orgName}, estoy interesado en el inmueble en *${op}*: *${item.name}* ${location ? `en ${location}` : ""} ${area ? `(${area})` : ""} (Precio: ${formatPrice(item.base_price)}). ¿Podrían brindarme información y agendar una visita?`
      } else {
        text = `Hola ${orgName}, estoy interesado en: *${item.name}* (Precio: ${formatPrice(item.base_price)}). ¿Podrían brindarme más información?`
      }
    }
    const url = `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`
    window.open(url, "_blank")
  }

  const hero = theme.hero || {
    enabled: true,
    title: "Descubre Nuestras Soluciones",
    subtitle: "Calidad superior, innovación y servicio personalizado.",
    cta_text: "Explorar Catálogo",
    cta_url: "#catalog",
    bg_gradient: "from-indigo-900 via-slate-900 to-black",
    badge_text: "Catálogo Oficial",
  }

  const themeKey = theme.theme || "modern"
  const isNeoBrutalist = themeKey === "neo_brutalist"
  const isCyberGlass = themeKey === "cyber_glass_3d" || themeKey === "modern_glass"
  const isEditorial = themeKey === "editorial"
  const isGourmet = themeKey === "gourmet_elegance"
  const isDarkLuxe = themeKey === "dark_luxe"
  const isMinimal = themeKey === "minimal"
  const isSwiss = themeKey === "swiss"
  const isVibrant = themeKey === "vibrant"
  const isDarkTheme =
    isDarkLuxe ||
    isCyberGlass ||
    theme.color_mode === "dark" ||
    (typeof (theme as any).dark_mode === "boolean" ? (theme as any).dark_mode : false)
  const navStyle = theme.navigation_style || "pills"
  const cardLayout = theme.card_layout || "grid"

  // Dynamic Logo Selection based on Color Mode (Dark vs Light)
  const darkLogo =
    (organization as any)?.logos?.dark ||
    settings?.main_logo_url ||
    settings?.portal_logo_url ||
    settings?.agency_logo_url ||
    null

  const lightLogo =
    (organization as any)?.logos?.light ||
    settings?.main_logo_light_url ||
    settings?.portal_logo_url ||
    settings?.agency_logo_url ||
    settings?.main_logo_url ||
    null

  const orgLogo = isDarkTheme ? (darkLogo || lightLogo) : (lightLogo || darkLogo)

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col transition-colors selection:bg-brand-pink/20 selection:text-brand-pink relative",
        isEditorial ? "font-serif" : isSwiss ? "font-mono" : "font-sans",
        isDarkTheme ? "bg-zinc-950 text-white" : isGourmet ? "bg-amber-50/20 text-stone-900" : "bg-zinc-50 text-zinc-900"
      )}
      style={{
        // @ts-ignore
        "--brand-primary": theme.primary_color || "#4F46E5",
        "--brand-secondary": theme.secondary_color || "#EC4899",
        "--brand-accent": theme.accent_color || "#10B981",
      }}
    >
      {/* 1. TOP NAVIGATION HEADER */}
      <header
        className={cn(
          "sticky top-0 z-40 backdrop-blur-xl border-b transition-all",
          isDarkTheme
            ? "bg-zinc-950/85 border-zinc-800/80"
            : "bg-white/85 border-zinc-200/80"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Logo / Brand */}
          <div className="flex items-center">
            {orgLogo ? (
              <img
                src={orgLogo}
                alt={orgName}
                className="h-10 max-w-[200px] object-contain"
              />
            ) : (
              <div
                className="h-10 px-4 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-md shadow-brand-primary/20"
                style={{ backgroundColor: theme.primary_color }}
              >
                {orgName}
              </div>
            )}
          </div>

          {/* Quick Search on Desktop */}
          {widgetConfig.show_search_bar !== false && theme.enable_search !== false && (
            <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={cn(
                    "pl-10 h-10 text-xs rounded-full border shadow-inner",
                    isDarkTheme
                      ? "bg-zinc-900/90 border-zinc-800 focus:border-zinc-600"
                      : "bg-zinc-100/80 border-zinc-200 focus:border-zinc-300"
                  )}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Header Actions: Cart Pill & WhatsApp Contact */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Header Cart Pill Button */}
            {isCartEnabled && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setDrawerOpen(true)}
                className={cn(
                  "rounded-full h-10 px-3 sm:px-4 text-xs font-bold gap-2 relative border shadow-sm transition-transform hover:scale-105",
                  isDarkTheme
                    ? "bg-zinc-900/90 border-zinc-800 text-white hover:bg-zinc-800"
                    : "bg-white border-zinc-200 text-zinc-900 hover:bg-zinc-50"
                )}
                aria-label="Abrir carrito de compras"
              >
                <div className="relative">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  {totalCartItems > 0 && (
                    <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center animate-in zoom-in">
                      {totalCartItems}
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline">
                  {totalCartItems > 0 ? formatPrice(cartSubtotal) : "Carrito"}
                </span>
              </Button>
            )}

            {/* Contact / WhatsApp Header Action */}
            <Button
              type="button"
              onClick={() => handleWhatsAppQuickContact()}
              className="rounded-full h-10 px-4 text-xs font-bold gap-2 text-white shadow-md transition-transform hover:scale-105"
              style={{ backgroundColor: theme.primary_color }}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Contactar Asesor</span>
              <span className="sm:hidden">WhatsApp</span>
            </Button>
          </div>
        </div>
      </header>

      {/* 2. HERO BANNER SECTION */}
      {hero.enabled && (
        <StorefrontHeroBanner
          hero={hero}
          primaryColor={theme.primary_color}
          secondaryColor={theme.secondary_color}
          onWhatsAppClick={() => handleWhatsAppQuickContact()}
          isDarkTheme={isDarkTheme}
        />
      )}

      {/* 3. CATALOG & SHOWCASE MAIN CONTAINER */}
      <main id="catalog" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Mobile Search */}
        {widgetConfig.show_search_bar !== false && theme.enable_search !== false && (
          <div className="md:hidden">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  "pl-10 h-10 text-xs rounded-2xl border shadow-inner",
                  isDarkTheme
                    ? "bg-zinc-900 border-zinc-800"
                    : "bg-white border-zinc-200"
                )}
              />
            </div>
          </div>
        )}

        {/* Multi-Industry Classification Switcher (Only visible when store has multiple catalog types and hybrid/auto mode) */}
        {showIndustrySwitcher && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none mb-3">
            <button
              type="button"
              onClick={() => {
                setSelectedClassification("all")
                setActiveCategory("all")
              }}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border",
                selectedClassification === "all"
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs border-transparent font-black"
                  : isDarkTheme
                  ? "bg-zinc-900/90 text-zinc-400 hover:text-white border-zinc-800"
                  : "bg-white text-zinc-600 hover:bg-zinc-100 border-zinc-200"
              )}
            >
              <Globe className="h-3.5 w-3.5 text-brand-pink" />
              <span>Todos ({items.length})</span>
            </button>

            {availableClassifications.includes("physical") && (
              <button
                type="button"
                onClick={() => {
                  setSelectedClassification("physical")
                  setActiveCategory("all")
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border",
                  selectedClassification === "physical"
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs border-transparent font-black"
                    : isDarkTheme
                    ? "bg-zinc-900/90 text-zinc-400 hover:text-white border-zinc-800"
                    : "bg-white text-zinc-600 hover:bg-zinc-100 border-zinc-200"
                )}
              >
                <Package className="h-3.5 w-3.5 text-blue-500" />
                <span>Productos ({items.filter(i => i.classification === "physical").length})</span>
              </button>
            )}

            {availableClassifications.includes("real_estate") && (
              <button
                type="button"
                onClick={() => {
                  setSelectedClassification("real_estate")
                  setActiveCategory("all")
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border",
                  selectedClassification === "real_estate"
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs border-transparent font-black"
                    : isDarkTheme
                    ? "bg-zinc-900/90 text-zinc-400 hover:text-white border-zinc-800"
                    : "bg-white text-zinc-600 hover:bg-zinc-100 border-zinc-200"
                )}
              >
                <Building2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Inmuebles ({items.filter(i => i.classification === "real_estate").length})</span>
              </button>
            )}

            {availableClassifications.includes("service") && (
              <button
                type="button"
                onClick={() => {
                  setSelectedClassification("service")
                  setActiveCategory("all")
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border",
                  selectedClassification === "service"
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs border-transparent font-black"
                    : isDarkTheme
                    ? "bg-zinc-900/90 text-zinc-400 hover:text-white border-zinc-800"
                    : "bg-white text-zinc-600 hover:bg-zinc-100 border-zinc-200"
                )}
              >
                <Briefcase className="h-3.5 w-3.5 text-purple-500" />
                <span>Servicios ({items.filter(i => i.classification === "service").length})</span>
              </button>
            )}

            {availableClassifications.includes("digital") && (
              <button
                type="button"
                onClick={() => {
                  setSelectedClassification("digital")
                  setActiveCategory("all")
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border",
                  selectedClassification === "digital"
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs border-transparent font-black"
                    : isDarkTheme
                    ? "bg-zinc-900/90 text-zinc-400 hover:text-white border-zinc-800"
                    : "bg-white text-zinc-600 hover:bg-zinc-100 border-zinc-200"
                )}
              >
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span>Digital ({items.filter(i => i.classification === "digital").length})</span>
              </button>
            )}

            {availableClassifications.includes("subscription") && (
              <button
                type="button"
                onClick={() => {
                  setSelectedClassification("subscription")
                  setActiveCategory("all")
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border",
                  selectedClassification === "subscription"
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs border-transparent font-black"
                    : isDarkTheme
                    ? "bg-zinc-900/90 text-zinc-400 hover:text-white border-zinc-800"
                    : "bg-white text-zinc-600 hover:bg-zinc-100 border-zinc-200"
                )}
              >
                <Layers className="h-3.5 w-3.5 text-indigo-500" />
                <span>Suscripciones ({items.filter(i => i.classification === "subscription").length})</span>
              </button>
            )}
          </div>
        )}

        {/* Category Navigation System with Multi-Style Support (Hidden in Real Estate Mode to avoid redundancy) */}
        {widgetConfig.show_category_nav !== false && !isRealEstateContext && categories.length > 1 && (
          <div className="pt-1">
              {/* 1. TABS STYLE */}
              {navStyle === "tabs" && (
                <div className={cn(
                  "inline-flex p-1.5 rounded-2xl border max-w-full overflow-x-auto scrollbar-none shadow-xs",
                  isDarkTheme ? "bg-zinc-900/90 border-zinc-800" : "bg-zinc-100 border-zinc-200"
                )}>
                  {categories.map((cat) => {
                    const count = cat === "all" ? items.length : items.filter((i) => i.category === cat).length
                    const isSelected = activeCategory === cat
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveCategory(cat)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shrink-0",
                          isSelected
                            ? isDarkTheme ? "bg-zinc-800 text-white shadow-xs font-black" : "bg-white text-zinc-950 shadow-xs font-black"
                            : isDarkTheme ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-zinc-950"
                        )}
                      >
                        <span style={isSelected ? { color: theme.primary_color } : {}}>
                          {cat === "all" ? "Todas las Categorías" : cat}
                        </span>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold",
                          isDarkTheme ? "bg-zinc-700/60 text-zinc-300" : "bg-zinc-200/80 text-zinc-700"
                        )}>
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* 2. UNDERLINE TABS STYLE */}
              {navStyle === "underline_tabs" && (
                <div className={cn(
                  "flex items-center gap-6 border-b overflow-x-auto pb-0 scrollbar-none",
                  isDarkTheme ? "border-zinc-800" : "border-zinc-200"
                )}>
                  {categories.map((cat) => {
                    const count = cat === "all" ? items.length : items.filter((i) => i.category === cat).length
                    const isSelected = activeCategory === cat
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveCategory(cat)}
                        className={cn(
                          "pb-3 text-xs font-bold tracking-tight whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer relative shrink-0",
                          isSelected
                            ? isDarkTheme ? "text-white font-extrabold" : "text-zinc-950 font-extrabold"
                            : isDarkTheme ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-500 hover:text-zinc-800"
                        )}
                      >
                        <span style={isSelected ? { color: theme.primary_color } : {}}>
                          {cat === "all" ? "Todas las Categorías" : cat}
                        </span>
                        <span className={cn("text-[10px] font-mono", isDarkTheme ? "text-zinc-500" : "text-zinc-400")}>({count})</span>
                        {isSelected && (
                          <span
                            className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                            style={{ backgroundColor: theme.primary_color }}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* 3. GLASS CARDS STYLE */}
              {navStyle === "glass_cards" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {categories.map((cat) => {
                    const count = cat === "all" ? items.length : items.filter((i) => i.category === cat).length
                    const isSelected = activeCategory === cat
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveCategory(cat)}
                        className={cn(
                          "p-3.5 rounded-2xl border text-left transition-all backdrop-blur-xl flex flex-col justify-between cursor-pointer",
                          isSelected
                            ? "border-transparent text-white shadow-lg scale-[1.02] font-bold"
                            : isDarkTheme
                            ? "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 shadow-xs"
                            : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 shadow-xs"
                        )}
                        style={isSelected ? { backgroundColor: theme.primary_color } : {}}
                      >
                        <span className="text-[10px] uppercase font-mono opacity-80">{count} {count === 1 ? 'ítem' : 'ítems'}</span>
                        <span className="text-xs font-black truncate mt-1">{cat === "all" ? "Todas" : cat}</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* 4. FLOATING DOCK STYLE */}
              {navStyle === "floating_dock" && (
                <div className="flex justify-center w-full">
                  <div className={cn(
                    "inline-flex items-center gap-1.5 p-2 rounded-full backdrop-blur-2xl border shadow-xl overflow-x-auto max-w-full",
                    isDarkTheme ? "bg-zinc-900/90 border-zinc-800" : "bg-white/90 border-zinc-200"
                  )}>
                    {categories.map((cat) => {
                      const count = cat === "all" ? items.length : items.filter((i) => i.category === cat).length
                      const isSelected = activeCategory === cat
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setActiveCategory(cat)}
                          className={cn(
                            "px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0",
                            isSelected
                              ? "bg-zinc-900 text-white shadow-md font-black"
                              : isDarkTheme ? "text-zinc-400 hover:text-white" : "text-zinc-600 hover:text-zinc-900"
                          )}
                          style={isSelected ? { backgroundColor: theme.primary_color } : {}}
                        >
                          <span>{cat === "all" ? "Todas" : cat}</span>
                          <span className="text-[10px] opacity-70">({count})</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 5. PILLS (DEFAULT) */}
              {navStyle === "pills" && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {categories.map((cat) => {
                    const count = cat === "all" ? items.length : items.filter((i) => i.category === cat).length
                    const isSelected = activeCategory === cat
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveCategory(cat)}
                        className={cn(
                          "px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shrink-0",
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-md font-black scale-[1.02]"
                            : isDarkTheme
                            ? "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800"
                            : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200/80 border-transparent"
                        )}
                        style={isSelected ? { backgroundColor: theme.primary_color } : {}}
                      >
                        <span>{cat === "all" ? "Todas las Categorías" : cat}</span>
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                            isSelected
                              ? "bg-black/20 text-white"
                              : isDarkTheme ? "bg-zinc-800 text-zinc-400" : "bg-zinc-200 text-zinc-600"
                          )}
                        >
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        {/* Real Estate PropTech Faceted Filter Strip (ONLY rendered in Real Estate Context) */}
        {isRealEstateContext && (
          <div className={cn(
            "p-3.5 rounded-3xl border flex flex-wrap items-center justify-between gap-3.5 text-xs shadow-sm backdrop-blur-md transition-all",
            isDarkTheme ? "bg-zinc-900/80 border-zinc-800 text-white" : "bg-white/90 border-zinc-200 text-zinc-900"
          )}>
            {/* Operation Type Quick Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-[11px] uppercase tracking-wider text-zinc-400 mr-1 flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5" style={{ color: theme.primary_color || "#10b981" }} />
                Filtrar por:
              </span>
              {[
                { id: "all", label: "Todas", icon: null },
                { id: "sale", label: "En Venta", icon: Tag },
                { id: "rent", label: "En Arriendo", icon: Key },
                { id: "temporary_rent", label: "Arriendo Temporal", icon: CalendarRange },
              ].map((op) => {
                const isSelected = reOperationFilter === op.id
                const IconComponent = op.icon
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setReOperationFilter(op.id)}
                    style={isSelected ? { color: theme.primary_color || "#10b981" } : undefined}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl font-semibold transition-all cursor-pointer text-xs flex items-center gap-1.5 border",
                      isSelected
                        ? isDarkTheme
                          ? "bg-zinc-800/90 border-zinc-700/60 shadow-xs"
                          : "bg-zinc-100 border-zinc-200/80 shadow-xs"
                        : isDarkTheme
                        ? "bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                        : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                    )}
                  >
                    {IconComponent && <IconComponent className="h-3 w-3 shrink-0" />}
                    <span>{op.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Secondary Filters: Property Type, Bedrooms & Sorting */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Property Type Dropdown */}
              <div className="relative flex items-center">
                <select
                  value={reTypeFilter}
                  onChange={(e) => setReTypeFilter(e.target.value)}
                  style={reTypeFilter !== "all" ? { color: theme.primary_color || "#10b981" } : undefined}
                  className={cn(
                    "h-8 pl-3 pr-8 rounded-xl font-medium border text-xs outline-none cursor-pointer appearance-none transition-colors",
                    isDarkTheme
                      ? reTypeFilter !== "all"
                        ? "bg-zinc-800/90 border-zinc-700"
                        : "bg-zinc-800/70 border-zinc-700/60 text-zinc-400 focus:border-zinc-500"
                      : reTypeFilter !== "all"
                      ? "bg-zinc-100 border-zinc-300"
                      : "bg-white border-zinc-200 text-zinc-600 focus:border-zinc-400"
                  )}
                >
                  <option value="all">Tipo de Inmueble</option>
                  <option value="apartment">Apartamentos</option>
                  <option value="house">Casas</option>
                  <option value="studio">Apartaestudios</option>
                  <option value="office">Oficinas</option>
                  <option value="commercial">Locales Comerciales</option>
                  <option value="country_house">Fincas & Campestres</option>
                  <option value="warehouse">Bodegas</option>
                  <option value="land">Lotes & Terrenos</option>
                </select>
                <ChevronDown
                  className={cn(
                    "absolute right-2.5 h-3.5 w-3.5 pointer-events-none transition-colors",
                    reTypeFilter !== "all" ? "" : "text-zinc-400"
                  )}
                  style={reTypeFilter !== "all" ? { color: theme.primary_color || "#10b981" } : undefined}
                />
              </div>

              {/* Bedrooms Dropdown */}
              <div className="relative flex items-center">
                <select
                  value={reBedroomsFilter}
                  onChange={(e) => setReBedroomsFilter(e.target.value)}
                  style={reBedroomsFilter !== "all" ? { color: theme.primary_color || "#10b981" } : undefined}
                  className={cn(
                    "h-8 pl-3 pr-8 rounded-xl font-medium border text-xs outline-none cursor-pointer appearance-none transition-colors",
                    isDarkTheme
                      ? reBedroomsFilter !== "all"
                        ? "bg-zinc-800/90 border-zinc-700"
                        : "bg-zinc-800/70 border-zinc-700/60 text-zinc-400 focus:border-zinc-500"
                      : reBedroomsFilter !== "all"
                      ? "bg-zinc-100 border-zinc-300"
                      : "bg-white border-zinc-200 text-zinc-600 focus:border-zinc-400"
                  )}
                >
                  <option value="all">Habitaciones</option>
                  <option value="1">1+ Habitación</option>
                  <option value="2">2+ Habitaciones</option>
                  <option value="3">3+ Habitaciones</option>
                  <option value="4">4+ Habitaciones</option>
                </select>
                <ChevronDown
                  className={cn(
                    "absolute right-2.5 h-3.5 w-3.5 pointer-events-none transition-colors",
                    reBedroomsFilter !== "all" ? "" : "text-zinc-400"
                  )}
                  style={reBedroomsFilter !== "all" ? { color: theme.primary_color || "#10b981" } : undefined}
                />
              </div>

              {/* Sort By Dropdown */}
              <div className="relative flex items-center">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={sortBy !== "default" ? { color: theme.primary_color || "#10b981" } : undefined}
                  className={cn(
                    "h-8 pl-3 pr-8 rounded-xl font-medium border text-xs outline-none cursor-pointer appearance-none transition-colors",
                    isDarkTheme
                      ? sortBy !== "default"
                        ? "bg-zinc-800/90 border-zinc-700"
                        : "bg-zinc-800/70 border-zinc-700/60 text-zinc-400 focus:border-zinc-500"
                      : sortBy !== "default"
                      ? "bg-zinc-100 border-zinc-300"
                      : "bg-white border-zinc-200 text-zinc-600 focus:border-zinc-400"
                  )}
                >
                  <option value="default">Ordenar: Destacados</option>
                  <option value="price_asc">Precio: Menor a Mayor</option>
                  <option value="price_desc">Precio: Mayor a Menor</option>
                  <option value="area_desc">Área: Mayor a Menor (m²)</option>
                </select>
                <ChevronDown
                  className={cn(
                    "absolute right-2.5 h-3.5 w-3.5 pointer-events-none transition-colors",
                    sortBy !== "default" ? "" : "text-zinc-400"
                  )}
                  style={sortBy !== "default" ? { color: theme.primary_color || "#10b981" } : undefined}
                />
              </div>

              {/* Reset button if active */}
              {(reOperationFilter !== "all" || reTypeFilter !== "all" || reBedroomsFilter !== "all" || sortBy !== "default") && (
                <button
                  type="button"
                  onClick={() => {
                    setReOperationFilter("all")
                    setReTypeFilter("all")
                    setReBedroomsFilter("all")
                    setSortBy("default")
                  }}
                  className="h-8 px-2.5 rounded-xl text-[11px] font-bold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        )}

        {/* 4. SHOWCASE GRID / LIST / MASONRY WITH THEME STYLING */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className={cn(
              "h-16 w-16 mx-auto rounded-3xl flex items-center justify-center",
              isDarkTheme ? "bg-zinc-900 text-zinc-500" : "bg-zinc-100 text-zinc-400"
            )}>
              <Search className="h-8 w-8" />
            </div>
            <h3 className={cn("text-lg font-bold", isDarkTheme ? "text-white" : "text-zinc-900")}>No se encontraron ítems</h3>
            <p className={cn("text-xs max-w-sm mx-auto", isDarkTheme ? "text-zinc-400" : "text-zinc-500")}>
              Intenta cambiar los términos de búsqueda o selecciona otra categoría.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("")
                setActiveCategory("all")
              }}
              className="rounded-full text-xs"
            >
              Restablecer Filtros
            </Button>
          </div>
        ) : cardLayout === "list" ? (
          /* ========================================================================= */
          /* LIST LAYOUT (Horizontal Detailed Rows) */
          /* ========================================================================= */
          <div className="flex flex-col gap-4">
            {filteredItems.map((item) => {
              const gallery = item.gallery_images || (item.image_url ? [item.image_url] : [])
              const firstImg = gallery[0]
              const coverImg = typeof firstImg === "string" ? firstImg : (firstImg as any)?.url || item.image_url || "/placeholder-service.jpg"
              const photoCount = gallery.length
              const dynamicBadges = evaluateDynamicBadges(item)

              const isItemOutOfStock = isOutOfStockGuard(
                item.inventory_quantity ?? item.stock_quantity,
                item.track_inventory ?? item.track_stock,
                item.allow_backorders
              )

              return (
                <div
                  key={item.id}
                  className={cn(
                    "group flex flex-col sm:flex-row rounded-3xl border overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer",
                    isNeoBrutalist
                      ? "border-2 border-black rounded-none bg-white text-zinc-900 shadow-[4px_4px_0px_0px_#000000]"
                      : isCyberGlass
                      ? "border border-cyan-500/20 bg-zinc-950/70 backdrop-blur-2xl shadow-xl hover:border-cyan-400/40 rounded-3xl text-white"
                      : isEditorial
                      ? "border border-zinc-200 bg-white text-zinc-900 rounded-xl shadow-xs font-serif"
                      : isGourmet
                      ? "border border-amber-900/20 bg-amber-50/40 text-stone-900 rounded-2xl shadow-md"
                      : isSwiss
                      ? "border-2 border-zinc-900 bg-white text-zinc-900 rounded-sm shadow-xs font-mono"
                      : isDarkTheme
                      ? "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 text-white"
                      : "bg-white border-zinc-200/90 hover:border-zinc-300 text-zinc-900 shadow-xs"
                  )}
                  onClick={() => openDetail(item)}
                >
                  {/* Photo Container */}
                  <div className={cn(
                    "relative w-full sm:w-72 shrink-0 aspect-[16/10] sm:aspect-auto overflow-hidden",
                    isDarkTheme ? "bg-zinc-900" : "bg-zinc-100"
                  )}>
                    <img
                      src={coverImg}
                      alt={item.name}
                      className={cn(
                        "h-full w-full object-cover transition-transform duration-500 group-hover:scale-105",
                        isItemOutOfStock && "grayscale opacity-80"
                      )}
                      loading="lazy"
                    />

                    {photoCount > 1 && (
                      <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/15 text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                        <ImageIcon className="h-3 w-3" />
                        <span>+{photoCount} fotos</span>
                      </div>
                    )}

                    {/* Real Estate Operation Badge (En Venta / En Arriendo) */}
                    {item.classification === "real_estate" && (() => {
                      const re = item.real_estate_details || item.classification_metadata?.real_estate
                      const op = re?.operation || re?.operation_type || (Number(item.base_price || 0) > 50000000 ? "sale" : "rent")
                      const isRent = op === "rent"
                      const isTemp = op === "temporary_rent"
                      const opLabel = isRent ? "En Arriendo" : isTemp ? "Arriendo Temp." : "En Venta"
                      const OpIcon = isRent ? Key : isTemp ? CalendarRange : Tag
                      return (
                        <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/15 text-[11px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 z-10">
                          <OpIcon className="h-3 w-3 shrink-0" style={{ color: theme.primary_color || "#10b981" }} />
                          <span>{opLabel}</span>
                        </div>
                      )
                    })()}

                    {item.category && item.classification !== "real_estate" && (
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/15 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                        {item.category}
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={cn(
                          "font-extrabold text-base leading-snug group-hover:text-brand-pink transition-colors",
                          isDarkTheme ? "text-white" : "text-zinc-900"
                        )}>
                          {item.name}
                        </h3>
                        {item.classification !== "real_estate" && dynamicBadges.map((badgeStr, idx) => (
                          <StatusBadge key={idx} type={badgeStr} label={badgeStr} />
                        ))}
                      </div>

                      {/* Property Subtitle (Tipo & Ubicación) */}
                      {item.classification === "real_estate" && (() => {
                        const re = item.real_estate_details || item.classification_metadata?.real_estate
                        const propType = re?.property_type || "apartment"
                        const typeMap: Record<string, string> = {
                          apartment: "Apartamento",
                          house: "Casa",
                          studio: "Apartaestudio",
                          office: "Oficina",
                          commercial: "Local Comercial",
                          warehouse: "Bodega",
                          land: "Lote / Terreno",
                          country_house: "Finca / Casa Campestre",
                          medical_office: "Consultorio",
                          building: "Edificio",
                        }
                        const typeLabel = typeMap[propType] || "Inmueble"
                        const loc = re?.neighborhood ? `${re.neighborhood}, ${re.city || ""}` : (re?.city || "")
                        return (
                          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                            <span className="flex items-center gap-1 font-bold text-zinc-700 dark:text-zinc-300">
                              <Building2 className="h-3.5 w-3.5 text-brand-pink shrink-0" />
                              {typeLabel}
                            </span>
                            {loc && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                                  {loc}
                                </span>
                              </>
                            )}
                          </div>
                        )
                      })()}

                      {item.description && (
                        <p className={cn(
                          "text-xs line-clamp-3 leading-relaxed",
                          isDarkTheme ? "text-zinc-400" : "text-zinc-500"
                        )}>
                          {item.description}
                        </p>
                      )}

                      {/* Stock & Availability Pill & SKU */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {item.track_inventory ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            {isItemOutOfStock ? (
                              <span className="text-rose-600 flex items-center gap-1 font-bold">
                                <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                                Agotado
                              </span>
                            ) : Number(item.inventory_quantity ?? 0) <= (item.low_stock_threshold || 5) ? (
                              <span className="text-amber-600 flex items-center gap-1 font-bold animate-pulse">
                                <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                                ¡Solo quedan {item.inventory_quantity} unidades!
                              </span>
                            ) : (
                              <span className="text-emerald-600 flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                                {item.inventory_quantity} unidades disponibles
                              </span>
                            )}
                          </div>
                        ) : item.has_variants && item.variants && item.variants.length > 0 ? (
                          <div className={cn(
                            "flex items-center gap-1.5 text-xs font-semibold",
                            isDarkTheme ? "text-zinc-400" : "text-zinc-500"
                          )}>
                            <Package className="h-3.5 w-3.5 opacity-70 shrink-0" />
                            <span>{item.variants.length} opciones / variantes</span>
                          </div>
                        ) : null}

                        {item.sku && (
                          <span className={cn(
                            "text-[10px] font-mono px-2 py-0.5 rounded-md",
                            isDarkTheme ? "bg-zinc-800 text-zinc-400" : "bg-zinc-100 text-zinc-600"
                          )}>
                            SKU: {item.sku}
                          </span>
                        )}

                        {/* Real Estate Property Specs Pill */}
                        {item.classification === "real_estate" && (() => {
                          const re = item.real_estate_details || item.classification_metadata?.real_estate || {}
                          const pills: string[] = []
                          if (re.area_total_m2) pills.push(`${re.area_total_m2} m²`)
                          if (re.bedrooms) pills.push(`${re.bedrooms} Hab`)
                          if (re.bathrooms) pills.push(`${re.bathrooms} Baños`)
                          if (re.parking_cars || re.parking_motorcycles) {
                            const pType = re.parking_type === "covered" ? "Cubierto" : re.parking_type === "uncovered" ? "Intemperie" : ""
                            pills.push(`Parq: ${re.parking_cars || 0}${re.parking_motorcycles ? `+${re.parking_motorcycles}M` : ''}${pType ? ` (${pType})` : ''}`)
                          }
                          return pills.length > 0 ? (
                            <div className={cn(
                              "flex flex-wrap items-center gap-1.5 text-[11px] font-semibold",
                              isDarkTheme ? "text-zinc-300" : "text-zinc-700"
                            )}>
                              {pills.map((p, idx) => (
                                <span key={idx} className={cn(
                                  "px-2 py-0.5 rounded-md border",
                                  isDarkTheme ? "bg-zinc-800/80 border-zinc-700 text-zinc-300" : "bg-zinc-100 border-zinc-200 text-zinc-700"
                                )}>
                                  {p}
                                </span>
                              ))}
                            </div>
                          ) : null
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Price & Action Right Column */}
                  <div className={cn(
                    "p-5 sm:border-l border-t sm:border-t-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 sm:w-56 shrink-0",
                    isDarkTheme ? "bg-zinc-900/40 border-zinc-800" : "bg-zinc-50/50 border-zinc-100"
                  )}>
                    <div className="sm:text-right">
                      <span className={cn("text-[10px] uppercase font-bold block", isDarkTheme ? "text-zinc-500" : "text-zinc-400")}>
                        {item.classification === "real_estate"
                          ? (() => {
                              const re = item.real_estate_details || item.classification_metadata?.real_estate
                              const op = re?.operation || re?.operation_type || (Number(item.base_price || 0) > 50000000 ? "sale" : "rent")
                              return op === "rent" ? "Canon Mensual" : op === "temporary_rent" ? "Tarifa Temporal" : "Precio de Venta"
                            })()
                          : item.type === "recurring" ? "Inversión Recurrente" : "Precio"}
                      </span>
                      <span
                        className="text-xl font-black tracking-tight"
                        style={{ color: theme.primary_color }}
                      >
                        {formatPrice(item.base_price)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={isItemOutOfStock}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (isItemOutOfStock) return
                          const effectiveCta = item.cta_type || theme.primary_cta || "whatsapp"
                          if (effectiveCta === "cart" || effectiveCta === "add_to_cart") {
                            if ((item.variants && item.variants.length > 0) || (item.addon_groups && item.addon_groups.some(g => g.is_required))) {
                              openDetail(item)
                            } else {
                              addItem({
                                catalog_item_id: item.id,
                                itemId: item.id,
                                name: item.name,
                                category: item.category,
                                classification: item.classification,
                                thumbnail_url: coverImg,
                                base_price: item.base_price,
                                quantity: 1,
                                track_inventory: item.track_inventory ?? item.track_stock,
                                stock_quantity: item.inventory_quantity ?? item.stock_quantity,
                                allow_backorders: item.allow_backorders,
                                organization_id: organization?.id || item.organization_id,
                              })
                              toast.success(`¡${item.name} agregado al carrito!`)
                            }
                          } else if (effectiveCta === "whatsapp") {
                            handleWhatsAppQuickContact(item)
                          } else {
                            openDetail(item)
                          }
                        }}
                        className="rounded-xl text-xs font-bold h-9 px-4 text-white shadow-sm"
                        style={{ backgroundColor: !isItemOutOfStock ? theme.primary_color : undefined }}
                      >
                        {isItemOutOfStock ? "Agotado" : (item.cta_type === "whatsapp" || theme.primary_cta === "whatsapp" ? "Contactar" : item.cta_type === "quote" ? "Cotizar" : item.cta_type === "booking" ? "Agendar" : "Añadir")}
                      </Button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          openDetail(item)
                        }}
                        className={cn(
                          "rounded-xl h-9 w-9 flex items-center justify-center transition-all cursor-pointer border shrink-0",
                          isDarkTheme
                            ? "bg-zinc-800/80 border-zinc-700/80 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                            : "bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
                        )}
                        aria-label={`Ver detalles de ${item.name}`}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ========================================================================= */
          /* GRID & MASONRY LAYOUTS */
          /* ========================================================================= */
          <div
            className={cn(
              cardLayout === "masonry"
                ? "columns-1 sm:columns-2 lg:columns-3 gap-6 [column-fill:_balance]"
                : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            )}
          >
            {filteredItems.map((item) => {
              const gallery = item.gallery_images || (item.image_url ? [item.image_url] : [])
              const firstImg = gallery[0]
              const coverImg = typeof firstImg === "string" ? firstImg : (firstImg as any)?.url || item.image_url || "/placeholder-service.jpg"
              const photoCount = gallery.length
              const dynamicBadges = evaluateDynamicBadges(item)

              const isItemOutOfStock = isOutOfStockGuard(
                item.inventory_quantity ?? item.stock_quantity,
                item.track_inventory ?? item.track_stock,
                item.allow_backorders
              )

              return (
                <div
                  key={item.id}
                  className={cn(
                    "group flex flex-col rounded-3xl border overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer",
                    cardLayout === "masonry" && "break-inside-avoid mb-6",
                    isNeoBrutalist
                      ? "border-2 border-black rounded-none bg-white text-zinc-900 shadow-[4px_4px_0px_0px_#000000] hover:translate-x-[2px] hover:translate-y-[2px]"
                      : isCyberGlass
                      ? "border border-cyan-500/20 bg-zinc-950/70 backdrop-blur-2xl shadow-xl hover:border-cyan-400/40 rounded-3xl text-white"
                      : isEditorial
                      ? "border border-zinc-200 bg-white text-zinc-900 rounded-xl shadow-xs font-serif"
                      : isGourmet
                      ? "border border-amber-900/20 bg-amber-50/40 text-stone-900 rounded-2xl shadow-md"
                      : isSwiss
                      ? "border-2 border-zinc-900 bg-white text-zinc-900 rounded-sm shadow-xs font-mono"
                      : isVibrant
                      ? "border-2 border-transparent bg-white text-zinc-900 rounded-3xl shadow-md hover:scale-[1.02]"
                      : isDarkTheme
                      ? "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 text-white"
                      : "bg-white border-zinc-200/90 hover:border-zinc-300 text-zinc-900 shadow-xs"
                  )}
                  onClick={() => openDetail(item)}
                >
                  {/* Photo Container */}
                  <div className={cn(
                    "relative aspect-[4/3] w-full overflow-hidden",
                    isDarkTheme ? "bg-zinc-900" : "bg-zinc-100"
                  )}>
                    <img
                      src={coverImg}
                      alt={item.name}
                      className={cn(
                        "h-full w-full object-cover transition-transform duration-500 group-hover:scale-105",
                        isItemOutOfStock && "grayscale opacity-80"
                      )}
                      loading="lazy"
                    />

                    {/* Multi-photo badge */}
                    {photoCount > 1 && (
                      <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/15 text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                        <ImageIcon className="h-3 w-3" />
                        <span>+{photoCount} fotos</span>
                      </div>
                    )}

                    {/* Real Estate Operation Badge (En Venta / En Arriendo) */}
                    {item.classification === "real_estate" && (() => {
                      const re = item.real_estate_details || item.classification_metadata?.real_estate
                      const op = re?.operation || re?.operation_type || (Number(item.base_price || 0) > 50000000 ? "sale" : "rent")
                      const isRent = op === "rent"
                      const isTemp = op === "temporary_rent"
                      const opLabel = isRent ? "En Arriendo" : isTemp ? "Arriendo Temp." : "En Venta"
                      const OpIcon = isRent ? Key : isTemp ? CalendarRange : Tag
                      return (
                        <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/15 text-[11px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 z-10">
                          <OpIcon className="h-3 w-3 shrink-0" style={{ color: theme.primary_color || "#10b981" }} />
                          <span>{opLabel}</span>
                        </div>
                      )
                    })()}

                    {/* Category pill */}
                    {item.category && item.classification !== "real_estate" && (
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/15 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                        {item.category}
                      </div>
                    )}

                    {/* Dynamic Badges ("Destacado", "Novedad", "Agotado", "¡Últimas X unidades!") (Hidden for Real Estate) */}
                    {item.classification !== "real_estate" && dynamicBadges.length > 0 && (
                      <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                        {dynamicBadges.map((badgeStr, idx) => (
                          <StatusBadge key={idx} type={badgeStr} label={badgeStr} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className={cn(
                        "font-extrabold text-base leading-snug line-clamp-2 group-hover:text-brand-pink transition-colors",
                        isDarkTheme ? "text-white" : "text-zinc-900"
                      )}>
                        {item.name}
                      </h3>

                      {/* Property Subtitle (Tipo & Ubicación) */}
                      {item.classification === "real_estate" && (() => {
                        const re = item.real_estate_details || item.classification_metadata?.real_estate
                        const propType = re?.property_type || "apartment"
                        const typeMap: Record<string, string> = {
                          apartment: "Apartamento",
                          house: "Casa",
                          studio: "Apartaestudio",
                          office: "Oficina",
                          commercial: "Local Comercial",
                          warehouse: "Bodega",
                          land: "Lote / Terreno",
                          country_house: "Finca / Casa Campestre",
                          medical_office: "Consultorio",
                          building: "Edificio",
                        }
                        const typeLabel = typeMap[propType] || "Inmueble"
                        const loc = re?.neighborhood ? `${re.neighborhood}, ${re.city || ""}` : (re?.city || "")
                        return (
                          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                            <span className="flex items-center gap-1 font-bold text-zinc-700 dark:text-zinc-300">
                              <Building2 className="h-3.5 w-3.5 text-brand-pink shrink-0" />
                              {typeLabel}
                            </span>
                            {loc && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                                  {loc}
                                </span>
                              </>
                            )}
                          </div>
                        )
                      })()}

                      {item.description && (
                        <p className={cn(
                          "text-xs line-clamp-2 leading-relaxed",
                          isDarkTheme ? "text-zinc-400" : "text-zinc-500"
                        )}>
                          {item.description}
                        </p>
                      )}

                      {/* Stock & Availability Pill */}
                      {item.track_inventory ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold pt-0.5">
                          {isItemOutOfStock ? (
                            <span className="text-rose-600 flex items-center gap-1 font-bold">
                              <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                              Agotado
                            </span>
                          ) : Number(item.inventory_quantity ?? 0) <= (item.low_stock_threshold || 5) ? (
                            <span className="text-amber-600 flex items-center gap-1 font-bold animate-pulse">
                              <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                              ¡Solo quedan {item.inventory_quantity} unidades!
                            </span>
                          ) : (
                            <span className="text-emerald-600 flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                              {item.inventory_quantity} unidades disponibles
                            </span>
                          )}
                        </div>
                      ) : item.has_variants && item.variants && item.variants.length > 0 ? (
                        <div className={cn(
                          "flex items-center gap-1.5 text-xs font-semibold pt-0.5",
                          isDarkTheme ? "text-zinc-400" : "text-zinc-500"
                        )}>
                          <Package className="h-3.5 w-3.5 opacity-70 shrink-0" />
                          <span>{item.variants.length} opciones / variantes</span>
                        </div>
                      ) : null}

                      {/* Real Estate Property Specs Pill */}
                      {item.classification === "real_estate" && (() => {
                        const re = item.real_estate_details || item.classification_metadata?.real_estate || {}
                        const pills: string[] = []
                        if (re.area_total_m2) pills.push(`${re.area_total_m2} m²`)
                        if (re.bedrooms) pills.push(`${re.bedrooms} Hab`)
                        if (re.bathrooms) pills.push(`${re.bathrooms} Baños`)
                        if (re.parking_cars || re.parking_motorcycles) {
                          const pType = re.parking_type === "covered" ? "Cubierto" : re.parking_type === "uncovered" ? "Intemperie" : ""
                          pills.push(`Parq: ${re.parking_cars || 0}${re.parking_motorcycles ? `+${re.parking_motorcycles}M` : ''}${pType ? ` (${pType})` : ''}`)
                        }
                        return pills.length > 0 ? (
                          <div className={cn(
                            "flex flex-wrap items-center gap-1.5 text-[11px] font-semibold pt-1",
                            isDarkTheme ? "text-zinc-300" : "text-zinc-700"
                          )}>
                            {pills.map((p, idx) => (
                              <span key={idx} className={cn(
                                "px-2 py-0.5 rounded-md border",
                                isDarkTheme ? "bg-zinc-800/80 border-zinc-700 text-zinc-300" : "bg-zinc-100 border-zinc-200 text-zinc-700"
                              )}>
                                {p}
                              </span>
                            ))}
                          </div>
                        ) : null
                      })()}
                    </div>

                    {/* Price & Action Row */}
                    <div className={cn(
                      "pt-3 border-t flex items-center justify-between gap-2",
                      isDarkTheme ? "border-zinc-800" : "border-zinc-100"
                    )}>
                      <div>
                        <span className={cn("text-[10px] uppercase font-bold block", isDarkTheme ? "text-zinc-500" : "text-zinc-400")}>
                          {item.classification === "real_estate"
                            ? (() => {
                                const re = item.real_estate_details || item.classification_metadata?.real_estate
                                const op = re?.operation || re?.operation_type || (Number(item.base_price || 0) > 50000000 ? "sale" : "rent")
                                return op === "rent" ? "Canon Mensual" : op === "temporary_rent" ? "Tarifa Temporal" : "Precio de Venta"
                              })()
                            : item.type === "recurring" ? "Inversión Recurrente" : "Precio"}
                        </span>
                        <span
                          className="text-lg font-black tracking-tight"
                          style={{ color: theme.primary_color }}
                        >
                          {formatPrice(item.base_price)}
                        </span>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center gap-1.5">
                        {(() => {
                          const effectiveCta = item.cta_type || theme.primary_cta || "whatsapp"

                          const handleClick = (e: React.MouseEvent) => {
                            e.stopPropagation()
                            if (isItemOutOfStock) return

                            if (effectiveCta === "cart" || effectiveCta === "add_to_cart") {
                              if (
                                (item.variants && item.variants.length > 0) ||
                                (item.addon_groups && item.addon_groups.some((g) => g.is_required))
                              ) {
                                openDetail(item)
                              } else {
                                addItem({
                                  catalog_item_id: item.id,
                                  itemId: item.id,
                                  name: item.name,
                                  category: item.category,
                                  classification: item.classification,
                                  thumbnail_url: coverImg,
                                  base_price: item.base_price,
                                  quantity: 1,
                                  track_inventory: item.track_inventory ?? item.track_stock,
                                  stock_quantity: item.inventory_quantity ?? item.stock_quantity,
                                  allow_backorders: item.allow_backorders,
                                  organization_id: organization?.id || item.organization_id,
                                })
                                toast.success(`¡${item.name} agregado al carrito!`)
                              }
                            } else if (effectiveCta === "whatsapp") {
                              handleWhatsAppQuickContact(item)
                            } else {
                              openDetail(item)
                            }
                          }

                          let icon = <ShoppingCart className="h-3.5 w-3.5" />
                          let label = isItemOutOfStock ? "Agotado" : "Añadir"

                          if (effectiveCta === "whatsapp") {
                            icon = <MessageCircle className="h-3.5 w-3.5" />
                            label = isItemOutOfStock ? "Agotado" : "Contactar"
                          } else if (effectiveCta === "buy") {
                            icon = <CreditCard className="h-3.5 w-3.5" />
                            label = isItemOutOfStock ? "Agotado" : "Comprar"
                          } else if (effectiveCta === "quote") {
                            icon = <FileSpreadsheet className="h-3.5 w-3.5" />
                            label = isItemOutOfStock ? "Agotado" : "Cotizar"
                          } else if (effectiveCta === "booking" || effectiveCta === "appointment") {
                            icon = <Calendar className="h-3.5 w-3.5" />
                            label = isItemOutOfStock ? "Agotado" : "Agendar"
                          }

                          return (
                            <Button
                              type="button"
                              size="sm"
                              disabled={isItemOutOfStock}
                              onClick={handleClick}
                              className={cn(
                                "rounded-xl text-xs font-bold h-9 px-3 gap-1.5 shadow-sm text-white",
                                isItemOutOfStock && "opacity-60 cursor-not-allowed text-zinc-400"
                              )}
                              style={{
                                backgroundColor: !isItemOutOfStock
                                  ? theme.primary_color
                                  : undefined,
                              }}
                            >
                              {icon}
                              <span>{label}</span>
                            </Button>
                          )
                        })()}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            openDetail(item)
                          }}
                          className={cn(
                            "rounded-xl h-9 w-9 flex items-center justify-center transition-all cursor-pointer border shrink-0",
                            isDarkTheme
                              ? "bg-zinc-800/80 border-zinc-700/80 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                              : "bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
                          )}
                          aria-label={`Ver detalles de ${item.name}`}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 5. TESTIMONIALS ANIMATED SLIDER SECTION */}
        {theme.testimonials && theme.testimonials.length > 0 && (
          <StorefrontTestimonialsSlider
            testimonials={theme.testimonials}
            primaryColor={theme.primary_color}
            isDarkTheme={isDarkTheme}
          />
        )}

        {/* 6. FAQ ACCORDION SECTION */}
        {theme.faq && theme.faq.length > 0 && (
          <section className={cn(
            "pt-12 border-t space-y-6",
            isDarkTheme ? "border-zinc-800" : "border-zinc-200"
          )}>
            <div className="text-center space-y-1 max-w-lg mx-auto">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] uppercase font-mono px-3 py-1 rounded-full border font-semibold tracking-wider transition-colors",
                  isDarkTheme
                    ? "bg-zinc-850 border-zinc-700 text-zinc-100 shadow-xs"
                    : "bg-zinc-100 border-zinc-200 text-zinc-800"
                )}
              >
                Preguntas Frecuentes
              </Badge>
              <h2 className={cn("text-2xl font-black tracking-tight", isDarkTheme ? "text-white" : "text-zinc-900")}>
                ¿Tienes alguna duda?
              </h2>
              <p className={cn("text-xs", isDarkTheme ? "text-zinc-400" : "text-zinc-500")}>
                Encuentra respuestas rápidas sobre tiempos de entrega, formas de pago y metodologías.
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-3">
              {theme.faq.map((faq, idx) => {
                const isExpanded = expandedFaqId === (faq.id || String(idx))
                return (
                  <div
                    key={faq.id || idx}
                    className={cn(
                      "rounded-2xl border transition-all overflow-hidden",
                      isDarkTheme
                        ? "bg-zinc-900/40 border-zinc-800 text-white"
                        : "bg-white border-zinc-200 text-zinc-900 shadow-xs"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedFaqId(isExpanded ? null : faq.id || String(idx))
                      }
                      className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs font-bold"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform duration-200 text-zinc-400",
                          isExpanded && "rotate-180 text-brand-pink"
                        )}
                      />
                    </button>
                    {isExpanded && (
                      <div className={cn(
                        "px-4 pb-4 pt-1 text-xs border-t leading-relaxed animate-in fade-in duration-200",
                        isDarkTheme ? "text-zinc-400 border-zinc-800/60" : "text-zinc-600 border-zinc-100"
                      )}>
                        {faq.answer}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </main>

      {/* 7. STOREFRONT FOOTER */}
      <footer
        className={cn(
          "mt-auto border-t py-12 transition-colors",
          isDarkTheme ? "bg-zinc-950 border-zinc-800 text-zinc-400" : "bg-white border-zinc-200 text-zinc-600"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {orgLogo ? (
                <img src={orgLogo} alt={orgName} className="h-8 max-w-[160px] object-contain" />
              ) : (
                <div
                  className="h-8 px-3 rounded-xl flex items-center justify-center font-bold text-xs text-white"
                  style={{ backgroundColor: theme.primary_color }}
                >
                  {orgName}
                </div>
              )}
              {theme.business_hours_text && (
                <p className={cn("text-[11px] flex items-center gap-1", isDarkTheme ? "text-zinc-400" : "text-zinc-500")}>
                  <Clock className="h-3 w-3" />
                  <span>{theme.business_hours_text}</span>
                </p>
              )}
            </div>

            {/* Social Links */}
            {theme.social_links && Object.values(theme.social_links).some(Boolean) && (
              <div className="flex items-center gap-3">
                {theme.social_links.instagram && (
                  <a
                    href={`https://instagram.com/${theme.social_links.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      "p-2 rounded-xl transition-colors",
                      isDarkTheme ? "bg-zinc-900 text-zinc-300 hover:text-brand-pink" : "bg-zinc-100 text-zinc-600 hover:text-brand-pink"
                    )}
                  >
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {theme.social_links.whatsapp && (
                  <a
                    href={`https://wa.me/${theme.social_links.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      "p-2 rounded-xl transition-colors",
                      isDarkTheme ? "bg-zinc-900 text-zinc-300 hover:text-emerald-500" : "bg-zinc-100 text-zinc-600 hover:text-emerald-500"
                    )}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                )}
                {theme.social_links.website && (
                  <a
                    href={
                      theme.social_links.website.startsWith("http")
                        ? theme.social_links.website
                        : `https://${theme.social_links.website}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      "p-2 rounded-xl transition-colors",
                      isDarkTheme ? "bg-zinc-900 text-zinc-300 hover:text-indigo-500" : "bg-zinc-100 text-zinc-600 hover:text-indigo-500"
                    )}
                  >
                    <Globe className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className={cn(
            "pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]",
            isDarkTheme ? "border-zinc-900 text-zinc-500" : "border-zinc-100 text-zinc-400"
          )}>
            <div>
              © {new Date().getFullYear()} {orgName}. Todos los derechos reservados.
            </div>
            <div className="flex items-center gap-1.5">
              <span>Impulsado por</span>
              <span className="font-black text-brand-pink">Pixy Spaces</span>
            </div>
          </div>
        </div>
      </footer>

      {/* 8. FLOATING MOBILE CART DOCK / PILL */}
      {isCartEnabled && totalCartItems > 0 && (
        <aside
          aria-label="Carrito de compras flotante"
          className="fixed bottom-6 right-6 z-40 md:hidden animate-in slide-in-from-bottom-5 duration-300"
        >
          <Button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-full h-14 px-5 shadow-2xl bg-primary text-primary-foreground font-black text-xs flex items-center gap-3 border-2 border-white/20 hover:scale-105 transition-all"
            style={{ backgroundColor: theme.primary_color }}
          >
            <div className="relative">
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -top-2 -right-2.5 h-5 w-5 rounded-full bg-white text-zinc-950 text-[11px] font-black flex items-center justify-center shadow-md">
                {totalCartItems}
              </span>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] uppercase font-bold opacity-85">Ver Carrito</span>
              <span className="text-xs font-black">{formatPrice(cartSubtotal)}</span>
            </div>
          </Button>
        </aside>
      )}

      {/* 9. INTERACTIVE PRODUCT DETAIL MODAL */}
      <ProductDetailModal
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={closeDetail}
        initialVariantId={initialVariantId}
        initialAddonIds={initialAddonIds}
        portalToken={token}
        organizationId={organization?.id}
        settings={settings}
        themeConfig={theme}
        currency={currency}
        onAddToCart={(payload) => {
          const cover =
            selectedItem?.gallery_images?.[0]?.url ||
            selectedItem?.image_url ||
            null

          addItem({
            catalog_item_id: payload.itemId,
            itemId: payload.itemId,
            name: selectedItem?.name || "Producto",
            category: selectedItem?.category,
            classification: selectedItem?.classification,
            thumbnail_url: cover,
            base_price: selectedItem?.base_price || 0,
            quantity: payload.quantity || 1,
            selected_variant: payload.selectedVariant
              ? {
                  id: payload.selectedVariant.id,
                  name: payload.selectedVariant.title || payload.selectedVariant.name || "Variante",
                  title: payload.selectedVariant.title || payload.selectedVariant.name || "Variante",
                  sku: payload.selectedVariant.sku || null,
                  barcode: payload.selectedVariant.barcode || null,
                  price_override: payload.selectedVariant.price_override ?? null,
                  price_modifier: payload.selectedVariant.price_modifier ?? 0,
                  price_type: payload.selectedVariant.price_type,
                  attributes: payload.selectedVariant.attributes || {},
                }
              : null,
            selectedVariant: payload.selectedVariant,
            selected_addons:
              payload.selectedAddons?.map((a) => ({
                id: a.optionId || a.groupId,
                name: a.name,
                price: a.priceDelta,
                priceDelta: a.priceDelta,
                groupId: a.groupId,
                optionId: a.optionId,
                quantity: a.quantity || 1,
              })) || [],
            selectedAddons: payload.selectedAddons,
            deepLinkUrl: payload.deepLinkUrl,
            track_inventory: selectedItem?.track_inventory ?? selectedItem?.track_stock,
            stock_quantity: selectedItem?.inventory_quantity ?? selectedItem?.stock_quantity,
            allow_backorders: selectedItem?.allow_backorders,
            organization_id: organization?.id || payload.organizationId,
          })
          toast.success("¡Ítem agregado al carrito!")
          setDrawerOpen(true)
        }}
        onRequestQuote={(payload) => {
          toast.success("Solicitud de cotización registrada")
        }}
      />

      {/* 10. SLIDE-OVER PERSISTENT CART DRAWER */}
      <StorefrontCartDrawer
        portalToken={token}
        organizationId={organization?.id}
        settings={settings}
        themeConfig={theme}
        currency={currency}
      />
    </div>
  )
}
