"use client"

import React, { useState } from "react"
import {
    UniversalCatalogItem,
    CatalogVariant,
    StorefrontThemeConfig,
    StorefrontActionPayload
} from "@/types/catalog"
import { SelectedAddon } from "./addon-selector"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    MessageCircle,
    FileSpreadsheet,
    CreditCard,
    Calendar,
    ShoppingCart,
    Share2,
    Check,
    Loader2,
    QrCode,
    Sparkles,
    Copy,
    Send
} from "lucide-react"
import {
    generateWhatsAppCheckoutUriAction,
    createStorefrontLeadAndQuoteAction,
    createWompiCheckoutSessionAction,
    generateAppointmentBookingLinkAction
} from "@/modules/features/catalog/action-hub-actions"
import { toast } from "sonner"
import { cn, formatCurrency } from "@/modules/infrastructure/utils/utils"

export interface ActionHubButtonsProps {
    item: UniversalCatalogItem
    selectedVariant?: CatalogVariant | null
    selectedAddons?: SelectedAddon[]
    quantity?: number
    calculatedTotalPrice: number
    currency?: string
    portalToken?: string | null
    organizationId?: string | null
    themeConfig?: StorefrontThemeConfig | null
    deepLinkUrl?: string
    ctaType?: string
    isOutOfStock?: boolean
    onAddToCart?: (payload: StorefrontActionPayload) => void
    onBuyNow?: (payload: StorefrontActionPayload) => void
    onRequestQuote?: (payload: StorefrontActionPayload) => void
    onWompiCheckout?: (payload: StorefrontActionPayload) => void
    className?: string
}

