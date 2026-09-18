"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale/es"
import { cn } from "@/modules/infrastructure/utils/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import {
    Loader2,
    Plus,
    Save,
    Trash2,
    Play,
    Pause,
    Copy,
    ArrowLeft,
    ArrowRight,
    Clock,
    Sparkles,
    Film,
    Image as ImageIcon,
    Target,
    Calendar as CalendarIcon,
    ExternalLink,
    X,
    Layers,
    Type,
    ChevronLeft,
    ChevronRight,
    MonitorPlay,
    CalendarDays,
    Infinity as InfinityIcon,
    Eye,
    Zap,
    Shield,
    BarChart,
    CheckCircle,
    Rocket,
    Bell,
    Users,
    Bot,
    Flame,
    Cpu
} from "lucide-react"

import { getGlobalBanners, upsertGlobalBanner, toggleBannerActive, deleteGlobalBanner } from "@/modules/core/admin/actions"
import {
    GlobalBannerConfig,
    GlobalBannerSlide,
    GlobalDashboardBanner,
    TextColorRole,
    BannerModalConfig,
    BannerModalFeature,
    normalizeBannerSlides
} from "@/modules/core/dashboard/components/global-dashboard-banner"
import { BannerSpotlightModal, renderFeatureIcon } from "@/modules/core/dashboard/components/banner-spotlight-modal"
import { LottieVisualPickerModal } from "./lottie-visual-picker-modal"
import lottieCatalog from "./lottie-catalog.json"

// Roles de color para texto compatibles con Dark y Light
const COLOR_ROLES: { value: TextColorRole; label: string; previewClass: string }[] = [
    { value: "default", label: "Auto", previewClass: "bg-gray-900 dark:bg-white border border-gray-400" },
    { value: "brand_primary", label: "Primario", previewClass: "bg-[var(--primary,#F205E2)]" },
    { value: "brand_secondary", label: "Secundario", previewClass: "bg-[var(--brand-cyan,#00E0FF)]" },
    { value: "muted", label: "Gris", previewClass: "bg-gray-400" },
    { value: "emerald", label: "Verde", previewClass: "bg-emerald-500" },
    { value: "amber", label: "Ámbar", previewClass: "bg-amber-500" },
    { value: "cyan", label: "Cyan", previewClass: "bg-cyan-400" },
    { value: "white", label: "Blanco", previewClass: "bg-white border border-gray-300" }
]

const FEATURE_ICON_OPTIONS = [
    { value: "Zap", label: "⚡ Automatización (Zap)" },
    { value: "Sparkles", label: "✨ Magia / IA (Sparkles)" },
    { value: "Shield", label: "🛡️ Seguridad (Shield)" },
    { value: "BarChart", label: "📊 Métricas (BarChart)" },
    { value: "CheckCircle", label: "✅ Aprobado (CheckCircle)" },
    { value: "Rocket", label: "🚀 Lanzamiento (Rocket)" },
    { value: "Bell", label: "🔔 Notificaciones (Bell)" },
    { value: "Users", label: "👥 Equipo (Users)" },
    { value: "Bot", label: "🤖 Agente IA (Bot)" },
    { value: "Layers", label: "🥞 Módulos (Layers)" },
    { value: "Flame", label: "🔥 Tendencia (Flame)" },
    { value: "Target", label: "🎯 Objetivos (Target)" },
    { value: "Cpu", label: "💻 Procesamiento (Cpu)" },
]

const DEFAULT_SLIDE: GlobalBannerSlide = {
    id: "slide-1",
    kicker: "NOVEDAD",
    kickerColor: "brand_primary",
    kicker_shimmer: true,
    title: "Bienvenido a {org_name}",
    titleColor: "default",
    subtitle: "Todo lo que necesitas para escalar tu operación hoy",
    subtitleColor: "muted",
    showSubtitle: true,
    phrases: [
        { text: "Explora tus herramientas de {space_name} en tiempo real", durationSeconds: 6 },
        { text: "Optimiza tus procesos y aumenta tu productividad", durationSeconds: 6 }
    ],
    phrasesColor: "default",
    cta_text: "Comenzar Ahora",
    cta_url: "/dashboard",
    cta_open_new_tab: false,
    cta_variant: "default",
    cta_shimmer: true,
    cta_action: "url",
    modal_config: {
        badge: "🚀 NOVEDAD",
        title: "Descubre esta nueva función en {space_name}",
        subtitle: "Acelera los resultados de tu equipo con herramientas diseñadas a tu medida.",
        media_type: "json_lottie",
        media_url: "",
        features: [
            { icon: "Zap", title: "Automatización Nativa", description: "Flujos de trabajo acelerados sin fricción manual" },
            { icon: "BarChart", title: "Métricas en Tiempo Real", description: "Visibilidad total del rendimiento de tu equipo" },
            { icon: "Shield", title: "Seguridad y Control", description: "Permisos granulares y registros de auditoría integrados" }
        ],
        primary_cta_text: "Probar Ahora",
        primary_cta_url: "/dashboard",
        primary_cta_shimmer: true,
        secondary_cta_text: "Cerrar",
        secondary_cta_url: ""
    },
    media_type: "json_lottie",
    media_url: "/animations/animated-office-workspace-desk-with-computer-and-b-2025-10-20-06-00-41-utc.json",
    layout_pos: "right",
    theme: "auto",
    starts_at: null,
    expires_at: null
}

const DEFAULT_BANNER: GlobalBannerConfig = {
    space_type: "all",
    is_active: false,
    starts_at: null,
    expires_at: null,
    slides: [{ ...DEFAULT_SLIDE }]
}

// Destinos principales de Red
const NETWORK_DESTINATIONS = [
    { value: "all", label: "🌐 Toda la Red (Global - Todos los Dashboards)" },
    { value: "reseller", label: "🤝 Red de Resellers & Aliados" }
]

/**
 * Componente Selector de Fecha & Hora Moderno con Radix Popover y Calendar
 */
