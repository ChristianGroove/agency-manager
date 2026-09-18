"use client"

import React, { useState, useEffect, useMemo, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import { SplitText } from "@/components/ui/split-text"
import dynamic from "next/dynamic"
import { useBranding } from "@/components/providers/branding-provider"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { supabase } from "@/modules/core/database/supabase"
import { cn } from "@/modules/infrastructure/utils/utils"

const Lottie = dynamic(() => import("lottie-react"), { ssr: false })

// Caché en memoria para evitar re-fetches y parpadeos al rotar diapositivas
const lottieCache = new Map<string, any>()

export type TextColorRole =
    | "default"
    | "brand_primary"
    | "brand_secondary"
    | "muted"
    | "emerald"
    | "amber"
    | "cyan"
    | "indigo"
    | "white"

export type BannerTheme = "auto" | "brand_primary" | "brand_secondary" | "dark" | "light"

export interface BannerPhrase {
    text: string
    durationSeconds: number
}

export interface GlobalBannerSlide {
    id: string
    kicker?: string
    kickerColor?: TextColorRole
    kicker_shimmer?: boolean
    title: string
    titleColor?: TextColorRole
    subtitle?: string
    subtitleColor?: TextColorRole
    showSubtitle?: boolean

    phrases: BannerPhrase[]
    phrasesColor?: TextColorRole

    cta_text?: string
    cta_url?: string
    cta_open_new_tab?: boolean
    cta_variant?: "default" | "secondary" | "outline"
    cta_shimmer?: boolean

    media_type?: "json_lottie" | "image"
    media_url?: string
    layout_pos?: "left" | "center" | "right"
    theme?: BannerTheme

    starts_at?: string | null
    expires_at?: string | null
}

export interface GlobalBannerConfig {
    id?: string
    space_type?: string
    is_active?: boolean
    starts_at?: string | null
    expires_at?: string | null
    slides?: GlobalBannerSlide[]

    // Legacy fields for backward compatibility
    title?: string
    description?: string | string[]
    cta_text?: string
    cta_url?: string
    media_type?: string
    media_url?: string
    layout_pos?: "left" | "center" | "right"
    theme?: BannerTheme
}

export function getTextColorClass(
    role?: TextColorRole,
    defaultClass = "text-gray-900 dark:text-white"
): string {
    switch (role) {
        case "brand_primary":
            // Pixy Signature Pink / Tenant Primary
            return "text-[var(--brand-pink,var(--primary,#F205E2))]"
        case "brand_secondary":
            // Pixy Cyan / Tenant Secondary
            return "text-[var(--brand-cyan,#00E0FF)]"
        case "muted":
            return "text-gray-600 dark:text-gray-300"
        case "emerald":
            return "text-emerald-600 dark:text-emerald-400"
        case "amber":
            return "text-amber-600 dark:text-amber-400"
        case "cyan":
            return "text-cyan-600 dark:text-cyan-400"
        case "indigo":
            return "text-indigo-600 dark:text-indigo-400"
        case "white":
            return "text-white"
        case "default":
        default:
            return defaultClass
    }
}

export function normalizeBannerSlides(config?: GlobalBannerConfig | null): GlobalBannerSlide[] {
    if (!config) return []

    // Si config.description contiene slides serializados como fallback
    let sourceSlides = config.slides
    if ((!sourceSlides || !Array.isArray(sourceSlides) || sourceSlides.length === 0) && typeof config.description === 'string') {
        const trimmed = config.description.trim()
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            try {
                const parsed = JSON.parse(trimmed)
                if (Array.isArray(parsed) && parsed.length > 0) {
                    sourceSlides = parsed
                }
            } catch {}
        }
    }

    // Si ya tiene slides modernos válidos
    if (sourceSlides && Array.isArray(sourceSlides) && sourceSlides.length > 0) {
        return sourceSlides.map((s, idx) => {
            let phrases = s.phrases
            if (!Array.isArray(phrases) || phrases.length === 0) {
                // Fallback si venía texto plano
                const legacyText = (s as any).description || (s as any).text || "Mensaje del banner"
                const textArr = Array.isArray(legacyText) ? legacyText : [legacyText]
                phrases = textArr.filter(Boolean).map(t => ({ text: String(t), durationSeconds: 6 }))
            }
            return {
                id: s.id || `slide-${idx + 1}`,
                kicker: s.kicker || "",
                kickerColor: s.kickerColor || "brand_primary",
                kicker_shimmer: Boolean(s.kicker_shimmer ?? (s as any).kickerShimmer),
                title: s.title || "Título del Banner",
                titleColor: s.titleColor || "default",
                subtitle: s.subtitle || "",
                subtitleColor: s.subtitleColor || "muted",
                showSubtitle: typeof s.showSubtitle === "boolean" ? s.showSubtitle : Boolean(s.subtitle),
                phrases: phrases.length > 0 ? phrases : [{ text: "Mensaje dinámico", durationSeconds: 6 }],
                phrasesColor: s.phrasesColor || "default",
                cta_text: s.cta_text || "",
                cta_url: s.cta_url || "",
                cta_open_new_tab: Boolean(s.cta_open_new_tab),
                cta_variant: s.cta_variant || "default",
                cta_shimmer: Boolean(s.cta_shimmer ?? (s as any).ctaShimmer),
                media_type: s.media_type || "json_lottie",
                media_url: s.media_url || "",
                layout_pos: s.layout_pos || "right",
                theme: (s.theme as BannerTheme) || "auto",
                starts_at: s.starts_at || null,
                expires_at: s.expires_at || null,
            }
        })
    }

    // Normalizar banner legacy de 1 sola diapositiva
    const rawDesc = config.description || "Bienvenido a Pixy"
    const descArr = Array.isArray(rawDesc) ? rawDesc : [rawDesc]
    const phrases: BannerPhrase[] = descArr.filter(Boolean).map(text => ({
        text: String(text),
        durationSeconds: 8,
    }))

    return [
        {
            id: `legacy-${config.id || "1"}`,
            kicker: "NOVEDAD",
            kickerColor: "brand_primary",
            kicker_shimmer: false,
            title: config.title || "Bienvenido a tu Dashboard",
            titleColor: "default",
            subtitle: "",
            subtitleColor: "muted",
            showSubtitle: false,
            phrases: phrases.length > 0 ? phrases : [{ text: "Gestiona tu negocio fácilmente", durationSeconds: 8 }],
            phrasesColor: "default",
            cta_text: config.cta_text || "",
            cta_url: config.cta_url || "",
            cta_open_new_tab: false,
            cta_variant: "default",
            cta_shimmer: false,
            media_type: (config.media_type as any) || "json_lottie",
            media_url: config.media_url || "",
            layout_pos: config.layout_pos || "right",
            theme: (config.theme as BannerTheme) || "auto",
            starts_at: config.starts_at || null,
            expires_at: config.expires_at || null,
        },
    ]
}

