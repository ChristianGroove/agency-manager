"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  StorefrontThemeConfig,
  StorefrontActionPayload,
} from "@/types/catalog"
import { useStorefrontCart } from "@/hooks/use-storefront-cart"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  ShoppingCart,
  ShoppingBag,
  X,
  Plus,
  Minus,
  Trash2,
  Truck,
  Store,
  ArrowRight,
  MessageCircle,
  CreditCard,
  FileSpreadsheet,
  Loader2,
  Check,
  AlertTriangle,
  Package,
  Sparkles,
  ShieldCheck,
  Zap,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/modules/infrastructure/utils/utils"
import {
  createStorefrontLeadAndQuoteAction,
  createMultiItemWompiCheckoutSessionAction,
  generateConsolidatedWhatsAppCheckoutAction,
  ConsolidatedCartCheckoutInput,
} from "@/modules/features/catalog/action-hub-actions"

export interface StorefrontCartDrawerProps {
  portalToken?: string | null
  organizationId?: string | null
  settings?: any
  themeConfig?: StorefrontThemeConfig | null
  currency?: string
  onCheckoutSuccess?: () => void
}

export function StorefrontCartDrawer({
  portalToken,
  organizationId,
  settings = {},
  themeConfig,
  currency = "COP",
  onCheckoutSuccess,
}: StorefrontCartDrawerProps) {
  // 1. Detect Desktop vs Mobile viewport for dual rendering
  const [isDesktop, setIsDesktop] = useState(true)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const checkViewport = () => {
      setIsDesktop(window.innerWidth >= 768)
    }
    checkViewport()
    window.addEventListener("resize", checkViewport)
    return () => window.removeEventListener("resize", checkViewport)
  }, [])

  // 2. Theme & Styling Resolution
  const themeKey = themeConfig?.theme || "modern"
  const isDarkLuxe = themeKey === "dark_luxe"
  const isCyberGlass = themeKey === "cyber_glass_3d" || themeKey === "modern_glass"
  const isDarkTheme =
    isDarkLuxe ||
    isCyberGlass ||
    themeConfig?.color_mode === "dark" ||
    (typeof (themeConfig as any)?.dark_mode === "boolean"
      ? (themeConfig as any).dark_mode
      : false)
  const primaryColor = themeConfig?.primary_color || "#4F46E5"

  // 3. Zustand Cart Store Hooks
  const {
    items,
    is_drawer_open,
    delivery_method,
    customer_profile,
    setDrawerOpen,
    removeItem,
    updateQuantity,
    setDeliveryMethod,
    updateCustomerProfile,
    clearCart,
    getTotalItems,
    getSubtotal,
    hasOutOfStockItems,
    setOrgId,
  } = useStorefrontCart()

  // Sync orgId when prop changes
  useEffect(() => {
    if (organizationId) {
      setOrgId(organizationId)
    }
  }, [organizationId, setOrgId])

  // Checkout Processing States
  const [isSubmittingWhatsApp, setIsSubmittingWhatsApp] = useState(false)
  const [isSubmittingWompi, setIsSubmittingWompi] = useState(false)
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false)

  const orgName =
    settings?.agency_name ||
    settings?.name ||
    themeConfig?.hero?.title ||
    "Nuestra Tienda"

  const orgPhone =
    settings?.agency_phone ||
    settings?.phone ||
    settings?.whatsapp_notifications_phone ||
    themeConfig?.social_links?.whatsapp ||
    ""

  const totalItems = getTotalItems()
  const subtotal = getSubtotal()
  const hasOutOfStock = hasOutOfStockItems()

  const hasPhysicalItems = useMemo(() => {
    return items.some((i) => i.classification === "physical" || (!i.classification && i.track_inventory))
  }, [items])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: currency || "COP",
      maximumFractionDigits: 0,
    }).format(price)
  }

  // ----------------------------------------------------------------------------
  // Validation
  // ----------------------------------------------------------------------------
  const validateCustomerData = (requireAddress = false): boolean => {
    if (!customer_profile.name.trim()) {
      toast.error("Por favor ingresa tu nombre completo")
      return false
    }
    if (!customer_profile.phone.trim()) {
      toast.error("Por favor ingresa tu número de WhatsApp / Teléfono")
      return false
    }
    if (requireAddress && hasPhysicalItems && delivery_method === "delivery" && !customer_profile.address?.trim()) {
      toast.error("Por favor ingresa la dirección de entrega para el envío a domicilio")
      return false
    }
    return true
  }

  // ----------------------------------------------------------------------------
  // 1. Consolidated WhatsApp Checkout Flow
  // ----------------------------------------------------------------------------
  const handleWhatsAppCheckout = async () => {
    if (!validateCustomerData(true)) return
    if (items.length === 0) {
      toast.error("Tu carrito está vacío")
      return
    }

    setIsSubmittingWhatsApp(true)
    try {
      const cleanPhone = (orgPhone || "573000000000").replace(/\D/g, "")
      const targetPhone =
        cleanPhone.length === 10 && !cleanPhone.startsWith("57")
          ? `57${cleanPhone}`
          : cleanPhone || "573000000000"

      // Build structured, itemized WhatsApp order message
      const linesText = items
        .map((item, idx) => {
          const variantText = item.selected_variant?.title
            ? `\n   🎛️ *Variante:* ${item.selected_variant.title}`
            : ""

          const addonsList = item.selected_addons || []
          const addonsText =
            addonsList.length > 0
              ? `\n   ➕ *Adicionales:* ${addonsList
                  .map(
                    (a) =>
                      `${a.name} (+${formatPrice(Number(a.priceDelta || a.price || 0))})`
                  )
                  .join(", ")}`
              : ""

          const lineDeepLink = item.deepLinkUrl
            ? `\n   🔗 *Enlace:* ${item.deepLinkUrl}`
            : ""

          return `${idx + 1}️⃣ *${item.name}*${variantText}${addonsText}\n   🔢 Cantidad: ${item.quantity} x ${formatPrice(item.unit_price)}\n   💵 Subtotal: ${formatPrice(item.final_price)}${lineDeepLink}`
        })
        .join("\n\n")

      const deliveryLabel =
        delivery_method === "delivery"
          ? "Envío a Domicilio"
          : "Retiro en Tienda"

      const addressText =
        delivery_method === "delivery" && customer_profile.address
          ? `\n• Dirección de Entrega: ${customer_profile.address}`
          : ""

      const emailText = customer_profile.email
        ? `\n• Email: ${customer_profile.email}`
        : ""

      const notesText = customer_profile.notes
        ? `\n• Notas: ${customer_profile.notes}`
        : ""

      const message = `🛒 *NUEVO PEDIDO DESDE TIENDA — ${orgName}*
--------------------------------------------------
📦 *Resumen de Productos (${totalItems} ítems):*

${linesText}

--------------------------------------------------
🚚 *Método de Entrega:* ${deliveryLabel}${addressText}
👤 *Datos del Cliente:*
• Nombre: ${customer_profile.name}
• WhatsApp / Teléfono: ${customer_profile.phone}${emailText}${notesText}
--------------------------------------------------
💰 *TOTAL DEL PEDIDO:* ${formatPrice(subtotal)}
--------------------------------------------------
_Generado automáticamente desde Pixy Storefront_`

      const encodedMessage = encodeURIComponent(message)
      const waUri = `https://wa.me/${targetPhone}?text=${encodedMessage}`

      // Create lead and quote in background
      try {
        const payload: ConsolidatedCartCheckoutInput = {
          portalToken: portalToken || null,
          organizationId: organizationId || items[0]?.organization_id || null,
          currency: currency || "COP",
          items: items,
          totalAmount: subtotal,
          customerInfo: {
            name: customer_profile.name,
            phone: customer_profile.phone,
            email: customer_profile.email,
            company_name: customer_profile.company_name,
            address: customer_profile.address,
            notes: customer_profile.notes,
          },
          deliveryMethod: delivery_method,
        }
        await generateConsolidatedWhatsAppCheckoutAction(payload)
      } catch (leadErr) {
        console.warn("Background lead creation notice:", leadErr)
      }

      window.open(waUri, "_blank")
      toast.success("Abriendo WhatsApp con el resumen de tu pedido...")

      if (onCheckoutSuccess) {
        onCheckoutSuccess()
      }
    } catch (err: any) {
      toast.error(err.message || "Error al procesar pedido por WhatsApp")
    } finally {
      setIsSubmittingWhatsApp(false)
    }
  }

  // ----------------------------------------------------------------------------
  // 2. Express Wompi Online Payment Flow
  // ----------------------------------------------------------------------------
  const handleWompiCheckout = async () => {
    if (!validateCustomerData(false)) return
    if (items.length === 0) {
      toast.error("Tu carrito está vacío")
      return
    }
    if (hasOutOfStock) {
      toast.error("Hay productos agotados en tu carrito. Por favor elimínalos para continuar.")
      return
    }

    setIsSubmittingWompi(true)
    try {
      const payload: ConsolidatedCartCheckoutInput = {
        portalToken: portalToken || null,
        organizationId: organizationId || items[0]?.organization_id || null,
        currency: currency || "COP",
        items: items,
        totalAmount: subtotal,
        deepLinkUrl: typeof window !== "undefined" ? window.location.href : "",
        customerInfo: {
          name: customer_profile.name,
          phone: customer_profile.phone,
          email: customer_profile.email,
          company_name: customer_profile.company_name,
          address: customer_profile.address,
          notes: customer_profile.notes,
        },
        deliveryMethod: delivery_method,
      }

      const res = await createMultiItemWompiCheckoutSessionAction(payload)
      if (res.success && res.checkoutUrl) {
        window.location.href = res.checkoutUrl
      } else {
        toast.info(res.error || "La pasarela Wompi no está disponible en este momento. Por favor finaliza tu pedido por WhatsApp.")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al procesar pago online")
    } finally {
      setIsSubmittingWompi(false)
    }
  }

  // ----------------------------------------------------------------------------
  // 3. 1-Click CRM Lead & Formal Quote Flow
  // ----------------------------------------------------------------------------
  const handleQuoteRequest = async () => {
    if (!validateCustomerData(false)) return
    if (items.length === 0) {
      toast.error("Tu carrito está vacío")
      return
    }

    setIsSubmittingQuote(true)
    try {
      const payload: ConsolidatedCartCheckoutInput = {
        portalToken: portalToken || null,
        organizationId: organizationId || items[0]?.organization_id || null,
        currency: currency || "COP",
        items: items,
        totalAmount: subtotal,
        customerInfo: {
          name: customer_profile.name,
          phone: customer_profile.phone,
          email: customer_profile.email,
          company_name: customer_profile.company_name,
          address: customer_profile.address,
          notes: customer_profile.notes,
        },
        deliveryMethod: delivery_method,
      }

      const res = await createStorefrontLeadAndQuoteAction(payload)
      if (res.success) {
        toast.success(
          `¡Cotización formal solicitada exitosamente! ${
            res.quoteNumber ? `Referencia: ${res.quoteNumber}` : ""
          }`
        )
        setDrawerOpen(false)
        if (onCheckoutSuccess) {
          onCheckoutSuccess()
        }
      } else {
        toast.error(res.error || "No se pudo registrar la cotización")
      }
    } catch (err: any) {
      toast.error(err.message || "Error al solicitar cotización")
    } finally {
      setIsSubmittingQuote(false)
    }
  }

  // ----------------------------------------------------------------------------
  // Main Interior Content (Shared between Desktop Sheet & Mobile Vaul Drawer)
  // ----------------------------------------------------------------------------
  const renderCartBody = () => (
    <div className={cn("flex flex-col h-full overflow-hidden", isDarkTheme ? "text-zinc-100" : "text-zinc-900")}>
      {/* 1. Header Bar with Single Clean Close Button */}
      <div
        className={cn(
          "p-5 border-b flex items-center justify-between backdrop-blur-xl shrink-0 transition-colors",
          isDarkTheme
            ? "bg-zinc-950/90 border-zinc-800 text-white"
            : "bg-white/90 border-zinc-200 text-zinc-900"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black tracking-tight">
                Carrito de Compras
              </h2>
              {totalItems > 0 && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-black text-white shadow-xs"
                  style={{ backgroundColor: primaryColor }}
                >
                  {totalItems} {totalItems === 1 ? "ítem" : "ítems"}
                </span>
              )}
            </div>
            <p className={cn("text-[11px] truncate max-w-[220px]", isDarkTheme ? "text-zinc-400" : "text-zinc-500")}>
              {orgName} • Finaliza tu pedido
            </p>
          </div>
        </div>

        {/* Single Modern Close Button */}
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center transition-all cursor-pointer border hover:scale-105 active:scale-95",
            isDarkTheme
              ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
              : "bg-zinc-100 border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200"
          )}
          aria-label="Cerrar carrito"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 2. Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
        {/* Empty State */}
        {items.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <div
              className={cn(
                "h-20 w-20 mx-auto rounded-3xl flex items-center justify-center shadow-inner",
                isDarkTheme ? "bg-zinc-900 text-zinc-500 border border-zinc-800" : "bg-zinc-100 text-zinc-400 border border-zinc-200"
              )}
            >
              <ShoppingBag className="h-10 w-10 stroke-[1.5]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold">
                Tu carrito está vacío
              </h3>
              <p className={cn("text-xs max-w-xs mx-auto leading-relaxed", isDarkTheme ? "text-zinc-400" : "text-zinc-500")}>
                Aún no has agregado productos o servicios a tu pedido. Explora
                nuestro catálogo para comenzar.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => {
                setDrawerOpen(false)
                const catalogEl = document.getElementById("catalog")
                if (catalogEl) {
                  catalogEl.scrollIntoView({ behavior: "smooth" })
                }
              }}
              className="rounded-full px-6 text-xs font-bold gap-2 shadow-md text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <span>Explorar Catálogo</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            {/* Out-of-Stock Alert Banner if any */}
            {hasOutOfStock && (
              <div
                className={cn(
                  "p-3.5 rounded-2xl border text-xs flex items-start gap-2.5",
                  isDarkTheme
                    ? "bg-rose-950/40 border-rose-900/60 text-rose-300"
                    : "bg-rose-50 border-rose-200 text-rose-700"
                )}
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">
                    Productos no disponibles en stock
                  </span>
                  <span className="text-[11px] opacity-90 block leading-tight">
                    Algunos ítems en tu carrito se encuentran agotados. Elimínalos
                    para poder continuar con el pago o pedido.
                  </span>
                </div>
              </div>
            )}

            {/* Line Items List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className={isDarkTheme ? "text-zinc-400" : "text-zinc-500"}>
                  Productos Seleccionados
                </span>
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-rose-500 hover:text-rose-600 text-[11px] font-semibold hover:underline cursor-pointer"
                >
                  Vaciar carrito
                </button>
              </div>

              <div className="space-y-2.5">
                {items.map((line) => {
                  const thumbnail =
                    line.thumbnail_url || line.imageUrl || null
                  const variant =
                    line.selected_variant || line.selectedVariant
                  const addons =
                    line.selected_addons || line.selectedAddons || []

                  const isLineOutOfStock =
                    Boolean(line.track_inventory ?? line.trackInventory) &&
                    !Boolean(line.allow_backorders ?? line.allowBackorders) &&
                    (line.stock_quantity ?? line.inventory_quantity ?? 0) <= 0

                  const maxStock =
                    Boolean(line.track_inventory ?? line.trackInventory) &&
                    !Boolean(line.allow_backorders ?? line.allowBackorders) &&
                    line.stock_quantity !== null &&
                    line.stock_quantity !== undefined
                      ? Number(line.stock_quantity)
                      : null

                  return (
                    <div
                      key={line.id}
                      className={cn(
                        "p-3.5 rounded-2xl border transition-all flex gap-3.5",
                        isLineOutOfStock
                          ? isDarkTheme ? "border-rose-900/60 bg-rose-950/20" : "border-rose-300 bg-rose-50/40"
                          : isDarkTheme
                          ? "bg-zinc-900/70 border-zinc-800/80 hover:border-zinc-700 shadow-xs"
                          : "bg-zinc-50/70 border-zinc-200/80 hover:border-zinc-300 shadow-xs"
                      )}
                    >
                      {/* Thumbnail */}
                      <div
                        className={cn(
                          "h-18 w-18 sm:h-20 sm:w-20 rounded-xl overflow-hidden shrink-0 border",
                          isDarkTheme ? "bg-zinc-800 border-zinc-800" : "bg-zinc-100 border-zinc-200"
                        )}
                      >
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt={line.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className={cn("h-full w-full flex items-center justify-center", isDarkTheme ? "text-zinc-500" : "text-zinc-400")}>
                            <Package className="h-7 w-7" />
                          </div>
                        )}
                      </div>

                      {/* Content Column */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs sm:text-sm font-bold leading-tight truncate">
                              {line.name}
                            </h4>
                            <button
                              type="button"
                              onClick={() => removeItem(line.id)}
                              className="text-zinc-400 hover:text-rose-500 transition-colors p-1 -mr-1 cursor-pointer"
                              aria-label={`Eliminar ${line.name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Variant Badge */}
                          {variant && (
                            <div className="mt-1 flex items-center gap-1.5">
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block text-white"
                                style={{ backgroundColor: primaryColor }}
                              >
                                {variant.title || variant.name || "Variante"}
                              </span>
                            </div>
                          )}

                          {/* Add-ons Chips */}
                          {addons.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {addons.map((a, i) => (
                                <span
                                  key={i}
                                  className={cn(
                                    "text-[10px] px-1.5 py-0.2 rounded-md font-medium border",
                                    isDarkTheme
                                      ? "bg-zinc-800/80 border-zinc-700 text-zinc-300"
                                      : "bg-zinc-100 border-zinc-200 text-zinc-600"
                                  )}
                                >
                                  +{a.name} (+
                                  {formatPrice(
                                    Number(a.priceDelta || a.price || 0)
                                  )}
                                  )
                                </span>
                              ))}
                            </div>
                          )}

                          {isLineOutOfStock && (
                            <span className="mt-1 text-[10px] font-bold text-rose-500 block">
                              Agotado temporalmente
                            </span>
                          )}
                        </div>

                        {/* Price and Quantity Stepper */}
                        <div
                          className={cn(
                            "mt-2.5 pt-2 border-t flex items-center justify-between gap-2",
                            isDarkTheme ? "border-zinc-800" : "border-zinc-200/80"
                          )}
                        >
                          <div className="flex flex-col">
                            <span className={cn("text-[10px] font-medium", isDarkTheme ? "text-zinc-500" : "text-zinc-400")}>
                              {formatPrice(line.unit_price)} c/u
                            </span>
                            <span className="text-xs sm:text-sm font-black">
                              {formatPrice(line.final_price)}
                            </span>
                          </div>

                          {/* Stepper */}
                          <div
                            className={cn(
                              "flex items-center gap-1 p-0.5 rounded-lg border",
                              isDarkTheme ? "bg-zinc-800 border-zinc-700" : "bg-zinc-100 border-zinc-200"
                            )}
                          >
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 rounded-md"
                              onClick={() =>
                                updateQuantity(line.id, line.quantity - 1)
                              }
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-xs font-bold px-1.5 min-w-[20px] text-center">
                              {line.quantity}
                            </span>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 rounded-md"
                              disabled={
                                maxStock !== null && line.quantity >= maxStock
                              }
                              onClick={() =>
                                updateQuantity(line.id, line.quantity + 1)
                              }
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Delivery Method Selector (Physical items only) */}
            {hasPhysicalItems ? (
              <div
                className={cn(
                  "p-4 rounded-2xl border space-y-3",
                  isDarkTheme ? "bg-zinc-900/60 border-zinc-800" : "bg-zinc-50 border-zinc-200"
                )}
              >
                <Label className="text-xs font-bold">
                  Método de Entrega
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod("delivery")}
                    className={cn(
                      "p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer",
                      delivery_method === "delivery"
                        ? "border-transparent text-white font-bold shadow-xs"
                        : isDarkTheme
                        ? "border-zinc-800 hover:bg-zinc-800/60 text-zinc-400"
                        : "border-zinc-200 hover:bg-zinc-100 text-zinc-600"
                    )}
                    style={delivery_method === "delivery" ? { backgroundColor: primaryColor } : {}}
                  >
                    <Truck className="h-4 w-4" />
                    <span className="text-xs">Envío a Domicilio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod("pickup")}
                    className={cn(
                      "p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer",
                      delivery_method === "pickup"
                        ? "border-transparent text-white font-bold shadow-xs"
                        : isDarkTheme
                        ? "border-zinc-800 hover:bg-zinc-800/60 text-zinc-400"
                        : "border-zinc-200 hover:bg-zinc-100 text-zinc-600"
                    )}
                    style={delivery_method === "pickup" ? { backgroundColor: primaryColor } : {}}
                  >
                    <Store className="h-4 w-4" />
                    <span className="text-xs">Retiro en Tienda</span>
                  </button>
                </div>

                {delivery_method === "delivery" && (
                  <div className="pt-2 animate-in fade-in duration-200">
                    <Label className={cn("text-[11px] font-semibold", isDarkTheme ? "text-zinc-400" : "text-zinc-600")}>
                      Dirección de entrega *
                    </Label>
                    <Input
                      required
                      value={customer_profile.address || ""}
                      onChange={(e) =>
                        updateCustomerProfile({ address: e.target.value })
                      }
                      placeholder="Calle, Carrera, Número, Barrio, Ciudad"
                      className={cn(
                        "mt-1 h-9 rounded-xl text-xs border shadow-xs transition-colors",
                        isDarkTheme
                          ? "bg-zinc-900/90 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600"
                          : "bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400"
                      )}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div
                className={cn(
                  "p-3.5 rounded-2xl border text-xs flex items-center gap-2.5",
                  isDarkTheme
                    ? "bg-zinc-900/50 border-zinc-800 text-zinc-400"
                    : "bg-zinc-50 border-zinc-200 text-zinc-600"
                )}
              >
                <Zap className="h-4 w-4 text-brand-pink shrink-0" />
                <span>Entrega digital / atención directa. No requiere dirección física de envío.</span>
              </div>
            )}

            {/* Customer Information Form */}
            <div
              className={cn(
                "p-4 rounded-2xl border space-y-3",
                isDarkTheme ? "bg-zinc-900/60 border-zinc-800" : "bg-zinc-50 border-zinc-200"
              )}
            >
              <Label className="text-xs font-bold">
                Datos del Comprador
              </Label>

              <div>
                <Label className={cn("text-[11px] font-semibold", isDarkTheme ? "text-zinc-400" : "text-zinc-600")}>
                  Nombre completo *
                </Label>
                <Input
                  required
                  value={customer_profile.name}
                  onChange={(e) =>
                    updateCustomerProfile({ name: e.target.value })
                  }
                  placeholder="Ej: Juan Pérez"
                  className={cn(
                    "mt-1 h-9 rounded-xl text-xs border shadow-xs transition-colors",
                    isDarkTheme
                      ? "bg-zinc-900/90 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600"
                      : "bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400"
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <Label className={cn("text-[11px] font-semibold", isDarkTheme ? "text-zinc-400" : "text-zinc-600")}>
                    WhatsApp / Teléfono *
                  </Label>
                  <Input
                    required
                    value={customer_profile.phone}
                    onChange={(e) =>
                      updateCustomerProfile({ phone: e.target.value })
                    }
                    placeholder="Ej: 300 123 4567"
                    className={cn(
                      "mt-1 h-9 rounded-xl text-xs border shadow-xs transition-colors",
                      isDarkTheme
                        ? "bg-zinc-900/90 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600"
                        : "bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400"
                    )}
                  />
                </div>

                <div>
                  <Label className={cn("text-[11px] font-semibold", isDarkTheme ? "text-zinc-400" : "text-zinc-600")}>
                    Correo electrónico
                  </Label>
                  <Input
                    type="email"
                    value={customer_profile.email || ""}
                    onChange={(e) =>
                      updateCustomerProfile({ email: e.target.value })
                    }
                    placeholder="juan@email.com"
                    className={cn(
                      "mt-1 h-9 rounded-xl text-xs border shadow-xs transition-colors",
                      isDarkTheme
                        ? "bg-zinc-900/90 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600"
                        : "bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400"
                    )}
                  />
                </div>
              </div>

              <div>
                <Label className={cn("text-[11px] font-semibold", isDarkTheme ? "text-zinc-400" : "text-zinc-600")}>
                  Notas especiales o indicaciones
                </Label>
                <Textarea
                  rows={2}
                  value={customer_profile.notes || ""}
                  onChange={(e) =>
                    updateCustomerProfile({ notes: e.target.value })
                  }
                  placeholder="Indicaciones de entrega, preferencias, etc."
                  className={cn(
                    "mt-1 rounded-xl text-xs border shadow-xs transition-colors",
                    isDarkTheme
                      ? "bg-zinc-900/90 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600"
                      : "bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400"
                  )}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* 3. Footer Bar & Multi-Channel Action Buttons */}
      {items.length > 0 && (
        <div
          className={cn(
            "p-5 border-t backdrop-blur-xl space-y-3 shrink-0 pb-[calc(1.25rem+env(safe-area-inset-bottom))]",
            isDarkTheme
              ? "bg-zinc-950/95 border-zinc-800 text-white"
              : "bg-white/95 border-zinc-200 text-zinc-900"
          )}
        >
          {/* Summary Price Row */}
          <div className="space-y-1.5 text-xs">
            <div className={cn("flex justify-between", isDarkTheme ? "text-zinc-400" : "text-zinc-500")}>
              <span>Subtotal ({totalItems} ítems):</span>
              <span className="font-semibold">
                {formatPrice(subtotal)}
              </span>
            </div>
            <div className={cn("flex justify-between", isDarkTheme ? "text-zinc-400" : "text-zinc-500")}>
              <span>Envío:</span>
              <span className="font-semibold">
                {delivery_method === "delivery"
                  ? "A coordinar con la tienda"
                  : "Gratis (Retiro en tienda)"}
              </span>
            </div>
            <div
              className={cn(
                "pt-2 border-t flex justify-between items-baseline",
                isDarkTheme ? "border-zinc-800" : "border-zinc-200"
              )}
            >
              <span className="text-sm font-extrabold">
                Total Estimado:
              </span>
              <span
                className="text-xl font-black tracking-tight"
                style={{ color: primaryColor }}
              >
                {formatPrice(subtotal)}
              </span>
            </div>
          </div>

          {/* Multi-Channel Action Buttons */}
          <div className="space-y-2 pt-1">
            {/* 1. WhatsApp Checkout (Most popular / direct conversion) */}
            <Button
              type="button"
              disabled={isSubmittingWhatsApp}
              onClick={handleWhatsAppCheckout}
              className="w-full h-11 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold shadow-md shadow-[#25D366]/20 text-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.01] cursor-pointer"
            >
              {isSubmittingWhatsApp ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageCircle className="h-4 w-4 fill-current" />
              )}
              <span>Finalizar Pedido por WhatsApp</span>
            </Button>

            {/* 2. Formal CRM Quote (Generates Lead + Draft Quote in tenant CRM) */}
            <Button
              type="button"
              variant="outline"
              disabled={isSubmittingQuote}
              onClick={handleQuoteRequest}
              className={cn(
                "w-full h-10 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer",
                isDarkTheme
                  ? "bg-zinc-900 border-zinc-800 text-zinc-100 hover:bg-zinc-800 hover:border-zinc-700"
                  : "bg-zinc-100 border-zinc-200 text-zinc-800 hover:bg-zinc-200"
              )}
            >
              {isSubmittingQuote ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 text-brand-pink" />
              )}
              <span>Solicitar Cotización Formal CRM</span>
            </Button>

            {/* 3. Wompi Online Payment (Credit card, PSE, Nequi) */}
            <Button
              type="button"
              disabled={isSubmittingWompi || hasOutOfStock}
              onClick={handleWompiCheckout}
              className={cn(
                "w-full h-9 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer opacity-90 hover:opacity-100",
                isDarkTheme
                  ? "bg-zinc-900/80 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800"
                  : "bg-zinc-100 border border-zinc-200 text-zinc-700 hover:bg-zinc-200"
              )}
            >
              {isSubmittingWompi ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CreditCard className="h-3.5 w-3.5 text-emerald-500" />
              )}
              <span>Pagar con Wompi (Online Express)</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )

  if (!isClient) return null

  // ----------------------------------------------------------------------------
  // DESKTOP: Radix Sheet (Floating 3D Premium Right Slide-Over)
  // ----------------------------------------------------------------------------
  if (isDesktop) {
    return (
      <Sheet open={is_drawer_open} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className={cn(
            "w-full sm:max-w-[480px] p-0 gap-0 border-none shadow-2xl focus:outline-none z-50",
            "mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden bg-transparent",
            "[&>button]:hidden", // Hides the unstyled default close button in favor of our beautiful header button
            isDarkTheme && "dark"
          )}
        >
          <VisuallyHidden.Root>
            <SheetTitle>Carrito de Compras</SheetTitle>
            <SheetDescription>
              Resumen de ítems seleccionados y opciones de finalización
            </SheetDescription>
          </VisuallyHidden.Root>
          <div
            className={cn(
              "flex flex-col h-full rounded-3xl overflow-hidden shadow-2xl border transition-colors",
              isDarkTheme
                ? "bg-[#09090b] border-zinc-800 text-zinc-100"
                : "bg-white border-zinc-200 text-zinc-900"
            )}
          >
            {renderCartBody()}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // ----------------------------------------------------------------------------
  // MOBILE: Vaul Drawer (Bottom Sheet)
  // ----------------------------------------------------------------------------
  return (
    <Drawer open={is_drawer_open} onOpenChange={setDrawerOpen}>
      <DrawerContent
        className={cn(
          "max-h-[92vh] flex flex-col rounded-t-[32px] border-t shadow-2xl overflow-hidden focus:outline-none z-50",
          isDarkTheme
            ? "bg-[#09090b] border-zinc-800 text-zinc-100"
            : "bg-white border-zinc-200 text-zinc-900",
          isDarkTheme && "dark"
        )}
      >
        <VisuallyHidden.Root>
          <DrawerTitle>Carrito de Compras</DrawerTitle>
          <DrawerDescription>
            Resumen de ítems seleccionados y opciones de finalización
          </DrawerDescription>
        </VisuallyHidden.Root>
        <div
          className={cn(
            "mx-auto mt-3 h-1.5 w-12 rounded-full shrink-0",
            isDarkTheme ? "bg-zinc-800" : "bg-zinc-300"
          )}
        />
        {renderCartBody()}
      </DrawerContent>
    </Drawer>
  )
}