function ModernDateTimePicker({
    value,
    onChange,
    placeholder = "Sin fecha (Inmediato)",
    label
}: {
    value: string | null | undefined
    onChange: (val: string | null) => void
    placeholder?: string
    label: string
}) {
    const [open, setOpen] = useState(false)

    const dateObj = useMemo(() => {
        if (!value) return undefined
        const d = new Date(value)
        return isNaN(d.getTime()) ? undefined : d
    }, [value])

    const [selectedDate, setSelectedDate] = useState<Date | undefined>(dateObj)
    const [hours, setHours] = useState<string>(dateObj ? String(dateObj.getHours()).padStart(2, "0") : "09")
    const [minutes, setMinutes] = useState<string>(dateObj ? String(dateObj.getMinutes()).padStart(2, "0") : "00")

    useEffect(() => {
        if (dateObj) {
            setSelectedDate(dateObj)
            setHours(String(dateObj.getHours()).padStart(2, "0"))
            setMinutes(String(dateObj.getMinutes()).padStart(2, "0"))
        } else {
            setSelectedDate(undefined)
        }
    }, [dateObj])

    const applyChange = (day: Date | undefined, h: string, m: string) => {
        if (!day) {
            onChange(null)
            return
        }
        const updated = new Date(day)
        updated.setHours(parseInt(h, 10) || 0)
        updated.setMinutes(parseInt(m, 10) || 0)
        updated.setSeconds(0)
        onChange(updated.toISOString())
    }

    const handleSelectDay = (day: Date | undefined) => {
        setSelectedDate(day)
        if (day) {
            applyChange(day, hours, minutes)
        } else {
            onChange(null)
        }
    }

    const handleHours = (h: string) => {
        setHours(h)
        if (selectedDate) applyChange(selectedDate, h, minutes)
    }

    const handleMinutes = (m: string) => {
        setMinutes(m)
        if (selectedDate) applyChange(selectedDate, hours, m)
    }

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedDate(undefined)
        onChange(null)
        setOpen(false)
    }

    return (
        <div className="space-y-1 min-w-[200px]">
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <CalendarIcon className="w-3 h-3 text-primary" />
                {label}
            </span>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <div
                        className={cn(
                            "h-9 px-3 rounded-xl border text-xs flex items-center justify-between gap-2 cursor-pointer transition-all select-none shadow-2xs",
                            dateObj
                                ? "bg-primary/5 border-primary/40 text-foreground font-medium hover:border-primary"
                                : "bg-white dark:bg-zinc-900 border-input text-muted-foreground hover:bg-slate-50 dark:hover:bg-zinc-800"
                        )}
                    >
                        <div className="flex items-center gap-2 truncate">
                            <span className="truncate font-mono">
                                {dateObj
                                    ? format(dateObj, "d MMM yyyy, HH:mm", { locale: es })
                                    : placeholder}
                            </span>
                        </div>

                        {dateObj ? (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="p-0.5 rounded-full hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/50 text-muted-foreground transition-colors shrink-0"
                                title="Borrar fecha"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        ) : (
                            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                        )}
                    </div>
                </PopoverTrigger>

                <PopoverContent
                    className="w-auto p-3 z-50 bg-white dark:bg-zinc-950 border shadow-2xl rounded-2xl"
                    align="start"
                >
                    <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleSelectDay}
                        initialFocus
                    />

                    <div className="flex items-center justify-between pt-2.5 mt-2 border-t text-xs gap-2">
                        <span className="text-muted-foreground font-medium flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-primary" /> Hora:
                        </span>
                        <div className="flex items-center gap-1 font-mono">
                            <Select value={hours} onValueChange={handleHours}>
                                <SelectTrigger className="h-7 w-[56px] text-xs px-1.5">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                    {Array.from({ length: 24 }).map((_, i) => {
                                        const val = String(i).padStart(2, "0")
                                        return <SelectItem key={val} value={val} className="text-xs">{val}</SelectItem>
                                    })}
                                </SelectContent>
                            </Select>
                            <span>:</span>
                            <Select value={minutes} onValueChange={handleMinutes}>
                                <SelectTrigger className="h-7 w-[56px] text-xs px-1.5">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                    {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map(val => (
                                        <SelectItem key={val} value={val} className="text-xs">{val}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px] px-2 text-muted-foreground hover:text-red-500"
                            onClick={handleClear}
                        >
                            Limpiar
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}

/**
 * Calcula y genera el estado de visibilidad dinámico en vivo
 */
function getCampaignVisibilityStatus(
    isActive: boolean,
    startsAt: string | null | undefined,
    expiresAt: string | null | undefined
) {
    if (!isActive) {
        return {
            badge: "Borrador Oculto",
            message: "El banner está apagado manualmente. Ningún usuario lo visualizará.",
            dotColor: "bg-zinc-400",
            pillClasses: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700"
        }
    }

    const now = Date.now()
    const startMs = startsAt ? new Date(startsAt).getTime() : null
    const expireMs = expiresAt ? new Date(expiresAt).getTime() : null

    if (expireMs && now > expireMs) {
        const formattedEnd = format(new Date(expireMs), "d MMM yyyy, HH:mm", { locale: es })
        return {
            badge: "Campaña Expirada",
            message: `Finalizó el ${formattedEnd}. El banner se encuentra oculto automáticamente.`,
            dotColor: "bg-red-500",
            pillClasses: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/50"
        }
    }

    if (startMs && now < startMs) {
        const formattedStart = format(new Date(startMs), "d MMM yyyy, HH:mm", { locale: es })
        return {
            badge: "Programado a Futuro",
            message: `Oculto actualmente. Se activará automáticamente el ${formattedStart}.`,
            dotColor: "bg-amber-500 animate-pulse",
            pillClasses: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50"
        }
    }

    if (expireMs) {
        const formattedEnd = format(new Date(expireMs), "d MMM yyyy, HH:mm", { locale: es })
        return {
            badge: "En Emisión Activa",
            message: `Visible actualmente para los usuarios. Concluirá el ${formattedEnd}.`,
            dotColor: "bg-emerald-500 animate-ping",
            pillClasses: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50"
        }
    }

    return {
        badge: "Visible Permanente",
        message: "Visible de forma continua e indefinida (sin fecha de vencimiento).",
        dotColor: "bg-emerald-500",
        pillClasses: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50"
    }
}

export function GlobalBannersManager({ apps = [] }: { apps?: any[] }) {
    const [banners, setBanners] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isLottiePickerOpen, setIsLottiePickerOpen] = useState(false)
    const [isModalLottiePickerOpen, setIsModalLottiePickerOpen] = useState(false)
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)

    // Formulario del banner y diapositiva activa
    const [formData, setFormData] = useState<GlobalBannerConfig>(DEFAULT_BANNER)
    const [activeSlideIdx, setActiveSlideIdx] = useState(0)
    const [isPristine, setIsPristine] = useState(true)

    // Modo de vigencia de campaña: Permanente o Programada
    const hasAnySchedule = Boolean(formData.starts_at || formData.expires_at)
    const [scheduleModeActive, setScheduleModeActive] = useState<boolean>(false)

    // Sincronizar scheduleModeActive si el banner cargado tiene fechas
    useEffect(() => {
        if (hasAnySchedule) {
            setScheduleModeActive(true)
        }
    }, [hasAnySchedule])

    // Controles de previsualización en vivo
    const [previewIsPlaying, setPreviewIsPlaying] = useState(false)
    const [previewSlideIdx, setPreviewSlideIdx] = useState(0)
    const [focusedField, setFocusedField] = useState<string>("title")

    const insertTokenToActiveField = (token: string) => {
        if (focusedField === "subtitle") {
            updateCurrentSlide({ subtitle: (currentSlide.subtitle || "") + ` ${token}` })
        } else if (focusedField.startsWith("phrase-")) {
            const pIdx = parseInt(focusedField.replace("phrase-", ""), 10)
            const currentPhrases = currentSlide.phrases || []
            if (currentPhrases[pIdx]) {
                handleUpdatePhrase(pIdx, (currentPhrases[pIdx].text || "") + ` ${token}`)
            }
        } else {
            updateCurrentSlide({ title: (currentSlide.title || "") + ` ${token}` })
        }
        toast.info(`Variable ${token} agregada`)
    }

    // Spaces registrados en SaaS Engine
    const saasEngineSpaces = useMemo(() => {
        return (apps || [])
            .filter(app => app && app.is_active !== false)
            .map(app => {
                const spaceKey = app.space_category || app.category || app.slug || app.id
                return {
                    value: spaceKey,
                    label: `📦 ${app.name}`,
                    slug: app.slug,
                    appId: app.id
                }
            })
            .filter(s => !NETWORK_DESTINATIONS.some(n => n.value === s.value))
    }, [apps])

    const allDestinations = useMemo(() => {
        return [...NETWORK_DESTINATIONS, ...saasEngineSpaces]
    }, [saasEngineSpaces])

    const getDestinationLabel = (val?: string) => {
        if (!val) return "Sin Destino"
        const found = allDestinations.find(d => d.value === val)
        return found ? found.label : `🎯 ${val} (Personalizado)`
    }

    const slidesList = useMemo(() => {
        return normalizeBannerSlides(formData)
    }, [formData])

    const safeSlideIdx = Math.min(activeSlideIdx, Math.max(0, slidesList.length - 1))
    const currentSlide: GlobalBannerSlide = slidesList[safeSlideIdx] || DEFAULT_SLIDE

    // Duración total calculada del slide actual
    const currentSlideTotalDuration = useMemo(() => {
        if (!currentSlide || !currentSlide.phrases) return 0
        return currentSlide.phrases.reduce((acc, p) => acc + (Number(p.durationSeconds) || 6), 0)
    }, [currentSlide])

    const selectedLottieItem = useMemo(() => {
        if (!currentSlide?.media_url) return null
        return (lottieCatalog as any[]).find(item => item.value === currentSlide.media_url)
    }, [currentSlide?.media_url])

    useEffect(() => {
        loadBanners()
    }, [])

    useEffect(() => {
        if (!previewIsPlaying) {
            setPreviewSlideIdx(safeSlideIdx)
        }
    }, [safeSlideIdx, previewIsPlaying])

    const loadBanners = async () => {
        setLoading(true)
        const data = await getGlobalBanners()
        setBanners(data)
        setLoading(false)
    }

    const handleSelectBanner = (bannerId: string) => {
        if (bannerId === "new") {
            setFormData(DEFAULT_BANNER)
            setActiveSlideIdx(0)
            setIsPristine(false)
            setScheduleModeActive(false)
            return
        }
        const found = banners.find(b => b.id === bannerId)
        if (found) {
            const normalized = normalizeBannerSlides(found)
            setFormData({
                ...found,
                slides: normalized,
                starts_at: found.starts_at || null,
                expires_at: found.expires_at || null
            })
            setActiveSlideIdx(0)
            setIsPristine(false)
            setScheduleModeActive(Boolean(found.starts_at || found.expires_at))
        }
    }

    const handleSpaceChange = (newSpaceType: string) => {
        const existing = banners.find(b => b.space_type === newSpaceType)
        if (existing) {
            const normalized = normalizeBannerSlides(existing)
            setFormData({
                ...existing,
                slides: normalized,
                starts_at: existing.starts_at || null,
                expires_at: existing.expires_at || null
            })
            setActiveSlideIdx(0)
            setIsPristine(false)
            setScheduleModeActive(Boolean(existing.starts_at || existing.expires_at))
            toast.info(`Cargando configuración de "${getDestinationLabel(newSpaceType)}"`)
        } else {
            setFormData(prev => ({ ...prev, space_type: newSpaceType }))
        }
    }

    const updateCurrentSlide = (patch: Partial<GlobalBannerSlide>) => {
        const newSlides = [...slidesList]
        newSlides[safeSlideIdx] = {
            ...newSlides[safeSlideIdx],
            ...patch
        }
        setFormData(prev => ({
            ...prev,
            slides: newSlides
        }))
    }

    const handleAddSlide = () => {
        if (slidesList.length >= 5) {
            toast.error("Máximo 5 diapositivas permitidas")
            return
        }
        const newSlide: GlobalBannerSlide = {
            ...DEFAULT_SLIDE,
            id: `slide-${Date.now()}`,
            title: `Nueva Diapositiva ${slidesList.length + 1}`,
            phrases: [{ text: "Mensaje dinámico de la diapositiva", durationSeconds: 6 }]
        }
        const newSlides = [...slidesList, newSlide]
        setFormData(prev => ({ ...prev, slides: newSlides }))
        setActiveSlideIdx(newSlides.length - 1)
        toast.success(`Diapositiva ${newSlides.length} creada`)
    }

    const handleDuplicateSlide = (idx: number) => {
        if (slidesList.length >= 5) {
            toast.error("Límite de 5 diapositivas alcanzado")
            return
        }
        const target = slidesList[idx]
        const duplicated: GlobalBannerSlide = {
            ...target,
            id: `slide-${Date.now()}`,
            title: `${target.title} (Copia)`
        }
        const newSlides = [...slidesList]
        newSlides.splice(idx + 1, 0, duplicated)
        setFormData(prev => ({ ...prev, slides: newSlides }))
        setActiveSlideIdx(idx + 1)
        toast.success("Diapositiva duplicada")
    }

    const handleDeleteSlide = (idx: number) => {
        if (slidesList.length <= 1) {
            toast.error("El banner requiere al menos 1 diapositiva")
            return
        }
        const newSlides = slidesList.filter((_, i) => i !== idx)
        setFormData(prev => ({ ...prev, slides: newSlides }))
        setActiveSlideIdx(Math.max(0, idx - 1))
        toast.info("Diapositiva eliminada")
    }

    const handleMoveSlide = (idx: number, direction: "left" | "right") => {
        const targetIdx = direction === "left" ? idx - 1 : idx + 1
        if (targetIdx < 0 || targetIdx >= slidesList.length) return

        const newSlides = [...slidesList]
        const [moved] = newSlides.splice(idx, 1)
        newSlides.splice(targetIdx, 0, moved)
        setFormData(prev => ({ ...prev, slides: newSlides }))
        setActiveSlideIdx(targetIdx)
    }

    const handleAddPhrase = () => {
        const phrases = [...(currentSlide.phrases || [])]
        phrases.push({ text: "", durationSeconds: 6 })
        updateCurrentSlide({ phrases })
    }

    const handleUpdatePhrase = (phraseIdx: number, text: string, durationSeconds?: number) => {
        const phrases = [...(currentSlide.phrases || [])]
        if (!phrases[phraseIdx]) return
        phrases[phraseIdx] = {
            text,
            durationSeconds: typeof durationSeconds === "number" ? durationSeconds : phrases[phraseIdx].durationSeconds || 6
        }
        updateCurrentSlide({ phrases })
    }

    const handleRemovePhrase = (phraseIdx: number) => {
        const phrases = [...(currentSlide.phrases || [])]
        if (phrases.length <= 1) {
            toast.error("Debe haber al menos 1 frase")
            return
        }
        phrases.splice(phraseIdx, 1)
        updateCurrentSlide({ phrases })
    }

    const updateModalConfig = (patch: Partial<BannerModalConfig>) => {
        const currentModal = currentSlide.modal_config || {
            badge: currentSlide.kicker || "🚀 NOVEDAD",
            title: currentSlide.title || "Conoce esta nueva función",
            subtitle: currentSlide.subtitle || "",
            media_type: currentSlide.media_type || "json_lottie",
            media_url: currentSlide.media_url || "",
            features: [
                { icon: "Zap", title: "Automatización Nativa", description: "Flujos acelerados sin fricción manual" },
                { icon: "BarChart", title: "Métricas en Tiempo Real", description: "Visibilidad total del rendimiento de tu equipo" }
            ],
            primary_cta_text: "Probar Ahora",
            primary_cta_url: currentSlide.cta_url || "/dashboard",
            primary_cta_shimmer: true,
            secondary_cta_text: "Cerrar",
            secondary_cta_url: ""
        }
        updateCurrentSlide({
            modal_config: {
                ...currentModal,
                ...patch
            }
        })
    }

    const handleAddModalFeature = () => {
        const currentModal: Partial<BannerModalConfig> = currentSlide.modal_config || {}
        const features = [...(currentModal.features || [])]
        if (features.length >= 4) {
            toast.error("Máximo 4 características recomendadas en el modal")
            return
        }
        features.push({
            icon: "Sparkles",
            title: "Nueva Capacidad",
            description: "Descripción concisa del beneficio o funcionalidad"
        })
        updateModalConfig({ features })
    }

    const handleUpdateModalFeature = (idx: number, patch: Partial<BannerModalFeature>) => {
        const currentModal: Partial<BannerModalConfig> = currentSlide.modal_config || {}
        const features = [...(currentModal.features || [])]
        if (!features[idx]) return
        features[idx] = { ...features[idx], ...patch }
        updateModalConfig({ features })
    }

    const handleRemoveModalFeature = (idx: number) => {
        const currentModal: Partial<BannerModalConfig> = currentSlide.modal_config || {}
        const features = [...(currentModal.features || [])]
        if (features.length <= 1) {
            toast.error("El modal debe tener al menos 1 característica")
            return
        }
        features.splice(idx, 1)
        updateModalConfig({ features })
    }

    const applyPreset = (type: "launch" | "tip" | "promo" | "notice") => {
        let presetData: Partial<GlobalBannerSlide> = {}

        if (type === "launch") {
            presetData = {
                kicker: "🚀 NUEVO LANZAMIENTO",
                kickerColor: "cyan",
                kicker_shimmer: true,
                title: "Descubre la nueva función de {space_name}",
                titleColor: "default",
                showSubtitle: true,
                subtitle: "Diseñada especialmente para potenciar el crecimiento de {org_name}",
                subtitleColor: "muted",
                phrases: [
                    { text: "Flujos de trabajo acelerados con automatización nativa", durationSeconds: 6 },
                    { text: "Métricas en tiempo real con reportes de alto rendimiento", durationSeconds: 6 }
                ],
                phrasesColor: "cyan",
                cta_text: "Conocer Novedad",
                cta_url: "/dashboard",
                cta_variant: "default",
                cta_shimmer: true,
                cta_action: "modal",
                modal_config: {
                    badge: "🚀 NUEVA CARACTERÍSTICA",
                    title: "Potencia tu operativa en {space_name}",
                    subtitle: "Un conjunto de herramientas inteligentes diseñadas para acelerar tus flujos y maximizar la conversión.",
                    media_type: "json_lottie",
                    media_url: "/animations/business-goal-achievement-and-target-success-2025-10-20-06-18-35-utc.json",
                    features: [
                        { icon: "Zap", title: "Automatización Nativa", description: "Ejecuta tareas repetitivas en segundos sin intervención manual." },
                        { icon: "BarChart", title: "Métricas en Tiempo Real", description: "Tableros analíticos e informes detallados de rendimiento." },
                        { icon: "Shield", title: "Seguridad y Control Total", description: "Permisos granulares por rol y registros de auditoría integrados." }
                    ],
                    primary_cta_text: "Probar Módulo Ahora",
                    primary_cta_url: "/dashboard",
                    primary_cta_shimmer: true,
                    secondary_cta_text: "Ver Documentación",
                    secondary_cta_url: "/docs"
                },
                theme: "brand_primary",
                media_type: "json_lottie",
                media_url: "/animations/business-goal-achievement-and-target-success-2025-10-20-06-18-35-utc.json",
                layout_pos: "right"
            }
            toast.success("Plantilla 'Lanzamiento' aplicada con Modal Cover")
        } else if (type === "tip") {
            presetData = {
                kicker: "💡 CONSEJO PRO",
                kickerColor: "amber",
                kicker_shimmer: true,
                title: "Aumenta la retención de tus clientes",
                titleColor: "default",
                showSubtitle: true,
                subtitle: "Un tip rápido para los administradores de {org_name}",
                subtitleColor: "muted",
                phrases: [
                    { text: "Paso 1: Configura alertas inmediatas en tu bandeja de entrada", durationSeconds: 5 },
                    { text: "Paso 2: Responde cotizaciones en menos de 15 minutos", durationSeconds: 5 },
                    { text: "Paso 3: Automatiza el seguimiento con recordatorios de WhatsApp", durationSeconds: 6 }
                ],
                phrasesColor: "amber",
                cta_text: "Ver Guía Paso a Paso",
                cta_url: "/knowledge",
                cta_variant: "secondary",
                cta_shimmer: true,
                theme: "brand_secondary",
                media_type: "json_lottie",
                media_url: "/animations/animated-data-presentation-woman-explaining-chart-2025-10-20-06-25-36-utc.json",
                layout_pos: "right"
            }
            toast.success("Plantilla 'Pro Tip' aplicada a este slide")
        } else if (type === "promo") {
            presetData = {
                kicker: "🎁 OFERTA EXCLUSIVA",
                kickerColor: "emerald",
                kicker_shimmer: true,
                title: "Desbloquea el potencial completo",
                titleColor: "emerald",
                showSubtitle: true,
                subtitle: "Aprovecha beneficios preferenciales para {org_name} este mes",
                subtitleColor: "default",
                phrases: [
                    { text: "Acceso a módulos prémium y soporte prioritario 24/7", durationSeconds: 5 },
                    { text: "Integración ilimitada con pasarelas de pago y CRM", durationSeconds: 5 }
                ],
                phrasesColor: "emerald",
                cta_text: "Mejorar Mi Plan",
                cta_url: "/billing",
                cta_variant: "default",
                cta_shimmer: true,
                theme: "dark",
                media_type: "json_lottie",
                media_url: "/animations/big-sale-tag-animation-2025-10-20-04-33-47-utc.json",
                layout_pos: "right"
            }
            toast.success("Plantilla 'Promoción' aplicada a este slide")
        } else if (type === "notice") {
            presetData = {
                kicker: "⚠️ AVISO OPERATIVO",
                kickerColor: "amber",
                kicker_shimmer: false,
                title: "Mantenimiento Programado",
                titleColor: "default",
                showSubtitle: true,
                subtitle: "Actualización de infraestructura para mayor velocidad",
                subtitleColor: "muted",
                phrases: [
                    { text: "Fecha: Este domingo de 02:00 a 04:00 AM", durationSeconds: 7 },
                    { text: "Tu información y backups están 100% seguros y respaldados", durationSeconds: 7 }
                ],
                phrasesColor: "muted",
                cta_text: "Estado del Sistema",
                cta_url: "/status",
                cta_variant: "outline",
                cta_shimmer: false,
                theme: "light",
                media_type: "json_lottie",
                media_url: "/animations/cartoon-calendar-illustration-2025-10-20-02-24-50-utc.json",
                layout_pos: "right"
            }
            toast.success("Plantilla 'Aviso Operativo' aplicada a este slide")
        }

        updateCurrentSlide(presetData)
    }

    const handleSave = async () => {
        if (!formData.space_type) {
            toast.error("El Destino (Space) es obligatorio")
            return
        }

        if (slidesList.length === 0) {
            toast.error("Debes incluir al menos una diapositiva")
            return
        }

        for (let i = 0; i < slidesList.length; i++) {
            const slide = slidesList[i]
            if (!slide.title?.trim()) {
                toast.error(`La Diapositiva ${i + 1} requiere un título`)
                setActiveSlideIdx(i)
                return
            }
            const cleanPhrases = (slide.phrases || []).filter(p => p.text?.trim() !== "")
            if (cleanPhrases.length === 0) {
                toast.error(`La Diapositiva ${i + 1} debe tener al menos una frase con texto`)
                setActiveSlideIdx(i)
                return
            }
        }

        setSaving(true)
        const payload = {
            ...formData,
            slides: slidesList
        }

        const res = await upsertGlobalBanner(payload)
        if (res.success) {
            toast.success("Secuencia de banner guardada exitosamente")
            await loadBanners()
            if ("data" in res && res.data) {
                const normalized = normalizeBannerSlides(res.data)
                setFormData({
                    ...res.data,
                    slides: normalized
                })
            }
        } else {
            toast.error(res.error || "Error al guardar el banner")
        }
        setSaving(false)
    }

    const handleToggleActive = async (banner: any) => {
        const res = await toggleBannerActive(banner.id, banner.space_type, !banner.is_active)
        if (res.success) {
            toast.success(`Banner ${!banner.is_active ? "activado" : "desactivado"}`)
            await loadBanners()
            if (formData.id === banner.id) {
                setFormData(prev => ({ ...prev, is_active: !banner.is_active }))
            }
        } else {
            toast.error("Error al actualizar estado")
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro que deseas eliminar este banner permanentemente?")) return
        const res = await deleteGlobalBanner(id)
        if (res.success) {
            toast.success("Banner eliminado")
            if (formData.id === id) setFormData(DEFAULT_BANNER)
            loadBanners()
        } else {
            toast.error("Error al eliminar")
        }
    }

    const resetToPermanent = () => {
        setFormData(prev => ({
            ...prev,
            starts_at: null,
            expires_at: null
        }))
        setScheduleModeActive(false)
        toast.info("Campaña configurada como permanente (sin vencimiento)")
    }

    const visibilityStatus = getCampaignVisibilityStatus(
        formData.is_active || false,
        formData.starts_at,
        formData.expires_at
    )

    if (loading && banners.length === 0) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <TooltipProvider delayDuration={200}>
            <div className="space-y-6 w-full max-w-7xl mx-auto pb-16">

                {/* ========================================================================= */}
                {/* 1. BARRA SUPERIOR UNIFICADA DE CONTROL Y CAMPAÑA (Compacta, De Lado a Lado) */}
                {/* ========================================================================= */}
                <div className="rounded-2xl border shadow-sm bg-white dark:bg-zinc-950 p-4 sm:p-5 space-y-4">
                    {/* Fila A: Título, Selector de Banner, Estado y Guardar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-border/50">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <Layers className="h-4 w-4" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
                                        Gestor de Banners Multi-Slide
                                    </h2>
                                </div>
                            </div>

                            {/* Selector de Banner a editar */}
                            <Select
                                value={formData.id || (isPristine ? "" : "new")}
                                onValueChange={handleSelectBanner}
                            >
                                <SelectTrigger className="w-[280px] sm:w-[320px] max-w-full h-8 text-xs bg-slate-50 dark:bg-zinc-900 whitespace-nowrap overflow-hidden">
                                    <SelectValue placeholder="Seleccionar banner a editar" />
                                </SelectTrigger>
                                <SelectContent className="max-w-[420px]">
                                    <SelectItem value="new" className="font-bold text-primary">
                                        <span className="flex items-center whitespace-nowrap">
                                            <Plus className="w-3.5 h-3.5 mr-1.5 shrink-0" /> Configurar Nuevo Destino
                                        </span>
                                    </SelectItem>
                                    {banners.map(b => {
                                        const bSlides = normalizeBannerSlides(b)
                                        return (
                                            <SelectItem key={b.id} value={b.id} className="text-xs">
                                                <div className="flex items-center gap-2 w-full min-w-0">
                                                    <div className={`w-2 h-2 rounded-full shrink-0 ${b.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                                                    <span className="truncate min-w-0 font-medium">{b.title}</span>
                                                    <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap shrink-0 ml-auto pl-1">
                                                        [{b.space_type} · {bSlides.length}]
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        )
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Controles de Publicación y Guardar */}
                        <div className="flex items-center gap-2.5 ml-auto lg:ml-0">
                            {/* Toggle Estado */}
                            <div className="flex items-center gap-2 px-3 h-8 rounded-xl border bg-slate-50/80 dark:bg-zinc-900/60">
                                <span className="text-[11px] font-semibold text-muted-foreground">
                                    {formData.is_active ? "🟢 En Vivo" : "⚪ Borrador"}
                                </span>
                                <Switch
                                    checked={formData.is_active}
                                    onCheckedChange={c => {
                                        if (formData.id) {
                                            handleToggleActive(formData)
                                        } else {
                                            setFormData(prev => ({ ...prev, is_active: c }))
                                        }
                                    }}
                                    className="scale-90"
                                />
                            </div>

                            {formData.id && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600 border-red-200 dark:border-red-950"
                                            onClick={() => handleDelete(formData.id!)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Eliminar banner permanentemente</TooltipContent>
                                </Tooltip>
                            )}

                            <Button
                                onClick={handleSave}
                                disabled={saving}
                                className="h-8 px-4 text-xs font-bold gap-2 shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                Guardar Cambios
                            </Button>
                        </div>
                    </div>

                    {/* Fila B: Destino, Modalidad de Campaña, Fechas y Estado Dinámico en Tiempo Real */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        {/* Selector de Destino */}
                        <div className="space-y-1 min-w-[220px]">
                            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                                🎯 Destino (Space / Industria)
                            </span>
                            <Select value={formData.space_type} onValueChange={handleSpaceChange}>
                                <SelectTrigger className="h-9 text-xs bg-slate-50 dark:bg-zinc-900">
                                    <SelectValue placeholder="Seleccionar destino" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {NETWORK_DESTINATIONS.map(d => (
                                        <SelectItem key={d.value} value={d.value} className="font-semibold text-xs">
                                            {d.label}
                                        </SelectItem>
                                    ))}
                                    {saasEngineSpaces.length > 0 && (
                                        <>
                                            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-t mt-1 pt-1.5">
                                                Spaces SaaS Engine
                                            </div>
                                            {saasEngineSpaces.map(space => (
                                                <SelectItem key={space.value} value={space.value} className="text-xs">
                                                    {space.label}
                                                </SelectItem>
                                            ))}
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Modalidad de Vigencia: Permanente vs Programada */}
                        <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3 text-primary" /> Modalidad de Emisión
                            </span>
                            <div className="flex items-center gap-1.5 p-0.5 rounded-xl border bg-slate-100 dark:bg-zinc-900">
                                <button
                                    type="button"
                                    onClick={resetToPermanent}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                                        !scheduleModeActive && !hasAnySchedule
                                            ? "bg-white dark:bg-zinc-800 text-primary shadow-xs"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <InfinityIcon className="w-3.5 h-3.5" />
                                    <span>Permanente (Sin Vencimiento)</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setScheduleModeActive(true)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                                        scheduleModeActive || hasAnySchedule
                                            ? "bg-white dark:bg-zinc-800 text-primary shadow-xs"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <CalendarDays className="w-3.5 h-3.5" />
                                    <span>Programar Fechas</span>
                                </button>
                            </div>
                        </div>

                        {/* Selectores de Fechas Modernos (Si se elige modo Programado) */}
                        {(scheduleModeActive || hasAnySchedule) && (
                            <div className="flex flex-wrap items-center gap-3 animate-in fade-in duration-200">
                                <ModernDateTimePicker
                                    label="Inicio (Opcional)"
                                    placeholder="Inmediato al guardar"
                                    value={formData.starts_at}
                                    onChange={val => setFormData(prev => ({ ...prev, starts_at: val }))}
                                />
                                <ModernDateTimePicker
                                    label="Caducidad (Opcional)"
                                    placeholder="Sin fin / Permanente"
                                    value={formData.expires_at}
                                    onChange={val => setFormData(prev => ({ ...prev, expires_at: val }))}
                                />
                            </div>
                        )}

                        {/* Pill de Visibilidad Dinámico en Vivo */}
                        <div className="flex flex-col justify-end space-y-1 ml-auto">
                            <span className="text-[11px] font-semibold text-muted-foreground">
                                Regla de Visibilidad en Vivo
                            </span>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className={cn(
                                        "h-9 px-3 rounded-xl border text-xs flex items-center gap-2 cursor-help transition-all shadow-2xs font-semibold",
                                        visibilityStatus.pillClasses
                                    )}>
                                        <div className={cn("w-2 h-2 rounded-full shrink-0", visibilityStatus.dotColor)} />
                                        <span>{visibilityStatus.badge}</span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs text-xs p-3 font-normal leading-relaxed">
                                    <p className="font-bold mb-1">Condición de Despliegue:</p>
                                    {visibilityStatus.message}
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                </div>


                {/* ========================================================================= */}
                {/* 2. BARRA MULTITAB DE DIAPOSITIVAS & ACCIONES (Línea Horizontal Slim)      */}
                {/* ========================================================================= */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-950 p-2.5 px-4 rounded-2xl border shadow-sm">
                    {/* Pestañas de Diapositivas */}
                    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                        {slidesList.map((slide, idx) => {
                            const isSelected = idx === safeSlideIdx
                            const slideDuration = (slide.phrases || []).reduce(
                                (acc, p) => acc + (Number(p.durationSeconds) || 6),
                                0
                            )
                            return (
                                <button
                                    key={slide.id || idx}
                                    type="button"
                                    onClick={() => {
                                        setActiveSlideIdx(idx)
                                        setPreviewSlideIdx(idx)
                                    }}
                                    className={cn(
                                        "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer",
                                        isSelected
                                            ? "bg-primary text-primary-foreground shadow-xs"
                                            : "bg-slate-100 dark:bg-zinc-900 text-foreground hover:bg-slate-200 dark:hover:bg-zinc-800"
                                    )}
                                >
                                    <span>Diapositiva {idx + 1}</span>
                                    <span className={cn(
                                        "text-[10px] font-mono px-1.5 py-0.2 rounded-full",
                                        isSelected ? "bg-black/25 text-white" : "bg-black/10 dark:bg-white/10"
                                    )}>
                                        {slideDuration}s
                                    </span>
                                </button>
                            )
                        })}

                        {slidesList.length < 5 && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleAddSlide}
                                        className="h-7 px-2.5 text-xs text-primary hover:bg-primary/10 gap-1 rounded-xl"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Nueva</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Añadir nueva diapositiva (hasta 5)</TooltipContent>
                            </Tooltip>
                        )}
                    </div>

                    {/* Acciones de Diapositiva & Menú de Plantillas */}
                    <div className="flex items-center gap-1.5 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs gap-1.5 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-semibold rounded-xl"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Plantillas</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 text-xs">
                                <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground uppercase">
                                    Cargar Plantilla en Slide {safeSlideIdx + 1}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => applyPreset("launch")} className="gap-2 cursor-pointer">
                                    <span>🚀</span>
                                    <div>
                                        <div className="font-semibold">Lanzamiento de Feature</div>
                                        <div className="text-[10px] text-muted-foreground">Nueva funcionalidad en la app</div>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => applyPreset("tip")} className="gap-2 cursor-pointer">
                                    <span>💡</span>
                                    <div>
                                        <div className="font-semibold">Pro Tip de Operación</div>
                                        <div className="text-[10px] text-muted-foreground">Recomendación para optimizar tiempo</div>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => applyPreset("promo")} className="gap-2 cursor-pointer">
                                    <span>🎁</span>
                                    <div>
                                        <div className="font-semibold">Promoción / Beneficio</div>
                                        <div className="text-[10px] text-muted-foreground">Descuento o upgrade especial</div>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => applyPreset("notice")} className="gap-2 cursor-pointer">
                                    <span>⚠️</span>
                                    <div>
                                        <div className="font-semibold">Aviso Operativo</div>
                                        <div className="text-[10px] text-muted-foreground">Mantenimiento o ventana técnica</div>
                                    </div>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="flex items-center gap-0.5 border-l pl-2 ml-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground"
                                        disabled={safeSlideIdx === 0}
                                        onClick={() => handleMoveSlide(safeSlideIdx, "left")}
                                    >
                                        <ArrowLeft className="w-3.5 h-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Mover a la izquierda</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground"
                                        disabled={safeSlideIdx === slidesList.length - 1}
                                        onClick={() => handleMoveSlide(safeSlideIdx, "right")}
                                    >
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Mover a la derecha</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground"
                                        disabled={slidesList.length >= 5}
                                        onClick={() => handleDuplicateSlide(safeSlideIdx)}
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Duplicar diapositiva</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                        disabled={slidesList.length <= 1}
                                        onClick={() => handleDeleteSlide(safeSlideIdx)}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Eliminar diapositiva</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                </div>


                {/* ========================================================================= */}
                {/* 3. CONFIGURACIÓN COMPACTA EN FRANJAS HORIZONTALES (Sin Cajas Anidadas)    */}
                {/* ========================================================================= */}
                <div className="rounded-2xl border shadow-sm bg-white dark:bg-zinc-950 p-4 sm:p-5 space-y-5">

                    {/* FRANJA 1: TEXTOS PRINCIPALES & VARIABLES DINÁMICAS */}
                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Type className="w-4 h-4 text-primary" />
                                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                                    1. Textos & Jerarquía Tipográfica
                                </span>
                            </div>

                            {/* Barra Interactiva de Inserción de Tokens */}
                            <div className="flex flex-wrap items-center gap-1.5 text-xs bg-primary/5 p-1 px-2.5 rounded-xl border border-primary/20">
                                <span className="text-[11px] font-semibold text-primary flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-amber-500" /> Insertar variable:
                                </span>
                                <button
                                    type="button"
                                    onClick={() => insertTokenToActiveField("{user_name}")}
                                    className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border hover:border-primary hover:text-primary transition-all font-mono font-bold text-[10px] shadow-2xs cursor-pointer"
                                    title="Inserta {user_name} en el campo activo"
                                >
                                    + {"{user_name}"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => insertTokenToActiveField("{org_name}")}
                                    className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border hover:border-primary hover:text-primary transition-all font-mono font-bold text-[10px] shadow-2xs cursor-pointer"
                                    title="Inserta {org_name} en el campo activo"
                                >
                                    + {"{org_name}"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => insertTokenToActiveField("{space_name}")}
                                    className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border hover:border-primary hover:text-primary transition-all font-mono font-bold text-[10px] shadow-2xs cursor-pointer"
                                    title="Inserta {space_name} en el campo activo"
                                >
                                    + {"{space_name}"}
                                </button>
                            </div>
                        </div>

                        {/* Grid Horizontal de Título y Badge */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                            {/* Título Principal */}
                            <div className="lg:col-span-8 space-y-1">
                                <Label className="text-xs font-bold flex items-center justify-between">
                                    <span>Título Principal *</span>
                                    <span className="text-[10px] font-normal text-muted-foreground font-mono">
                                        h2 text-2xl font-black
                                    </span>
                                </Label>
                                <div className="flex items-center gap-1.5">
                                    <Input
                                        placeholder="Ej: Bienvenido a {org_name}"
                                        value={currentSlide.title || ""}
                                        onFocus={() => setFocusedField("title")}
                                        onChange={e => updateCurrentSlide({ title: e.target.value })}
                                        className="h-9 font-bold text-sm bg-slate-50/50 dark:bg-zinc-900/50 flex-1"
                                    />
                                    <Select
                                        value={currentSlide.titleColor || "default"}
                                        onValueChange={(val: TextColorRole) => updateCurrentSlide({ titleColor: val })}
                                    >
                                        <SelectTrigger className="h-9 w-[115px] text-xs shrink-0 whitespace-nowrap overflow-hidden">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {COLOR_ROLES.map(role => (
                                                <SelectItem key={role.value} value={role.value} className="text-xs">
                                                    <div className="flex items-center gap-2 whitespace-nowrap">
                                                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${role.previewClass}`} />
                                                        <span className="whitespace-nowrap">{role.label}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Badge Kicker */}
                            <div className="lg:col-span-4 space-y-1">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-semibold">
                                        Badge Superior (Kicker)
                                    </Label>
                                    <div className="flex items-center gap-1.5">
                                        <Switch
                                            id={`kicker-shimmer-${safeSlideIdx}`}
                                            checked={Boolean(currentSlide.kicker_shimmer)}
                                            onCheckedChange={checked => updateCurrentSlide({ kicker_shimmer: checked })}
                                            className="scale-75"
                                        />
                                        <Label
                                            htmlFor={`kicker-shimmer-${safeSlideIdx}`}
                                            className="text-[10px] cursor-pointer flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground"
                                        >
                                            <Sparkles className={cn("w-3 h-3", currentSlide.kicker_shimmer ? "text-amber-500 animate-pulse" : "text-muted-foreground")} />
                                            <span>Shimmer</span>
                                        </Label>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Input
                                        placeholder="Ej: NUEVO, PRO TIP"
                                        value={currentSlide.kicker || ""}
                                        onFocus={() => setFocusedField("kicker")}
                                        onChange={e => updateCurrentSlide({ kicker: e.target.value })}
                                        className="h-9 text-xs bg-slate-50/50 dark:bg-zinc-900/50 flex-1"
                                    />
                                    <Select
                                        value={currentSlide.kickerColor || "brand_primary"}
                                        onValueChange={(val: TextColorRole) => updateCurrentSlide({ kickerColor: val })}
                                    >
                                        <SelectTrigger className="h-9 w-[115px] text-xs shrink-0 whitespace-nowrap overflow-hidden">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {COLOR_ROLES.map(role => (
                                                <SelectItem key={role.value} value={role.value} className="text-xs">
                                                    <div className="flex items-center gap-2 whitespace-nowrap">
                                                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${role.previewClass}`} />
                                                        <span className="whitespace-nowrap">{role.label}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Fila Horizontal de Subtítulo */}
                        <div className="pt-2 border-t border-border/40">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                                <div className="lg:col-span-3 flex items-center justify-between gap-2">
                                    <Label htmlFor="toggle-subtitle-h" className="text-xs font-bold cursor-pointer">
                                        Subtítulo Explicativo
                                    </Label>
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-semibold text-muted-foreground">
                                            {currentSlide.showSubtitle ? "Activo" : "Inactivo"}
                                        </span>
                                        <Switch
                                            id="toggle-subtitle-h"
                                            checked={currentSlide.showSubtitle}
                                            onCheckedChange={checked => updateCurrentSlide({ showSubtitle: checked })}
                                            className="scale-90"
                                        />
                                    </div>
                                </div>

                                {currentSlide.showSubtitle ? (
                                    <div className="lg:col-span-9 flex items-center gap-1.5">
                                        <Input
                                            placeholder="Ej: Gestiona tu negocio y potencia tu equipo desde un solo panel..."
                                            value={currentSlide.subtitle || ""}
                                            onFocus={() => setFocusedField("subtitle")}
                                            onChange={e => updateCurrentSlide({ subtitle: e.target.value })}
                                            className="h-9 text-xs font-semibold bg-slate-50/50 dark:bg-zinc-900/50 flex-1"
                                        />
                                        <Select
                                            value={currentSlide.subtitleColor || "muted"}
                                            onValueChange={(val: TextColorRole) => updateCurrentSlide({ subtitleColor: val })}
                                        >
                                            <SelectTrigger className="h-9 w-[115px] text-xs shrink-0 whitespace-nowrap overflow-hidden">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {COLOR_ROLES.map(role => (
                                                    <SelectItem key={role.value} value={role.value} className="text-xs">
                                                        <div className="flex items-center gap-2 whitespace-nowrap">
                                                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${role.previewClass}`} />
                                                            <span className="whitespace-nowrap">{role.label}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : (
                                    <div className="lg:col-span-9 text-[11px] text-muted-foreground italic">
                                        El subtítulo está apagado para esta diapositiva. Activa el switch si deseas mostrar una frase destacada superior.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>


                    {/* FRANJA 2: FRASES ROTATIVAS & COREOGRAFÍA (Horizontal Continua) */}
                    <div className="space-y-3 pt-3 border-t border-border/50">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-primary" />
                                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                                    2. Frases Rotativas & Coreografía
                                </span>
                                <Badge variant="outline" className="text-[11px] font-mono gap-1">
                                    <span>⏱️ Duración Slide: {currentSlideTotalDuration}s</span>
                                </Badge>
                            </div>

                            <div className="flex items-center gap-2">
                                <Select
                                    value={currentSlide.phrasesColor || "default"}
                                    onValueChange={(val: TextColorRole) => updateCurrentSlide({ phrasesColor: val })}
                                >
                                    <SelectTrigger className="w-[115px] h-8 text-xs shrink-0 whitespace-nowrap overflow-hidden">
                                        <SelectValue placeholder="Color" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {COLOR_ROLES.map(role => (
                                            <SelectItem key={role.value} value={role.value} className="text-xs">
                                                <div className="flex items-center gap-2 whitespace-nowrap">
                                                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${role.previewClass}`} />
                                                    <span className="whitespace-nowrap">{role.label}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddPhrase}
                                    className="h-8 text-xs gap-1 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-semibold"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Añadir Frase</span>
                                </Button>
                            </div>
                        </div>

                        {/* Filas directas de frases */}
                        <div className="space-y-2">
                            {(currentSlide.phrases || []).map((phrase, pIdx) => (
                                <div
                                    key={pIdx}
                                    className="flex items-center gap-2.5 bg-slate-50/70 dark:bg-zinc-900/40 p-2 px-3 rounded-xl border border-slate-200 dark:border-zinc-800"
                                >
                                    <span className="w-5 text-center font-mono font-bold text-xs text-muted-foreground shrink-0">
                                        {pIdx + 1}.
                                    </span>

                                    <div className="flex-1 min-w-0">
                                        <Input
                                            value={phrase.text}
                                            onFocus={() => setFocusedField(`phrase-${pIdx}`)}
                                            onChange={e => handleUpdatePhrase(pIdx, e.target.value)}
                                            placeholder={`Frase rotativa ${pIdx + 1}...`}
                                            className="h-8 text-xs bg-white dark:bg-zinc-900"
                                        />
                                    </div>

                                    {/* Selector de Segundos por frase */}
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 px-2 py-1 rounded-lg border shadow-2xs shrink-0">
                                                <Clock className="w-3 h-3 text-muted-foreground" />
                                                <input
                                                    type="number"
                                                    min={2}
                                                    max={30}
                                                    value={phrase.durationSeconds || 6}
                                                    onChange={e => handleUpdatePhrase(pIdx, phrase.text, parseInt(e.target.value, 10) || 6)}
                                                    className="w-7 text-xs font-mono font-bold bg-transparent text-center focus:outline-none"
                                                />
                                                <span className="text-[10px] text-muted-foreground font-mono">s</span>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>Duración de esta frase en pantalla</TooltipContent>
                                    </Tooltip>

                                    {(currentSlide.phrases || []).length > 1 && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-red-500 shrink-0"
                                                    onClick={() => handleRemovePhrase(pIdx)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Eliminar esta frase</TooltipContent>
                                        </Tooltip>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>


                    {/* FRANJA 3: BOTÓN CTA & MULTIMEDIA / TEMA (Lado a Lado de 2 Columnas Limpias) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-3 border-t border-border/50">

                        {/* Columna Izquierda: Botón de Acción (CTA) */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Target className="w-4 h-4 text-primary" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                                        3. Botón de Acción (CTA)
                                    </span>
                                </div>

                                {/* Toggle Tipo de Acción: URL vs Modal */}
                                <div className="flex items-center gap-1 p-0.5 rounded-lg border bg-slate-100 dark:bg-zinc-900 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => updateCurrentSlide({ cta_action: "url" })}
                                        className={cn(
                                            "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
                                            currentSlide.cta_action !== "modal"
                                                ? "bg-white dark:bg-zinc-800 text-foreground shadow-2xs font-bold"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        🔗 URL
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const defaultModalConfig: BannerModalConfig = currentSlide.modal_config || {
                                                badge: currentSlide.kicker || "🚀 NOVEDAD",
                                                title: currentSlide.title || "Conoce esta nueva función",
                                                subtitle: currentSlide.subtitle || "Acelera tus resultados con herramientas de última generación.",
                                                media_type: currentSlide.media_type || "json_lottie",
                                                media_url: currentSlide.media_url || "",
                                                features: [
                                                    { icon: "Zap", title: "Automatización Nativa", description: "Flujos acelerados sin fricción manual" },
                                                    { icon: "BarChart", title: "Métricas en Tiempo Real", description: "Control total de tu operativa" },
                                                ],
                                                primary_cta_text: "Probar Ahora",
                                                primary_cta_url: currentSlide.cta_url || "/dashboard",
                                                primary_cta_shimmer: true,
                                                secondary_cta_text: "Cerrar",
                                                secondary_cta_url: "",
                                            }
                                            updateCurrentSlide({ cta_action: "modal", modal_config: defaultModalConfig })
                                        }}
                                        className={cn(
                                            "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1",
                                            currentSlide.cta_action === "modal"
                                                ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <span>🪟 Modal Cover</span>
                                        <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                                <div className={currentSlide.cta_action === "modal" ? "sm:col-span-7 space-y-1" : "sm:col-span-5 space-y-1"}>
                                    <Label className="text-[11px] text-muted-foreground">Texto del Botón</Label>
                                    <Input
                                        placeholder={currentSlide.cta_action === "modal" ? "Ej: Conoce el Módulo" : "Ej: Comenzar Ahora"}
                                        value={currentSlide.cta_text || ""}
                                        onChange={e => updateCurrentSlide({ cta_text: e.target.value })}
                                        className="h-8 text-xs bg-slate-50/50 dark:bg-zinc-900/50"
                                    />
                                </div>
                                {currentSlide.cta_action !== "modal" && (
                                    <div className="sm:col-span-4 space-y-1">
                                        <Label className="text-[11px] text-muted-foreground">URL de Destino</Label>
                                        <Input
                                            placeholder="/dashboard o https://..."
                                            value={currentSlide.cta_url || ""}
                                            onChange={e => updateCurrentSlide({ cta_url: e.target.value })}
                                            className="h-8 text-xs font-mono bg-slate-50/50 dark:bg-zinc-900/50"
                                        />
                                    </div>
                                )}
                                <div className={currentSlide.cta_action === "modal" ? "sm:col-span-5 space-y-1" : "sm:col-span-3 space-y-1"}>
                                    <Label className="text-[11px] text-muted-foreground">Estilo</Label>
                                    <Select
                                        value={currentSlide.cta_variant || "default"}
                                        onValueChange={(val: any) => updateCurrentSlide({ cta_variant: val })}
                                    >
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="default">Primario</SelectItem>
                                            <SelectItem value="secondary">Secundario</SelectItem>
                                            <SelectItem value="outline">Contorno</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                {currentSlide.cta_action !== "modal" ? (
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id={`cta-tab-switch-${safeSlideIdx}`}
                                            checked={currentSlide.cta_open_new_tab}
                                            onCheckedChange={checked => updateCurrentSlide({ cta_open_new_tab: checked })}
                                            className="scale-90"
                                        />
                                        <Label htmlFor={`cta-tab-switch-${safeSlideIdx}`} className="text-xs cursor-pointer flex items-center gap-1">
                                            <span>Pestaña nueva</span>
                                            <ExternalLink className="w-3 h-3 text-muted-foreground" />
                                        </Label>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                                        <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                                            Abre Spotlight Cover
                                        </Badge>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setIsPreviewModalOpen(true)}
                                            className="h-6 px-2 text-[11px] gap-1 font-bold text-primary hover:bg-primary/10 cursor-pointer"
                                        >
                                            <Eye className="w-3 h-3" /> Probar Modal
                                        </Button>
                                    </div>
                                )}

                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id={`cta-shimmer-${safeSlideIdx}`}
                                        checked={Boolean(currentSlide.cta_shimmer)}
                                        onCheckedChange={checked => updateCurrentSlide({ cta_shimmer: checked })}
                                        className="scale-90"
                                    />
                                    <Label htmlFor={`cta-shimmer-${safeSlideIdx}`} className="text-xs cursor-pointer flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground">
                                        <Sparkles className={cn("w-3.5 h-3.5", currentSlide.cta_shimmer ? "text-amber-500 animate-pulse" : "text-muted-foreground")} />
                                        <span>Efecto Shimmer (Brillo IA)</span>
                                    </Label>
                                </div>
                            </div>
                        </div>

                        {/* Columna Derecha: Multimedia & Tema */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4 text-primary" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                                        4. Multimedia & Tema Visual
                                    </span>
                                </div>

                                <Select
                                    value={currentSlide.theme || "auto"}
                                    onValueChange={(v: any) => updateCurrentSlide({ theme: v })}
                                >
                                    <SelectTrigger className="w-[170px] h-8 text-xs bg-slate-50/50 dark:bg-zinc-900/50 whitespace-nowrap overflow-hidden">
                                        <SelectValue placeholder="Tema Visual" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto" className="text-xs font-semibold">
                                            <div className="flex items-center gap-2 whitespace-nowrap">
                                                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                                                <span className="whitespace-nowrap">✨ Auto (Tenant)</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="brand_primary" className="text-xs">
                                            <div className="flex items-center gap-2 whitespace-nowrap">
                                                <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary,#F205E2)] shrink-0" />
                                                <span className="whitespace-nowrap">Marca Primario</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="brand_secondary" className="text-xs">
                                            <div className="flex items-center gap-2 whitespace-nowrap">
                                                <div className="w-2.5 h-2.5 rounded-full bg-[var(--brand-cyan,#00E0FF)] shrink-0" />
                                                <span className="whitespace-nowrap">Marca Secundario</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="dark" className="text-xs">
                                            <div className="flex items-center gap-2 whitespace-nowrap">
                                                <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-700 shrink-0" />
                                                <span className="whitespace-nowrap">Dark (Oscuro)</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="light" className="text-xs">
                                            <div className="flex items-center gap-2 whitespace-nowrap">
                                                <div className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300 shrink-0" />
                                                <span className="whitespace-nowrap">Light (Claro)</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                    <Label className="text-[11px] text-muted-foreground">Tipo de Media</Label>
                                    <Select
                                        value={currentSlide.media_type || "json_lottie"}
                                        onValueChange={v => updateCurrentSlide({ media_type: v as any, media_url: "" })}
                                    >
                                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="json_lottie">Animación Lottie 3D</SelectItem>
                                            <SelectItem value="image">URL de Imagen</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-[11px] text-muted-foreground">Alineación</Label>
                                    <Select
                                        value={currentSlide.layout_pos || "right"}
                                        onValueChange={(v: any) => updateCurrentSlide({ layout_pos: v })}
                                    >
                                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="right">A la Derecha</SelectItem>
                                            <SelectItem value="left">A la Izquierda</SelectItem>
                                            <SelectItem value="center">Fondo Marca de Agua</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {currentSlide.media_type === "json_lottie" ? (
                                <div className="flex items-center gap-2 pt-0.5">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsLottiePickerOpen(true)}
                                        className="gap-1.5 shrink-0 bg-white dark:bg-zinc-800 hover:bg-primary hover:text-primary-foreground text-xs h-8 px-3 border-primary/30"
                                    >
                                        <Film className="h-3.5 w-3.5 text-primary" />
                                        <span>Catálogo ({lottieCatalog.length})</span>
                                    </Button>

                                    <Input
                                        placeholder="Ruta JSON ej: /animations/..."
                                        value={currentSlide.media_url || ""}
                                        onChange={e => updateCurrentSlide({ media_url: e.target.value })}
                                        className="text-xs h-8 font-mono flex-1"
                                    />

                                    {currentSlide.media_url && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => updateCurrentSlide({ media_url: "" })}
                                                    className="h-8 w-8 text-muted-foreground hover:text-red-500 shrink-0"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Quitar animación</TooltipContent>
                                        </Tooltip>
                                    )}

                                    <LottieVisualPickerModal
                                        open={isLottiePickerOpen}
                                        onOpenChange={setIsLottiePickerOpen}
                                        selectedValue={currentSlide.media_url}
                                        onSelect={val => updateCurrentSlide({ media_url: val })}
                                    />
                                </div>
                            ) : (
                                <Input
                                    placeholder="URL pública de imagen (JPG, PNG, WebP, GIF)"
                                    value={currentSlide.media_url || ""}
                                    onChange={e => updateCurrentSlide({ media_url: e.target.value })}
                                    className="text-xs h-8"
                                />
                            )}
                        </div>
                    </div>

                    {/* FRANJA 3.B: CONFIGURACIÓN DEL MODAL COVER SPOTLIGHT */}
                    {currentSlide.cta_action === "modal" && (
                        <div className="pt-4 border-t border-border/60 animate-in fade-in-50 duration-200">
                            <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.04] via-card to-primary/[0.07] p-4 sm:p-5 space-y-4 shadow-sm">
                                {/* Cabecera del Diseñador del Modal */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-2xs">
                                            <Sparkles className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                                                    🪟 Diseñador de Modal Cover Spotlight
                                                </span>
                                                <Badge variant="outline" className="text-[10px] font-mono bg-primary/5 text-primary border-primary/20">
                                                    Linear / Keynote Sheet
                                                </Badge>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                Experiencia inmersiva a pantalla modal que se desplegará cuando los usuarios hagan clic en este CTA.
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        type="button"
                                        onClick={() => setIsPreviewModalOpen(true)}
                                        size="sm"
                                        className="h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer shrink-0"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>👁️ Probar Modal en Vivo</span>
                                    </Button>
                                </div>

                                {/* Fila 1: Textos Principales del Modal (Badge, Título y Subtítulo) */}
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                    <div className="sm:col-span-4 space-y-1">
                                        <Label className="text-[11px] font-semibold text-muted-foreground">
                                            Badge Superior del Modal
                                        </Label>
                                        <Input
                                            placeholder="Ej: 🚀 NOVEDAD"
                                            value={currentSlide.modal_config?.badge || ""}
                                            onChange={e => updateModalConfig({ badge: e.target.value })}
                                            className="h-8 text-xs font-bold bg-white dark:bg-zinc-900"
                                        />
                                    </div>
                                    <div className="sm:col-span-8 space-y-1">
                                        <Label className="text-[11px] font-semibold text-muted-foreground">
                                            Título Principal del Modal
                                        </Label>
                                        <Input
                                            placeholder="Ej: Conoce el nuevo Módulo de Tareas"
                                            value={currentSlide.modal_config?.title || ""}
                                            onChange={e => updateModalConfig({ title: e.target.value })}
                                            className="h-8 text-xs font-bold bg-white dark:bg-zinc-900"
                                        />
                                    </div>
                                    <div className="sm:col-span-12 space-y-1">
                                        <Label className="text-[11px] font-semibold text-muted-foreground">
                                            Subtítulo / Descripción Explicativa
                                        </Label>
                                        <Input
                                            placeholder="Ej: Automatiza flujos, colabora en tiempo real y aumenta el rendimiento operativo de tu equipo."
                                            value={currentSlide.modal_config?.subtitle || ""}
                                            onChange={e => updateModalConfig({ subtitle: e.target.value })}
                                            className="h-8 text-xs bg-white dark:bg-zinc-900"
                                        />
                                    </div>
                                </div>

                                {/* Fila 2: Multimedia del Hero Cover del Modal */}
                                <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <ImageIcon className="w-3.5 h-3.5 text-primary" />
                                            <span className="text-[11px] font-bold text-foreground">
                                                Cover Multimedia del Modal (Opcional - Si se deja vacío heredará el del banner)
                                            </span>
                                        </div>
                                        {currentSlide.modal_config?.media_url && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => updateModalConfig({ media_url: "" })}
                                                className="h-6 text-[10px] text-muted-foreground hover:text-red-500 cursor-pointer"
                                            >
                                                <X className="w-3 h-3 mr-1" /> Usar multimedia del banner
                                            </Button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={currentSlide.modal_config?.media_type || currentSlide.media_type || "json_lottie"}
                                            onValueChange={(val: any) => updateModalConfig({ media_type: val })}
                                        >
                                            <SelectTrigger className="w-[140px] h-8 text-xs shrink-0 bg-white dark:bg-zinc-900">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="json_lottie">Animación Lottie</SelectItem>
                                                <SelectItem value="image">Imagen URL</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {(currentSlide.modal_config?.media_type || currentSlide.media_type) === "json_lottie" ? (
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setIsModalLottiePickerOpen(true)}
                                                    className="gap-1.5 shrink-0 bg-white dark:bg-zinc-800 text-xs h-8 px-3 border-primary/30 cursor-pointer"
                                                >
                                                    <Film className="h-3.5 w-3.5 text-primary" />
                                                    <span>Catálogo</span>
                                                </Button>
                                                <Input
                                                    placeholder={currentSlide.media_url ? `Heredado: ${currentSlide.media_url}` : "Ruta JSON ej: /animations/..."}
                                                    value={currentSlide.modal_config?.media_url || ""}
                                                    onChange={e => updateModalConfig({ media_url: e.target.value, media_type: "json_lottie" })}
                                                    className="text-xs h-8 font-mono flex-1 bg-white dark:bg-zinc-900"
                                                />
                                            </div>
                                        ) : (
                                            <Input
                                                placeholder={currentSlide.media_url ? `Heredado: ${currentSlide.media_url}` : "URL pública de imagen (JPG, PNG, WebP)"}
                                                value={currentSlide.modal_config?.media_url || ""}
                                                onChange={e => updateModalConfig({ media_url: e.target.value, media_type: "image" })}
                                                className="text-xs h-8 flex-1 bg-white dark:bg-zinc-900"
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Fila 3: Capacidades Clave / Power Highlights (Grid de Cards) */}
                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Layers className="w-3.5 h-3.5 text-primary" />
                                            <span className="text-[11px] font-bold text-foreground">
                                                Capacidades Clave ({((currentSlide.modal_config?.features) || []).length}/4)
                                            </span>
                                        </div>

                                        {((currentSlide.modal_config?.features) || []).length < 4 && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleAddModalFeature}
                                                className="h-7 text-[11px] gap-1 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-semibold cursor-pointer"
                                            >
                                                <Plus className="w-3 h-3" />
                                                <span>Añadir Característica</span>
                                            </Button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {((currentSlide.modal_config?.features) || []).map((feat, fIdx) => (
                                            <div
                                                key={fIdx}
                                                className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 space-y-2 shadow-2xs"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <Select
                                                            value={feat.icon || "Sparkles"}
                                                            onValueChange={(icon: string) => handleUpdateModalFeature(fIdx, { icon })}
                                                        >
                                                            <SelectTrigger className="h-7 w-[130px] text-xs px-2 bg-slate-50 dark:bg-zinc-800 shrink-0">
                                                                <div className="flex items-center gap-1.5 truncate">
                                                                    <span className="shrink-0">{renderFeatureIcon(feat.icon)}</span>
                                                                    <span className="truncate">{feat.icon || "Sparkles"}</span>
                                                                </div>
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {FEATURE_ICON_OPTIONS.map(opt => (
                                                                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                                                        <div className="flex items-center gap-2">
                                                                            <span>{renderFeatureIcon(opt.value)}</span>
                                                                            <span>{opt.label}</span>
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>

                                                        <Input
                                                            placeholder="Título (ej: Automatización)"
                                                            value={feat.title}
                                                            onChange={e => handleUpdateModalFeature(fIdx, { title: e.target.value })}
                                                            className="h-7 text-xs font-bold flex-1"
                                                        />
                                                    </div>

                                                    {((currentSlide.modal_config?.features) || []).length > 1 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-muted-foreground hover:text-red-500 shrink-0"
                                                            onClick={() => handleRemoveModalFeature(fIdx)}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </div>

                                                <Input
                                                    placeholder="Descripción del beneficio para el usuario..."
                                                    value={feat.description}
                                                    onChange={e => handleUpdateModalFeature(fIdx, { description: e.target.value })}
                                                    className="h-7 text-[11px] text-muted-foreground"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Fila 4: Acciones de Conversión en el Modal (Botón Primario y Secundario) */}
                                <div className="pt-3 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Botón de Conversión Primario */}
                                    <div className="space-y-2 p-3 rounded-xl bg-slate-50/70 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                                                <Target className="w-3.5 h-3.5 text-primary" /> Botón Primario (Conversión)
                                            </span>
                                            <div className="flex items-center space-x-1.5">
                                                <Switch
                                                    id={`modal-cta-shimmer-${safeSlideIdx}`}
                                                    checked={currentSlide.modal_config?.primary_cta_shimmer !== false}
                                                    onCheckedChange={checked => updateModalConfig({ primary_cta_shimmer: checked })}
                                                    className="scale-75"
                                                />
                                                <Label htmlFor={`modal-cta-shimmer-${safeSlideIdx}`} className="text-[10px] cursor-pointer text-muted-foreground font-semibold">
                                                    Shimmer
                                                </Label>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-0.5">
                                                <Label className="text-[10px] text-muted-foreground">Texto</Label>
                                                <Input
                                                    placeholder="Ej: Probar Ahora"
                                                    value={currentSlide.modal_config?.primary_cta_text || ""}
                                                    onChange={e => updateModalConfig({ primary_cta_text: e.target.value })}
                                                    className="h-7 text-xs font-bold bg-white dark:bg-zinc-900"
                                                />
                                            </div>
                                            <div className="space-y-0.5">
                                                <Label className="text-[10px] text-muted-foreground">URL Destino</Label>
                                                <Input
                                                    placeholder="/dashboard o https://..."
                                                    value={currentSlide.modal_config?.primary_cta_url || ""}
                                                    onChange={e => updateModalConfig({ primary_cta_url: e.target.value })}
                                                    className="h-7 text-xs font-mono bg-white dark:bg-zinc-900"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Botón Secundario Opcional */}
                                    <div className="space-y-2 p-3 rounded-xl bg-slate-50/70 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-foreground">
                                                Botón Secundario (Opcional)
                                            </span>
                                            <span className="text-[10px] text-muted-foreground italic">
                                                Si URL está vacía, actuará como Cerrar
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-0.5">
                                                <Label className="text-[10px] text-muted-foreground">Texto</Label>
                                                <Input
                                                    placeholder="Ej: Ver Documentación o Cerrar"
                                                    value={currentSlide.modal_config?.secondary_cta_text || ""}
                                                    onChange={e => updateModalConfig({ secondary_cta_text: e.target.value })}
                                                    className="h-7 text-xs bg-white dark:bg-zinc-900"
                                                />
                                            </div>
                                            <div className="space-y-0.5">
                                                <Label className="text-[10px] text-muted-foreground">URL (Opcional)</Label>
                                                <Input
                                                    placeholder="Opcional: /docs"
                                                    value={currentSlide.modal_config?.secondary_cta_url || ""}
                                                    onChange={e => updateModalConfig({ secondary_cta_url: e.target.value })}
                                                    className="h-7 text-xs font-mono bg-white dark:bg-zinc-900"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>


                {/* ========================================================================= */}
                {/* 4. SIMULADOR EN VIVO (Al Final / Ancho Completo con comparador de 250px)   */}
                {/* ========================================================================= */}
                <div className="rounded-2xl border shadow-md bg-white dark:bg-zinc-950 overflow-hidden">
                    <div className="p-3 px-5 border-b bg-slate-50 dark:bg-zinc-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <MonitorPlay className="h-4 w-4 text-primary animate-pulse" />
                            <div>
                                <span className="text-xs font-bold text-foreground">
                                    Simulador en Tiempo Real (Vista Viewport 1:1)
                                </span>
                            </div>
                        </div>

                        {/* Controles de Reproducción del Simulador */}
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant={previewIsPlaying ? "default" : "outline"}
                                size="sm"
                                onClick={() => setPreviewIsPlaying(!previewIsPlaying)}
                                className="h-7 text-xs gap-1.5 font-semibold"
                            >
                                {previewIsPlaying ? (
                                    <>
                                        <Pause className="h-3.5 w-3.5" /> Pausar
                                    </>
                                ) : (
                                    <>
                                        <Play className="h-3.5 w-3.5" /> Probar Secuencia
                                    </>
                                )}
                            </Button>

                            <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-background">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => {
                                                const prev = (previewSlideIdx - 1 + slidesList.length) % slidesList.length
                                                setPreviewSlideIdx(prev)
                                                setActiveSlideIdx(prev)
                                            }}
                                        >
                                            <ChevronLeft className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Diapositiva anterior</TooltipContent>
                                </Tooltip>

                                <span className="text-[11px] font-mono font-semibold px-2">
                                    {previewSlideIdx + 1} / {slidesList.length}
                                </span>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => {
                                                const next = (previewSlideIdx + 1) % slidesList.length
                                                setPreviewSlideIdx(next)
                                                setActiveSlideIdx(next)
                                            }}
                                        >
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Diapositiva siguiente</TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 sm:p-8 bg-slate-100/80 dark:bg-black/40 flex items-center justify-center">
                        <div className="w-full max-w-4xl mx-auto">
                            <GlobalDashboardBanner
                                config={{
                                    ...formData,
                                    is_active: true,
                                    slides: slidesList
                                }}
                                controlledSlideIndex={previewIsPlaying ? undefined : previewSlideIdx}
                                controlledIsPlaying={previewIsPlaying}
                                onSlideChange={idx => {
                                    setPreviewSlideIdx(idx)
                                    setActiveSlideIdx(idx)
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Modal Cover Spotlight Preview */}
                <BannerSpotlightModal
                    isOpen={isPreviewModalOpen}
                    onClose={() => setIsPreviewModalOpen(false)}
                    config={currentSlide.modal_config}
                    fallbackMediaUrl={currentSlide.media_url}
                    fallbackMediaType={currentSlide.media_type}
                    slideTheme={currentSlide.theme}
                    userContext={{
                        userName: "Super Admin",
                        orgName: "Pixy Platform",
                        spaceName: "Agency Manager"
                    }}
                />

                {/* Modal Dedicated Lottie Visual Picker */}
                <LottieVisualPickerModal
                    open={isModalLottiePickerOpen}
                    onOpenChange={setIsModalLottiePickerOpen}
                    selectedValue={currentSlide.modal_config?.media_url}
                    onSelect={val => updateModalConfig({ media_url: val, media_type: "json_lottie" })}
                />

            </div>
        </TooltipProvider>
    )
}