export function interpolateTokens(
    text: string,
    context: { userName?: string; orgName?: string; spaceName?: string }
): string {
    if (!text) return ""
    return text
        .replace(/\{user_name\}/gi, context.userName || "Usuario")
        .replace(/\{org_name\}/gi, context.orgName || "Tu Empresa")
        .replace(/\{space_name\}/gi, context.spaceName || "Pixy")
}

export function ShimmerText({
    children,
    active = false,
    className = "",
}: {
    children: React.ReactNode
    active?: boolean
    className?: string
}) {
    if (!active || !children) {
        return <>{children}</>
    }

    if (typeof children !== "string") {
        return <span className={cn("animate-text-shimmer", className)}>{children}</span>
    }

    // Aislar emoji o pictograma inicial para conservar sus colores nativos y aplicar shimmer al texto
    const emojiMatch = children.match(/^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*\s*)(.*)$/u)
    if (emojiMatch) {
        return (
            <span className={cn("inline-flex items-center gap-1.5", className)}>
                <span className="shrink-0">{emojiMatch[1]}</span>
                <span className="animate-text-shimmer">{emojiMatch[2]}</span>
            </span>
        )
    }

    return <span className={cn("animate-text-shimmer", className)}>{children}</span>
}

export function GlobalDashboardBanner({
    config,
    controlledSlideIndex,
    controlledIsPlaying = true,
    onSlideChange,
}: {
    config?: GlobalBannerConfig | null
    controlledSlideIndex?: number
    controlledIsPlaying?: boolean
    onSlideChange?: (index: number) => void
}) {
    const branding = useBranding()
    const [userContext, setUserContext] = useState<{ userName?: string; orgName?: string; spaceName?: string }>({})

    // Obtener sesión de usuario para tokens dinámicos
    useEffect(() => {
        let mounted = true
        const fetchUserData = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                if (mounted && session?.user) {
                    const meta = session.user.user_metadata
                    const name = meta?.first_name || meta?.full_name || meta?.name || ""
                    setUserContext(prev => ({
                        ...prev,
                        userName: name,
                    }))
                }
            } catch {
                // Silently ignore
            }
        }
        fetchUserData()
        return () => {
            mounted = false
        }
    }, [])

    // Normalizar diapositivas
    const allSlides = useMemo(() => normalizeBannerSlides(config), [config])

    // Filtrar diapositivas activas según vigencia (starts_at / expires_at)
    const activeSlides = useMemo(() => {
        const now = new Date().getTime()
        return allSlides.filter(slide => {
            if (slide.starts_at) {
                const start = new Date(slide.starts_at).getTime()
                if (now < start) return false
            }
            if (slide.expires_at) {
                const expiry = new Date(slide.expires_at).getTime()
                if (now > expiry) return false
            }
            return true
        })
    }, [allSlides])

    // Estados de reproducción
    const [internalSlideIndex, setInternalSlideIndex] = useState(0)
    const [phraseIndex, setPhraseIndex] = useState(0)
    const [isHovered, setIsHovered] = useState(false)
    const [animationData, setAnimationData] = useState<any>(null)
    const [animationLoading, setAnimationLoading] = useState(false)

    // Determinar slide activo (controlado desde fuera o interno)
    const slideIndex = typeof controlledSlideIndex === "number" ? controlledSlideIndex : internalSlideIndex
    const currentSlide = activeSlides[slideIndex] || activeSlides[0]

    // Notificar cambio de slide
    const changeSlide = (nextIndex: number) => {
        setInternalSlideIndex(nextIndex)
        setPhraseIndex(0)
        if (onSlideChange) onSlideChange(nextIndex)
    }

    // Temporizador y rotación de frases por diapositiva
    const phrasesCount = currentSlide?.phrases?.length || 1
    const currentDurationSec = currentSlide?.phrases?.[phraseIndex]?.durationSeconds || 6

    useEffect(() => {
        if (!controlledIsPlaying || isHovered || activeSlides.length === 0) return

        const timer = setTimeout(() => {
            if (phraseIndex < phrasesCount - 1) {
                // Siguiente frase dentro del mismo slide
                setPhraseIndex(prev => prev + 1)
            } else {
                // Se completaron las frases: pasar al siguiente slide
                const nextSlide = (slideIndex + 1) % activeSlides.length
                changeSlide(nextSlide)
            }
        }, currentDurationSec * 1000)

        return () => clearTimeout(timer)
    }, [slideIndex, phraseIndex, controlledIsPlaying, isHovered, currentDurationSec, phrasesCount, activeSlides.length])

    // Resetear frase al cambiar manualmente de diapositiva
    useEffect(() => {
        setPhraseIndex(0)
    }, [slideIndex])

    // Cargar animación Lottie con caché en memoria instantánea
    useEffect(() => {
        if (currentSlide?.media_type !== "json_lottie" || !currentSlide?.media_url) {
            setAnimationData(null)
            return
        }

        const url = currentSlide.media_url
        if (lottieCache.has(url)) {
            setAnimationData(lottieCache.get(url))
            setAnimationLoading(false)
            return
        }

        let isCurrent = true
        setAnimationLoading(true)

        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error("Failed to load Lottie JSON")
                return res.json()
            })
            .then(json => {
                lottieCache.set(url, json)
                if (isCurrent) {
                    setAnimationData(json)
                    setAnimationLoading(false)
                }
            })
            .catch(() => {
                if (isCurrent) {
                    setAnimationData(null)
                    setAnimationLoading(false)
                }
            })

        return () => {
            isCurrent = false
        }
    }, [currentSlide?.media_url, currentSlide?.media_type])

    if (!currentSlide || activeSlides.length === 0) return null

    // Interpolar variables dinámicas
    const resolvedTitle = interpolateTokens(currentSlide.title || "", userContext)
    const resolvedKicker = interpolateTokens(currentSlide.kicker || "", userContext)
    const resolvedSubtitle = interpolateTokens(currentSlide.subtitle || "", userContext)
    const currentPhraseText = currentSlide.phrases?.[phraseIndex]?.text || ""
    const resolvedPhrase = interpolateTokens(currentPhraseText, userContext)

    // =========================================================================
    // ESTILOS VISUALES & TEMAS (QUIRÚRGICO, SIN CONFLICTOS DE CONTRASTE)
    // =========================================================================
    const currentTheme: BannerTheme = currentSlide.theme || "auto"

    let bgClasses = ""
    let borderClasses = ""
    let titleClasses = ""
    let kickerClasses = ""
    let kickerBgClasses = ""
    let subtitleClasses = ""
    let descClasses = ""
    let defaultCtaVariant: "default" | "secondary" | "outline" = "default"

    if (currentTheme === "brand_primary") {
        // Marca Primario del Tenant (Color primario de Pixy o del tenant que renderiza)
        bgClasses = "glass-panel bg-gradient-to-br from-[var(--primary,#F205E2)]/15 via-[var(--primary,#F205E2)]/5 to-white/10 dark:to-zinc-950/20 backdrop-blur-xl shadow-xl text-gray-900 dark:text-white"
        borderClasses = "border border-[var(--primary,#F205E2)]/30"
        titleClasses = getTextColorClass(currentSlide.titleColor, "text-gray-900 dark:text-white")
        kickerClasses = getTextColorClass(currentSlide.kickerColor, "text-[var(--primary,#F205E2)]")
        kickerBgClasses = "bg-white/92 dark:bg-white/12 border border-black/[0.08] dark:border-white/20 shadow-2xs"
        subtitleClasses = getTextColorClass(currentSlide.subtitleColor, "text-gray-700 dark:text-gray-300")
        descClasses = getTextColorClass(currentSlide.phrasesColor, "text-gray-800 dark:text-gray-200")
        defaultCtaVariant = "default"
    } else if (currentTheme === "brand_secondary") {
        // Marca Secundario del Tenant (Cyan de Pixy o del tenant que renderiza)
        bgClasses = "glass-panel bg-gradient-to-br from-[var(--brand-cyan,#00E0FF)]/15 via-[var(--brand-cyan,#00E0FF)]/5 to-white/10 dark:to-zinc-950/20 backdrop-blur-xl shadow-xl text-gray-900 dark:text-white"
        borderClasses = "border border-[var(--brand-cyan,#00E0FF)]/30"
        titleClasses = getTextColorClass(currentSlide.titleColor, "text-gray-900 dark:text-white")
        kickerClasses = getTextColorClass(currentSlide.kickerColor, "text-[var(--brand-cyan,#00E0FF)]")
        kickerBgClasses = "bg-white/92 dark:bg-white/12 border border-black/[0.08] dark:border-white/20 shadow-2xs"
        subtitleClasses = getTextColorClass(currentSlide.subtitleColor, "text-gray-700 dark:text-gray-300")
        descClasses = getTextColorClass(currentSlide.phrasesColor, "text-gray-800 dark:text-gray-200")
        defaultCtaVariant = "secondary"
    } else if (currentTheme === "dark") {
        // Dark Forzado: Vidrio nocturno prémium forzado a ser oscuro tanto en light como dark mode
        bgClasses = "glass-panel bg-zinc-950/92 text-white backdrop-blur-2xl shadow-2xl"
        borderClasses = "border border-white/15"
        titleClasses = getTextColorClass(currentSlide.titleColor, "text-white")
        kickerClasses = getTextColorClass(currentSlide.kickerColor, "text-[var(--brand-cyan,#00E0FF)]")
        kickerBgClasses = "bg-white/12 border border-white/20 shadow-xs"
        subtitleClasses = getTextColorClass(currentSlide.subtitleColor, "text-zinc-300")
        descClasses = getTextColorClass(currentSlide.phrasesColor, "text-zinc-300")
        defaultCtaVariant = "secondary"
    } else if (currentTheme === "light") {
        // Light Forzado: Vidrio claro prémium forzado a ser nítido y claro tanto en light como dark mode
        bgClasses = "glass-panel bg-white/95 text-zinc-900 backdrop-blur-2xl shadow-xl"
        borderClasses = "border border-slate-200/90"
        titleClasses = getTextColorClass(currentSlide.titleColor, "text-zinc-900")
        kickerClasses = getTextColorClass(currentSlide.kickerColor, "text-[var(--brand-pink,#F205E2)]")
        kickerBgClasses = "bg-white border border-slate-200/90 shadow-2xs"
        subtitleClasses = getTextColorClass(currentSlide.subtitleColor, "text-zinc-700")
        descClasses = getTextColorClass(currentSlide.phrasesColor, "text-zinc-600")
        defaultCtaVariant = "default"
    } else {
        // "auto": Sigue dinámicamente el tema activo del tenant (dark / light)
        bgClasses = "glass-panel bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl shadow-xl text-gray-900 dark:text-white"
        borderClasses = "border border-black/10 dark:border-white/10"
        titleClasses = getTextColorClass(currentSlide.titleColor, "text-gray-900 dark:text-white")
        kickerClasses = getTextColorClass(currentSlide.kickerColor, "text-[var(--brand-pink,var(--primary,#F205E2))]")
        kickerBgClasses = "bg-white/92 dark:bg-white/12 border border-black/[0.08] dark:border-white/20 shadow-2xs"
        subtitleClasses = getTextColorClass(currentSlide.subtitleColor, "text-gray-600 dark:text-gray-300")
        descClasses = getTextColorClass(currentSlide.phrasesColor, "text-gray-700 dark:text-gray-300")
        defaultCtaVariant = "default"
    }

    // Alineación y Layout
    const isLeft = currentSlide.layout_pos === "left"
    const isCenter = currentSlide.layout_pos === "center"
    const isRight = !isLeft && !isCenter

    const textAlignment = isCenter ? "text-center items-center" : "text-left items-start"

    return (
        <Card
            className={`w-full h-[250px] relative overflow-hidden rounded-[30px] flex flex-col transition-all duration-500 ${bgClasses} ${borderClasses}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Indicadores de Diapositiva: Puntos (Dots) Sutiles y Limpios Centrados */}
            {activeSlides.length > 1 && (
                <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5">
                    {activeSlides.map((slide, idx) => {
                        const isCurrent = idx === slideIndex
                        return (
                            <button
                                key={slide.id || idx}
                                type="button"
                                onClick={() => changeSlide(idx)}
                                className={cn(
                                    "rounded-full transition-all duration-300 cursor-pointer",
                                    isCurrent
                                        ? "w-4 h-1.5 bg-[var(--primary,#F205E2)] shadow-xs"
                                        : "w-1.5 h-1.5 bg-black/25 dark:bg-white/30 hover:bg-black/50 dark:hover:bg-white/60"
                                )}
                                title={`Diapositiva ${idx + 1}`}
                            />
                        )
                    })}
                </div>
            )}

            {/* 3. Elemento Multimedia ABSOLUTO (Flush contra el borde, del tamaño de alto del banner = 250px) */}
            {currentSlide.media_url && (
                <div
                    className={cn(
                        "pointer-events-none z-10 overflow-hidden flex items-center select-none",
                        isCenter
                            ? "absolute inset-0 w-full h-full opacity-20 justify-center"
                            : isLeft
                            ? "absolute left-0 top-0 bottom-0 h-full w-[260px] sm:w-[320px] md:w-[380px] justify-start"
                            : "absolute right-0 top-0 bottom-0 h-full w-[260px] sm:w-[320px] md:w-[380px] justify-end"
                    )}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`media-${slideIndex}-${currentSlide.media_url}`}
                            initial={{ opacity: 0, scale: 0.92 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.92 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className={cn(
                                "flex items-center h-full w-full max-h-[250px]",
                                isCenter ? "justify-center" : isLeft ? "justify-start" : "justify-end"
                            )}
                        >
                            {currentSlide.media_type === "image" ? (
                                <img
                                    src={currentSlide.media_url}
                                    alt={resolvedTitle}
                                    className={cn(
                                        "h-full w-auto max-h-[250px] object-contain drop-shadow-2xl",
                                        isLeft ? "object-left" : isRight ? "object-right" : "object-center"
                                    )}
                                />
                            ) : (
                                animationData && (
                                    <Lottie
                                        animationData={animationData}
                                        loop={true}
                                        className={cn(
                                            "h-full w-auto max-h-[250px] aspect-square flex items-center drop-shadow-2xl",
                                            isLeft ? "justify-start" : isRight ? "justify-end" : "justify-center"
                                        )}
                                        style={{ height: "100%", maxHeight: "250px", width: "auto" }}
                                    />
                                )
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            )}

            {/* 4. Columna de Textos y Controles con Autolayout Vertical (Desacoplada y con espacio garantizado) */}
            <CardContent className="flex-1 w-full h-full min-h-0 p-6 sm:p-7 z-20 overflow-hidden flex flex-col justify-between">
                <div
                    className={cn(
                        "flex flex-col justify-between h-full min-h-0 z-20 overflow-visible relative w-full",
                        isCenter
                            ? "max-w-2xl mx-auto text-center items-center"
                            : isLeft
                            ? "ml-auto max-w-[55%] sm:max-w-[58%] lg:max-w-[62%] text-left items-start"
                            : "mr-auto max-w-[55%] sm:max-w-[58%] lg:max-w-[62%] text-left items-start"
                    )}
                >
                    {/* Bloque Superior: Kicker, Título y Subtítulo */}
                    <div className="flex flex-col shrink-0 w-full min-h-0">
                        {/* Kicker / Badge */}
                        {resolvedKicker && (
                            <motion.span
                                key={`kicker-${slideIndex}`}
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full w-fit mb-1.5 backdrop-blur-sm truncate ${kickerBgClasses} ${kickerClasses}`}
                            >
                                <ShimmerText active={Boolean(currentSlide.kicker_shimmer)}>
                                    {resolvedKicker}
                                </ShimmerText>
                            </motion.span>
                        )}

                        {/* Título Principal */}
                        <motion.h2
                            key={`title-${slideIndex}`}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className={`text-xl md:text-2xl font-black tracking-tight leading-tight shrink-0 drop-shadow-xs line-clamp-1 ${titleClasses}`}
                        >
                            {resolvedTitle}
                        </motion.h2>

                        {/* Subtítulo: Notoriamente más grande y grueso que las frases */}
                        {currentSlide.showSubtitle && resolvedSubtitle && (
                            <motion.p
                                key={`sub-${slideIndex}`}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, delay: 0.05 }}
                                className={`text-sm md:text-base font-bold tracking-tight line-clamp-1 mt-0.5 ${subtitleClasses}`}
                            >
                                {resolvedSubtitle}
                            </motion.p>
                        )}
                    </div>

                    {/* Bloque Central: Frases Rotativas con SplitText */}
                    <div className="my-auto min-h-[32px] max-h-[44px] relative w-full flex items-center overflow-hidden">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`phrase-${slideIndex}-${phraseIndex}`}
                                initial={{ y: 12, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -12, opacity: 0 }}
                                transition={{ duration: 0.35, ease: "easeOut" }}
                                className={`text-xs md:text-sm absolute w-full max-h-full font-medium whitespace-pre-line leading-snug overflow-hidden line-clamp-2 ${descClasses}`}
                                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                            >
                                <SplitText delay={0.03} duration={0.02}>
                                    {resolvedPhrase}
                                </SplitText>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Bloque Inferior: Botón CTA (Con clearance para hover:scale sin recortes) */}
                    {currentSlide.cta_text && (
                        <motion.div
                            key={`cta-${slideIndex}`}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                            className="shrink-0 pt-1 pb-1 px-1 -mx-1 overflow-visible"
                        >
                            <Link
                                href={currentSlide.cta_url || "#"}
                                target={currentSlide.cta_open_new_tab ? "_blank" : undefined}
                                rel={currentSlide.cta_open_new_tab ? "noopener noreferrer" : undefined}
                                className="inline-block overflow-visible"
                            >
                                <Button
                                    size="sm"
                                    className="rounded-xl shadow-xs transition-transform duration-200 hover:scale-105 active:scale-95 px-5 h-8 text-xs font-bold gap-2 cursor-pointer"
                                    variant={currentSlide.cta_variant || defaultCtaVariant}
                                >
                                    <ShimmerText active={Boolean(currentSlide.cta_shimmer)}>
                                        {currentSlide.cta_text}
                                    </ShimmerText>
                                    {currentSlide.cta_open_new_tab && <ExternalLink className="w-3 h-3 opacity-70 shrink-0" />}
                                </Button>
                            </Link>
                        </motion.div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
