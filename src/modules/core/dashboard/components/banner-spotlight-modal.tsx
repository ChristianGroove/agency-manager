"use client"

import React, { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogPortal,
    DialogOverlay,
} from "@/components/ui/dialog"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import {
    X,
    Sparkles,
    Zap,
    Shield,
    BarChart,
    CheckCircle,
    Rocket,
    Bell,
    Users,
    Bot,
    Layers,
    Flame,
    Target,
    Cpu,
    ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import dynamic from "next/dynamic"
import { cn } from "@/modules/infrastructure/utils/utils"
import {
    BannerModalConfig,
    BannerModalFeature,
    BannerTheme,
    interpolateTokens,
    ShimmerText,
    getTextColorClass,
} from "./global-dashboard-banner"

const Lottie = dynamic(() => import("lottie-react"), { ssr: false })

// Caché en memoria para evitar re-fetches de Lottie del modal
const modalLottieCache = new Map<string, any>()

export function renderFeatureIcon(iconName?: string) {
    if (!iconName) return <Sparkles className="w-3.5 h-3.5 text-primary" />

    // Si es un emoji o pictograma nativo
    if (/\p{Extended_Pictographic}/u.test(iconName)) {
        return <span className="text-sm leading-none">{iconName}</span>
    }

    const iconMap: Record<string, React.ReactNode> = {
        Zap: <Zap className="w-3.5 h-3.5 text-amber-500" />,
        Sparkles: <Sparkles className="w-3.5 h-3.5 text-primary" />,
        Shield: <Shield className="w-3.5 h-3.5 text-emerald-500" />,
        BarChart: <BarChart className="w-3.5 h-3.5 text-cyan-500" />,
        CheckCircle: <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
        Rocket: <Rocket className="w-3.5 h-3.5 text-indigo-500" />,
        Bell: <Bell className="w-3.5 h-3.5 text-amber-500" />,
        Users: <Users className="w-3.5 h-3.5 text-blue-500" />,
        Bot: <Bot className="w-3.5 h-3.5 text-purple-500" />,
        Layers: <Layers className="w-3.5 h-3.5 text-primary" />,
        Flame: <Flame className="w-3.5 h-3.5 text-rose-500" />,
        Target: <Target className="w-3.5 h-3.5 text-primary" />,
        Cpu: <Cpu className="w-3.5 h-3.5 text-cyan-500" />,
    }

    return iconMap[iconName] || <Sparkles className="w-3.5 h-3.5 text-primary" />
}

export function BannerSpotlightModal({
    isOpen,
    onClose,
    config,
    fallbackMediaUrl,
    fallbackMediaType = "json_lottie",
    slideTheme = "auto",
    userContext = {},
}: {
    isOpen: boolean
    onClose: () => void
    config?: BannerModalConfig | null
    fallbackMediaUrl?: string
    fallbackMediaType?: "json_lottie" | "image"
    slideTheme?: BannerTheme
    userContext?: { userName?: string; orgName?: string; spaceName?: string }
}) {
    const [animationData, setAnimationData] = useState<any>(null)

    const mediaUrl = config?.media_url || fallbackMediaUrl || ""
    const mediaType = config?.media_type || fallbackMediaType

    // Cargar animación Lottie con caché
    useEffect(() => {
        if (!isOpen || mediaType !== "json_lottie" || !mediaUrl) {
            setAnimationData(null)
            return
        }

        if (modalLottieCache.has(mediaUrl)) {
            setAnimationData(modalLottieCache.get(mediaUrl))
            return
        }

        let isCurrent = true
        fetch(mediaUrl)
            .then(res => (res.ok ? res.json() : null))
            .then(data => {
                if (isCurrent && data) {
                    modalLottieCache.set(mediaUrl, data)
                    setAnimationData(data)
                }
            })
            .catch(() => {
                if (isCurrent) setAnimationData(null)
            })

        return () => {
            isCurrent = false
        }
    }, [isOpen, mediaUrl, mediaType])

    if (!isOpen) return null

    const modalConfig: Partial<BannerModalConfig> = config || {}

    // Interpolar tokens
    const resolvedTitle = interpolateTokens(modalConfig.title || "Conoce esta nueva función", userContext)
    const resolvedSubtitle = interpolateTokens(modalConfig.subtitle || "", userContext)
    const resolvedBadge = interpolateTokens(modalConfig.badge || "🚀 NOVEDAD", userContext)
    const features: BannerModalFeature[] = Array.isArray(modalConfig.features) && modalConfig.features.length > 0
        ? modalConfig.features
        : [
            { icon: "Zap", title: "Automatización Nativa", description: "Flujos de trabajo acelerados sin fricción" },
            { icon: "BarChart", title: "Métricas en Tiempo Real", description: "Visibilidad total del rendimiento de tu equipo" },
        ]

    // Gradiente del Hero Cover según el tema del banner
    let heroBgClass = "bg-gradient-to-br from-primary/20 via-primary/5 to-background"
    if (slideTheme === "brand_secondary") {
        heroBgClass = "bg-gradient-to-br from-[var(--brand-cyan,#00E0FF)]/25 via-[var(--brand-cyan,#00E0FF)]/5 to-background"
    } else if (slideTheme === "dark") {
        heroBgClass = "bg-gradient-to-br from-zinc-900 via-zinc-950 to-black"
    } else if (slideTheme === "light") {
        heroBgClass = "bg-gradient-to-br from-slate-100 via-slate-50 to-white"
    }

    return (
        <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
            <DialogPortal>
                <DialogOverlay className="bg-black/60 backdrop-blur-md z-[100]" />
                <DialogPrimitive.Content
                    className={cn(
                        "fixed left-[50%] top-[50%] z-[101] flex flex-col w-full max-w-lg translate-x-[-50%] translate-y-[-50%]",
                        "p-0 overflow-hidden rounded-3xl border border-white/20 dark:border-white/10 bg-background shadow-2xl max-h-[92vh]",
                        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-250 data-[state=open]:ease-out",
                        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-200"
                    )}
                >
                    <VisuallyHidden.Root>
                        <DialogPrimitive.Title>{resolvedTitle}</DialogPrimitive.Title>
                        <DialogPrimitive.Description>{resolvedSubtitle}</DialogPrimitive.Description>
                    </VisuallyHidden.Root>

                    {/* 1. Header Hero con Composición estilo Banner (Lottie absoluto a la derecha, Textos a la izquierda) */}
                    <div className={cn("relative w-full overflow-hidden p-6 sm:p-7 pb-5 select-none", heroBgClass)}>
                        {/* Gradiente de mezcla inferior */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/90 pointer-events-none z-10" />

                        {/* Multimedia Lottie o Imagen ABSOLUTA en la esquina superior derecha */}
                        {mediaUrl && (
                            <div className="absolute right-0 top-0 bottom-0 h-full w-[170px] sm:w-[215px] pointer-events-none z-10 flex items-center justify-end overflow-hidden pr-3">
                                {mediaType === "image" ? (
                                    <img
                                        src={mediaUrl}
                                        alt={resolvedTitle}
                                        className="h-full w-auto max-h-[140px] sm:max-h-[160px] object-contain drop-shadow-xl"
                                    />
                                ) : (
                                    animationData && (
                                        <Lottie
                                            animationData={animationData}
                                            loop={true}
                                            className="h-full w-auto max-h-[140px] sm:max-h-[160px] aspect-square flex items-center justify-end drop-shadow-xl"
                                            style={{ height: "100%", maxHeight: "160px", width: "auto" }}
                                        />
                                    )
                                )}
                            </div>
                        )}

                        {/* Botón flotante para cerrar en la esquina superior derecha */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute top-3.5 right-3.5 z-30 w-7 h-7 rounded-full bg-black/40 hover:bg-black/65 text-white backdrop-blur-md flex items-center justify-center transition-all shadow-md cursor-pointer group"
                            aria-label="Cerrar modal"
                        >
                            <X className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
                        </button>

                        {/* Columna de Textos a la Izquierda: Badge, Título y Descripción */}
                        <div className="relative z-20 max-w-[62%] sm:max-w-[66%] space-y-1.5 text-left">
                            {resolvedBadge && (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/95 dark:bg-white/12 text-primary border border-black/[0.08] dark:border-white/20 shadow-2xs w-fit">
                                    {resolvedBadge}
                                </span>
                            )}
                            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-foreground leading-tight drop-shadow-xs">
                                {resolvedTitle}
                            </h3>
                            {resolvedSubtitle && (
                                <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-relaxed line-clamp-3">
                                    {resolvedSubtitle}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* 2. Grid de Capacidades Clave (Power Highlights) */}
                    {features.length > 0 && (
                        <div className="px-6 py-3.5 space-y-2.5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {features.map((feat, idx) => (
                                    <div
                                        key={idx}
                                        className="p-3 rounded-2xl bg-slate-50/80 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 flex items-start gap-2.5 transition-colors hover:border-slate-300 dark:hover:border-zinc-700"
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-background border border-border/80 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                                            {renderFeatureIcon(feat.icon)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold text-foreground leading-snug truncate">
                                                {interpolateTokens(feat.title, userContext)}
                                            </div>
                                            <div className="text-[11px] font-medium text-muted-foreground leading-snug line-clamp-2 mt-0.5">
                                                {interpolateTokens(feat.description, userContext)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 3. Footer de Acciones y Conversión con Padding Ajustado y Mejor Aprovechamiento */}
                    <div className="px-6 py-3 bg-slate-50/70 dark:bg-zinc-950/40 border-t border-border/50 flex items-center justify-between gap-3 mt-auto">
                        <div className="flex items-center">
                            {modalConfig.secondary_cta_text ? (
                                modalConfig.secondary_cta_url ? (
                                    <Link href={modalConfig.secondary_cta_url} onClick={onClose}>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                                        >
                                            {modalConfig.secondary_cta_text}
                                        </Button>
                                    </Link>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onClose}
                                        className="h-8 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                                    >
                                        {modalConfig.secondary_cta_text}
                                    </Button>
                                )
                            ) : (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onClose}
                                    className="h-8 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                    Cerrar
                                </Button>
                            )}
                        </div>

                        <Link
                            href={modalConfig.primary_cta_url || "/dashboard"}
                            onClick={onClose}
                        >
                            <Button
                                size="sm"
                                className="rounded-xl h-8.5 px-5 text-xs font-bold gap-2 cursor-pointer shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary text-primary-foreground"
                            >
                                <ShimmerText active={modalConfig.primary_cta_shimmer !== false}>
                                    {modalConfig.primary_cta_text || "Probar Ahora"}
                                </ShimmerText>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                        </Link>
                    </div>
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    )
}