export function ActionHubButtons({
    item,
    selectedVariant,
    selectedAddons = [],
    quantity = 1,
    calculatedTotalPrice,
    currency = "COP",
    portalToken,
    organizationId,
    themeConfig,
    deepLinkUrl,
    ctaType,
    isOutOfStock = false,
    onAddToCart,
    onBuyNow,
    onRequestQuote,
    onWompiCheckout,
    className
}: ActionHubButtonsProps) {
    const effectiveCta = ctaType || item.cta_type || themeConfig?.primary_cta || "whatsapp"
    const safeDeepLinkUrl = deepLinkUrl || (typeof window !== "undefined" ? window.location.href : "")

    // Dialog state for 1-Click Quote
    const [isQuoteOpen, setIsQuoteOpen] = useState(false)
    const [isSubmittingQuote, setIsSubmittingQuote] = useState(false)
    const [quoteCustomer, setQuoteCustomer] = useState({
        name: "",
        phone: "",
        email: "",
        company_name: "",
        notes: ""
    })

    // Dialog state for QR Code / Share
    const [isShareOpen, setIsShareOpen] = useState(false)
    const [copiedLink, setCopiedLink] = useState(false)

    // Construct normalized StorefrontActionPayload
    const buildPayload = (actionType: StorefrontActionPayload["actionType"]): StorefrontActionPayload => ({
        actionType,
        itemId: item.id,
        variantId: selectedVariant?.id || null,
        selectedVariant: selectedVariant || null,
        selectedAddons: selectedAddons.map(a => ({
            groupId: a.groupId,
            optionId: a.optionId,
            name: a.name,
            priceDelta: a.priceDelta,
            quantity: a.quantity || 1
        })),
        calculatedTotalPrice,
        quantity: Math.max(1, quantity),
        deepLinkUrl: safeDeepLinkUrl,
        portalToken: portalToken || null,
        organizationId: organizationId || item.organization_id || null,
        currency: currency || "COP",
        customerInfo: quoteCustomer.name ? quoteCustomer : undefined
    })

    // 1. WHATSAPP CHECKOUT
    const handleWhatsAppCheckout = async () => {
        const payload = buildPayload("whatsapp")
        try {
            const res = await generateWhatsAppCheckoutUriAction(payload)
            if (res.success && res.uri) {
                window.open(res.uri, "_blank")
                toast.success("Abriendo WhatsApp con tu pedido...")
            } else {
                // Fallback client-side URL
                const phone = "573000000000"
                const msg = `¡Hola! Me interesa ${item.name} (${selectedVariant?.title || "Estándar"}). Total: $${calculatedTotalPrice.toLocaleString("es-CO")} COP. Enlace: ${safeDeepLinkUrl}`
                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank")
            }
        } catch (err: any) {
            toast.error("No se pudo generar el enlace de WhatsApp")
        }
    }

    // 2. 1-CLICK CRM QUOTE SUBMISSION
    const handleQuoteSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!quoteCustomer.name || !quoteCustomer.phone) {
            toast.error("Por favor ingresa tu nombre y número de teléfono")
            return
        }

        setIsSubmittingQuote(true)
        try {
            const payload = buildPayload("quote")
            payload.customerInfo = quoteCustomer

            const res = await createStorefrontLeadAndQuoteAction(payload)
            if (res.success) {
                toast.success(`¡Cotización generada exitosamente! ${res.quoteNumber ? `Ref: ${res.quoteNumber}` : ""}`)
                setIsQuoteOpen(false)
                setQuoteCustomer({ name: "", phone: "", email: "", company_name: "", notes: "" })
                if (onRequestQuote) {
                    onRequestQuote(payload)
                }
            } else {
                toast.error(res.error || "No se pudo generar la cotización")
            }
        } catch (err: any) {
            toast.error("Error al enviar solicitud de cotización")
        } finally {
            setIsSubmittingQuote(false)
        }
    }

    // 3. WOMPI EXPRESS CHECKOUT
    const handleWompiCheckout = async () => {
        const payload = buildPayload("wompi")
        try {
            if (onWompiCheckout) {
                onWompiCheckout(payload)
                return
            }
            const res = await createWompiCheckoutSessionAction(payload)
            if (res.success && res.checkoutUrl) {
                window.location.href = res.checkoutUrl
            } else {
                toast.error(res.error || "No se pudo iniciar la sesión de pago")
            }
        } catch (err: any) {
            toast.error("Error al iniciar checkout con Wompi")
        }
    }

    // 4. APPOINTMENT BOOKING
    const handleAppointmentBooking = async () => {
        const payload = buildPayload("appointment")
        try {
            const res = await generateAppointmentBookingLinkAction(payload)
            if (res.success && res.bookingUrl) {
                window.location.href = res.bookingUrl
            } else {
                toast.info("Redirigiendo al calendario de reservas...")
            }
        } catch (err: any) {
            toast.error("Error al generar enlace de reserva")
        }
    }

    // 5. ADD TO CART
    const handleAddToCart = () => {
        const payload = buildPayload("cart")
        if (onAddToCart) {
            onAddToCart(payload)
        } else {
            toast.success(`¡Agregado al carrito: ${item.name}!`)
        }
    }

    // 6. COPY LINK
    const handleCopyLink = () => {
        navigator.clipboard.writeText(safeDeepLinkUrl)
        setCopiedLink(true)
        toast.success("¡Enlace copiado al portapapeles!")
        setTimeout(() => setCopiedLink(false), 2500)
    }

    // 7. NATIVE SHARE
    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: item.name,
                    text: item.description || `Mira ${item.name} en el catálogo`,
                    url: safeDeepLinkUrl
                })
            } catch {
                // Ignore cancel
            }
        } else {
            setIsShareOpen(true)
        }
    }

    return (
        <div className={cn("space-y-3 w-full", className)}>
            {/* Primary Action Row */}
            <div className="flex flex-col sm:flex-row gap-2.5">
                {/* Primary Button based on CTA type */}
                {effectiveCta === "buy" && (
                    <Button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={handleWompiCheckout}
                        className="flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 text-sm transition-all"
                    >
                        <CreditCard className="h-4 w-4" />
                        <span>Comprar Ahora</span>
                    </Button>
                )}

                {effectiveCta === "quote" && (
                    <Button
                        type="button"
                        onClick={() => setIsQuoteOpen(true)}
                        className="flex-1 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 text-sm transition-all"
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>Solicitar Cotización</span>
                    </Button>
                )}

                {(effectiveCta === "appointment" || effectiveCta === "booking") && (
                    <Button
                        type="button"
                        onClick={handleAppointmentBooking}
                        className="flex-1 h-12 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 text-sm transition-all"
                    >
                        <Calendar className="h-4 w-4" />
                        <span>Agendar Cita / Reserva</span>
                    </Button>
                )}

                {(effectiveCta === "add_to_cart" || effectiveCta === "cart") && (
                    <Button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={handleAddToCart}
                        className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/25 flex items-center justify-center gap-2 text-sm transition-all"
                    >
                        <ShoppingCart className="h-4 w-4" />
                        <span>Agregar al Carrito</span>
                    </Button>
                )}

                {/* Default: WhatsApp Direct Checkout */}
                {(!effectiveCta || effectiveCta === "whatsapp" || effectiveCta === "info" || effectiveCta === "portfolio") && (
                    <Button
                        type="button"
                        onClick={handleWhatsAppCheckout}
                        className="flex-1 h-12 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold shadow-lg shadow-[#25D366]/25 flex items-center justify-center gap-2 text-sm transition-all"
                    >
                        <MessageCircle className="h-4 w-4 fill-current" />
                        <span>Contactar por WhatsApp</span>
                    </Button>
                )}

                {/* Secondary Button: Share / QR Code */}
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleNativeShare}
                    className="h-12 w-12 rounded-2xl border-zinc-200 dark:border-zinc-800 shrink-0 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    aria-label="Compartir enlace o código QR"
                >
                    <Share2 className="h-4 w-4" />
                </Button>
            </div>

            {/* Additional Secondary Action: Quick Quote Option (Only for Services / B2B where formal quotes are relevant) */}
            {effectiveCta !== "quote" && item.classification !== "real_estate" && themeConfig?.industry_preset !== "real_estate" && (
                <div className="flex justify-center">
                    <button
                        type="button"
                        onClick={() => setIsQuoteOpen(true)}
                        className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-4 transition-colors"
                    >
                        ¿Necesitas una propuesta formal? Solicitar cotización oficial
                    </button>
                </div>
            )}

            {/* 1-CLICK QUOTE REQUEST MODAL */}
            <Dialog open={isQuoteOpen} onOpenChange={setIsQuoteOpen}>
                <DialogContent className="max-w-md rounded-3xl p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            Solicitud de Cotización Oficial
                        </DialogTitle>
                        <DialogDescription className="text-xs text-zinc-500">
                            Completa tus datos para recibir un presupuesto formal de {item.name}.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleQuoteSubmit} className="space-y-3.5 mt-2">
                        <div>
                            <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                Nombre completo *
                            </Label>
                            <Input
                                required
                                value={quoteCustomer.name}
                                onChange={(e) => setQuoteCustomer(c => ({ ...c, name: e.target.value }))}
                                placeholder="Ej: Juan Pérez"
                                className="mt-1 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-xs"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                            <div>
                                <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                    WhatsApp / Teléfono *
                                </Label>
                                <Input
                                    required
                                    value={quoteCustomer.phone}
                                    onChange={(e) => setQuoteCustomer(c => ({ ...c, phone: e.target.value }))}
                                    placeholder="Ej: 300 123 4567"
                                    className="mt-1 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-xs"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                    Correo electrónico
                                </Label>
                                <Input
                                    type="email"
                                    value={quoteCustomer.email}
                                    onChange={(e) => setQuoteCustomer(c => ({ ...c, email: e.target.value }))}
                                    placeholder="juan@empresa.com"
                                    className="mt-1 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-xs"
                                />
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                Empresa / Organización (Opcional)
                            </Label>
                            <Input
                                value={quoteCustomer.company_name}
                                onChange={(e) => setQuoteCustomer(c => ({ ...c, company_name: e.target.value }))}
                                placeholder="Nombre de tu empresa"
                                className="mt-1 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-xs"
                            />
                        </div>

                        <div>
                            <Label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                Notas adicionales o requerimientos
                            </Label>
                            <Textarea
                                rows={2}
                                value={quoteCustomer.notes}
                                onChange={(e) => setQuoteCustomer(c => ({ ...c, notes: e.target.value }))}
                                placeholder="Detalles de entrega, personalizaciones, etc."
                                className="mt-1 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-xs"
                            />
                        </div>

                        {/* Summary badge */}
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs flex justify-between items-center">
                            <span className="text-zinc-500">Total estimado:</span>
                            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                                ${calculatedTotalPrice.toLocaleString("es-CO")} COP
                            </span>
                        </div>

                        <Button
                            type="submit"
                            disabled={isSubmittingQuote}
                            className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 text-xs flex items-center justify-center gap-2"
                        >
                            {isSubmittingQuote ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Generando cotización...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4" />
                                    <span>Enviar Solicitud</span>
                                </>
                            )}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* SHARE & QR CODE MODAL */}
            <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
                <DialogContent className="max-w-sm rounded-3xl p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl text-center">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                            Compartir {item.name}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-zinc-500">
                            Escanea el código QR o copia el enlace con tu configuración personalizada.
                        </DialogDescription>
                    </DialogHeader>

                    {/* QR Code Canvas / Visual Placeholder */}
                    <div className="my-4 p-4 bg-white rounded-2xl border border-zinc-200 inline-block shadow-inner mx-auto">
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(safeDeepLinkUrl)}`}
                            alt="Código QR de Producto"
                            className="w-44 h-44 mx-auto rounded-lg"
                        />
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                        <Input
                            readOnly
                            value={safeDeepLinkUrl}
                            className="h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-xs truncate select-all"
                        />
                        <Button
                            type="button"
                            onClick={handleCopyLink}
                            className="h-10 rounded-xl px-4 bg-primary text-primary-foreground font-bold text-xs shrink-0 flex items-center gap-1.5"
                        >
                            {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            <span>{copiedLink ? "Copiado" : "Copiar"}</span>
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
