"use client"

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { motion, AnimatePresence, PanInfo } from "framer-motion"
import { CatalogGalleryImage } from "@/types/catalog"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import {
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    Maximize2,
    Play,
    PlayCircle,
    Volume2,
    VolumeX,
    Rotate3d,
    RotateCcw,
    X
} from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"

export interface GalleryCarouselMediaItem {
    id: string
    type: "image" | "video" | "spin360"
    url: string
    thumbnailUrl?: string
    altText?: string
    isCover?: boolean
    videoProvider?: "youtube" | "vimeo" | "mp4"
    spinFrames?: string[]
    width?: number
    height?: number
}

export interface GalleryCarouselProps {
    images?: CatalogGalleryImage[]
    videoUrl?: string | null
    coverImage?: string | null
    threeSixtyFrames?: string[]
    selectedVariantImageUrl?: string | null
    aspectRatio?: "square" | "video" | "portrait" | "auto"
    enableZoom?: boolean
    enableLightbox?: boolean
    enableAutoplay?: boolean
    autoplayIntervalMs?: number
    className?: string
    itemName?: string
    badges?: string[]
    discountPercent?: number | null
    activeImageIndex?: number
    onImageChange?: (index: number) => void
    onSlideChange?: (index: number) => void
}

export interface ZoomCoordinates {
    x: number
    y: number
    containerWidth: number
    containerHeight: number
}

export interface ZoomLensState {
    enabled: boolean
    bgPositionXPercent: number
    bgPositionYPercent: number
    zoomScale: number
}

export interface VideoEmbedResult {
    isValid: boolean
    platform?: "youtube" | "vimeo" | "mp4"
    provider?: "youtube" | "vimeo" | "mp4"
    videoId?: string
    embedUrl?: string
    sandboxAttributes?: string
    isMutedAutoplaySupported?: boolean
    error?: string
}

export interface CarouselState {
    images: CatalogGalleryImage[]
    currentIndex: number
    showArrows: boolean
    showThumbnails: boolean
    isFallbackPlaceholder: boolean
}

/**
 * Computes 2.5x hover magnifier lens coordinates and background offsets
 */
export function computeZoomPosition(
    coords: ZoomCoordinates,
    scale: number = 2.5,
    isVideoSlide: boolean = false
): ZoomLensState {
    if (isVideoSlide) {
        return { enabled: false, bgPositionXPercent: 0, bgPositionYPercent: 0, zoomScale: 1.0 }
    }

    const clampedScale = Math.max(1.0, Math.min(3.5, scale))

    if (coords.containerWidth <= 0 || coords.containerHeight <= 0) {
        return { enabled: false, bgPositionXPercent: 0, bgPositionYPercent: 0, zoomScale: 1.0 }
    }

    const clampedX = Math.max(0, Math.min(coords.containerWidth, coords.x))
    const clampedY = Math.max(0, Math.min(coords.containerHeight, coords.y))

    const pctX = (clampedX / coords.containerWidth) * 100
    const pctY = (clampedY / coords.containerHeight) * 100

    return {
        enabled: true,
        bgPositionXPercent: Math.round(pctX * 100) / 100,
        bgPositionYPercent: Math.round(pctY * 100) / 100,
        zoomScale: clampedScale,
    }
}

/**
 * Parses and sanitizes video URLs across YouTube, Vimeo, and direct MP4
 */
export function parseAndSanitizeVideoUrl(rawUrl?: string): VideoEmbedResult {
    if (!rawUrl || typeof rawUrl !== "string") {
        return { isValid: false, error: "Video URL is required" }
    }

    const trimmed = rawUrl.trim()

    if (trimmed.includes("spotify.com") || trimmed.includes("soundcloud.com") || trimmed.endsWith(".mp3")) {
        return { isValid: false, error: "Audio-only links are not supported as product video previews" }
    }

    const ytMatch = trimmed.match(
        /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i
    )
    if (ytMatch && ytMatch[1]) {
        const videoId = ytMatch[1]
        return {
            isValid: true,
            platform: "youtube",
            provider: "youtube",
            videoId,
            embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1&mute=1&playsinline=1`,
            sandboxAttributes: "allow-scripts allow-same-origin allow-presentation allow-popups",
            isMutedAutoplaySupported: true,
        }
    }

    const vimeoMatch = trimmed.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/i)
    if (vimeoMatch && vimeoMatch[1]) {
        const videoId = vimeoMatch[1]
        return {
            isValid: true,
            platform: "vimeo",
            provider: "vimeo",
            videoId,
            embedUrl: `https://player.vimeo.com/video/${videoId}?dnt=1&autoplay=1&muted=1&playsinline=1`,
            sandboxAttributes: "allow-scripts allow-same-origin allow-presentation",
            isMutedAutoplaySupported: true,
        }
    }

    if (trimmed.match(/^https?:\/\/.+\.(mp4|webm|ogg)(?:\?.*)?$/i) || trimmed.includes(".mp4")) {
        return {
            isValid: true,
            platform: "mp4",
            provider: "mp4",
            embedUrl: encodeURI(trimmed),
            isMutedAutoplaySupported: true,
        }
    }

    return { isValid: false, error: `Invalid or unsupported video URL format: ${trimmed}` }
}

export const parseVideoUrl = parseAndSanitizeVideoUrl

/**
 * Initializes carousel state with zero/single photo handling
 */
export function initializeCarousel(images: CatalogGalleryImage[]): CarouselState {
    if (!images || images.length === 0) {
        return {
            images: [{ id: "placeholder", url: "https://cdn.pixy.app/fallback-item.webp", is_cover: true, order_index: 0 }],
            currentIndex: 0,
            showArrows: false,
            showThumbnails: false,
            isFallbackPlaceholder: true,
        }
    }

    return {
        images,
        currentIndex: 0,
        showArrows: images.length > 1,
        showThumbnails: images.length > 1,
        isFallbackPlaceholder: false,
    }
}

/**
 * Handles circular wrapping and boundary clamping for carousel navigation
 */
export function navigateCarousel(
    state: CarouselState,
    direction: "prev" | "next" | number
): CarouselState {
    const maxIdx = state.images.length - 1
    let newIdx = state.currentIndex

    if (typeof direction === "number") {
        newIdx = Math.max(0, Math.min(maxIdx, direction))
    } else if (direction === "next") {
        newIdx = newIdx >= maxIdx ? 0 : newIdx + 1
    } else if (direction === "prev") {
        newIdx = newIdx <= 0 ? maxIdx : newIdx - 1
    }

    return {
        ...state,
        currentIndex: newIdx,
    }
}

/**
 * Upgrades image URL to uncompressed high-res master asset when zoomed
 */
export function getZoomImageSource(isZoomed: boolean, standardUrl: string): string {
    if (!isZoomed || !standardUrl) return standardUrl
    if (standardUrl.includes("unsplash.com")) {
        return standardUrl.replace("w=1200", "w=3000").replace("q=80", "q=100")
    }
    return standardUrl
}

/**
 * Clamps pinch scale to safe range [1.0, 3.5]
 */
export function clampPinchScale(rawScale: number): number {
    const MIN_ZOOM = 1.0
    const MAX_ZOOM = 3.5
    return Math.min(Math.max(rawScale, MIN_ZOOM), MAX_ZOOM)
}

/**
 * Clips magnifier lens coordinates inside container boundaries
 */
export function getClippedLensPosition(cursorPos: number, lensSize: number = 150, containerSize: number = 600): number {
    const halfLens = lensSize / 2
    let lensPos = cursorPos - halfLens
    return Math.max(0, Math.min(lensPos, containerSize - lensSize))
}

const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? "100%" : "-100%",
        opacity: 0,
    }),
    center: {
        x: 0,
        opacity: 1,
        transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] },
    },
    exit: (direction: number) => ({
        x: direction > 0 ? "-100%" : "100%",
        opacity: 0,
        transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] },
    }),
}

export function GalleryCarousel({
    images,
    videoUrl,
    coverImage,
    threeSixtyFrames,
    selectedVariantImageUrl,
    aspectRatio = "square",
    enableZoom = true,
    enableLightbox = true,
    enableAutoplay = false,
    autoplayIntervalMs = 5000,
    className,
    itemName = "Producto",
    badges = [],
    discountPercent,
    activeImageIndex,
    onImageChange,
    onSlideChange,
}: GalleryCarouselProps) {
    // 1. Build unified media items list
    const mediaItems: GalleryCarouselMediaItem[] = useMemo(() => {
        const items: GalleryCarouselMediaItem[] = []

        // If variant has specific image, insert at front
        if (selectedVariantImageUrl) {
            items.push({
                id: "variant-cover",
                type: "image",
                url: selectedVariantImageUrl,
                thumbnailUrl: selectedVariantImageUrl,
                altText: `${itemName} - Variante seleccionada`,
                isCover: true,
            })
        }

        // Add gallery images
        if (Array.isArray(images) && images.length > 0) {
            images.forEach((img, idx) => {
                // Avoid duplicating if matches variant image
                if (img.url !== selectedVariantImageUrl) {
                    items.push({
                        id: img.id || `img-${idx}`,
                        type: "image",
                        url: img.url,
                        thumbnailUrl: img.url,
                        altText: img.alt || img.alt_text || `${itemName} - Foto ${idx + 1}`,
                        isCover: img.is_cover,
                        width: img.width,
                        height: img.height,
                    })
                }
            })
        } else if (coverImage && coverImage !== selectedVariantImageUrl) {
            items.push({
                id: "cover-img",
                type: "image",
                url: coverImage,
                thumbnailUrl: coverImage,
                altText: itemName,
                isCover: true,
            })
        }

        // Add video slide if present
        if (videoUrl) {
            const parsed = parseAndSanitizeVideoUrl(videoUrl)
            if (parsed.isValid) {
                items.push({
                    id: "video-slide",
                    type: "video",
                    url: parsed.embedUrl || videoUrl,
                    thumbnailUrl: items[0]?.url || "https://cdn.pixy.app/video-placeholder.webp",
                    videoProvider: parsed.provider || "youtube",
                    altText: `${itemName} - Video oficial`,
                })
            }
        }

        // Add 360 Spin slide if present
        if (Array.isArray(threeSixtyFrames) && threeSixtyFrames.length > 0) {
            items.push({
                id: "spin-360-slide",
                type: "spin360",
                url: threeSixtyFrames[0],
                thumbnailUrl: threeSixtyFrames[0],
                spinFrames: threeSixtyFrames,
                altText: `${itemName} - Vista 360° interactiva`,
            })
        }

        // Zero-image fallback
        if (items.length === 0) {
            items.push({
                id: "fallback",
                type: "image",
                url: "https://cdn.pixy.app/fallback-item.webp",
                thumbnailUrl: "https://cdn.pixy.app/fallback-item.webp",
                altText: itemName,
                isCover: true,
            })
        }

        return items
    }, [images, coverImage, selectedVariantImageUrl, videoUrl, threeSixtyFrames, itemName])

    // State management
    const [currentIndex, setCurrentIndex] = useState(activeImageIndex ?? 0)
    const [direction, setDirection] = useState(0)
    const [isHoverZooming, setIsHoverZooming] = useState(false)
    const [zoomCoords, setZoomCoords] = useState<ZoomCoordinates>({ x: 0, y: 0, containerWidth: 0, containerHeight: 0 })
    const [isLightboxOpen, setIsLightboxOpen] = useState(false)
    const [lightboxScale, setLightboxScale] = useState(1.0)
    const [isVideoMuted, setIsVideoMuted] = useState(true)
    const [spinFrameIdx, setSpinFrameIdx] = useState(0)
    const [userInteracted, setUserInteracted] = useState(false)

    const containerRef = useRef<HTMLDivElement>(null)
    const thumbnailRibbonRef = useRef<HTMLDivElement>(null)
    const thumbnailRefs = useRef<Array<HTMLButtonElement | null>>([])

    // Sync external activeIndex if controlled
    useEffect(() => {
        if (activeImageIndex !== undefined && activeImageIndex !== currentIndex) {
            setCurrentIndex(Math.max(0, Math.min(mediaItems.length - 1, activeImageIndex)))
        }
    }, [activeImageIndex, mediaItems.length])

    // Reset zoom when switching slides or variants
    useEffect(() => {
        setIsHoverZooming(false)
        setLightboxScale(1.0)
    }, [currentIndex, selectedVariantImageUrl])

    const totalSlides = mediaItems.length
    const currentSlide = mediaItems[currentIndex] || mediaItems[0]

    // Navigation callbacks
    const goToSlide = useCallback((newIdx: number, newDir: number = 0) => {
        const wrappedIdx = (newIdx + totalSlides) % totalSlides
        setDirection(newDir || (wrappedIdx > currentIndex ? 1 : -1))
        setCurrentIndex(wrappedIdx)
        if (onImageChange) onImageChange(wrappedIdx)
        if (onSlideChange) onSlideChange(wrappedIdx)

        // Scroll thumbnail into view
        thumbnailRefs.current[wrappedIdx]?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
        })
    }, [currentIndex, totalSlides, onImageChange, onSlideChange])

    const nextSlide = useCallback(() => {
        goToSlide(currentIndex + 1, 1)
    }, [currentIndex, goToSlide])

    const prevSlide = useCallback(() => {
        goToSlide(currentIndex - 1, -1)
    }, [currentIndex, goToSlide])

    // Touch Swipe gesture handler
    const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        setUserInteracted(true)
        const { offset, velocity } = info
        const swipeThreshold = 50
        if (offset.x < -swipeThreshold || velocity.x < -300) {
            nextSlide()
        } else if (offset.x > swipeThreshold || velocity.x > 300) {
            prevSlide()
        }
    }

    // Desktop hover magnifier events
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!enableZoom || currentSlide.type !== "image") return
        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        setZoomCoords({
            x,
            y,
            containerWidth: rect.width,
            containerHeight: rect.height,
        })
        setIsHoverZooming(true)
    }

    const handleMouseLeave = () => {
        setIsHoverZooming(false)
    }

    // 360 Spin Drag Handler
    const handleSpinDrag = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (currentSlide.type !== "spin360" || !currentSlide.spinFrames) return
        const framesCount = currentSlide.spinFrames.length
        const deltaFrames = Math.floor(info.offset.x / 15)
        const newFrame = (spinFrameIdx - deltaFrames + framesCount * 100) % framesCount
        setSpinFrameIdx(newFrame)
    }

    // Autoplay Timer
    useEffect(() => {
        if (!enableAutoplay || userInteracted || totalSlides <= 1) return
        const interval = setInterval(() => {
            nextSlide()
        }, autoplayIntervalMs)
        return () => clearInterval(interval)
    }, [enableAutoplay, userInteracted, totalSlides, autoplayIntervalMs, nextSlide])

    // Compute active zoom offset
    const zoomState = computeZoomPosition(zoomCoords, 2.5, currentSlide.type === "video")
    const lensSize = 150
    const lensLeft = getClippedLensPosition(zoomCoords.x, lensSize, zoomCoords.containerWidth || 600)
    const lensTop = getClippedLensPosition(zoomCoords.y, lensSize, zoomCoords.containerHeight || 600)

    const aspectRatioClass = {
        square: "aspect-square",
        video: "aspect-video",
        portrait: "aspect-[4/5]",
        auto: "h-[360px] sm:h-[460px]",
    }[aspectRatio]

    return (
        <div className={cn("flex flex-col gap-3 w-full select-none", className)}>
            {/* MAIN STAGE CAROUSEL */}
            <div
                ref={containerRef}
                className={cn(
                    "relative w-full overflow-hidden rounded-3xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-md group cursor-pointer",
                    aspectRatioClass
                )}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onTouchStart={() => setUserInteracted(true)}
            >
                {/* Motion Animated Slide Stage */}
                <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                        key={currentSlide.id + currentIndex}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        drag={currentSlide.type === "image" ? "x" : false}
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.15}
                        onDragEnd={handleDragEnd}
                        className="absolute inset-0 w-full h-full flex items-center justify-center"
                        onClick={() => {
                            if (enableLightbox && currentSlide.type === "image") {
                                setIsLightboxOpen(true)
                            }
                        }}
                    >
                        {/* 1. IMAGE SLIDE */}
                        {currentSlide.type === "image" && (
                            <img
                                src={getZoomImageSource(isHoverZooming, currentSlide.url)}
                                alt={currentSlide.altText || itemName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://cdn.pixy.app/fallback-item.webp"
                                }}
                            />
                        )}

                        {/* 2. VIDEO SLIDE */}
                        {currentSlide.type === "video" && (
                            <div className="w-full h-full bg-black relative flex items-center justify-center">
                                {currentSlide.videoProvider === "mp4" ? (
                                    <video
                                        src={currentSlide.url}
                                        autoPlay
                                        muted={isVideoMuted}
                                        loop
                                        playsInline
                                        controls
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <iframe
                                        src={currentSlide.url}
                                        title={currentSlide.altText || "Video preview"}
                                        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                                        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                                        className="w-full h-full border-0 pointer-events-auto"
                                    />
                                )}

                                {/* Unmute Overlay Button */}
                                {currentSlide.videoProvider === "mp4" && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setIsVideoMuted(!isVideoMuted)
                                        }}
                                        className="absolute bottom-4 right-4 z-20 p-2.5 rounded-full bg-black/70 hover:bg-black text-white shadow-lg backdrop-blur-md transition-all"
                                        aria-label={isVideoMuted ? "Activar audio" : "Silenciar audio"}
                                    >
                                        {isVideoMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* 3. 360 SPIN SLIDE */}
                        {currentSlide.type === "spin360" && currentSlide.spinFrames && (
                            <motion.div
                                drag="x"
                                onDrag={handleSpinDrag}
                                className="w-full h-full flex items-center justify-center cursor-ew-resize relative"
                            >
                                <img
                                    src={currentSlide.spinFrames[spinFrameIdx]}
                                    alt="360 View"
                                    className="w-full h-full object-cover pointer-events-none"
                                />
                                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md">
                                    <Rotate3d className="h-4 w-4 animate-spin text-primary" />
                                    <span>Arrastra 360°</span>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* DESKTOP HOVER MAGNIFIER LENS */}
                {enableZoom && isHoverZooming && currentSlide.type === "image" && (
                    <div
                        className="hidden md:block absolute pointer-events-none rounded-2xl border-2 border-primary/60 shadow-2xl bg-no-repeat z-30"
                        style={{
                            width: `${lensSize}px`,
                            height: `${lensSize}px`,
                            left: `${lensLeft}px`,
                            top: `${lensTop}px`,
                            backgroundImage: `url(${getZoomImageSource(true, currentSlide.url)})`,
                            backgroundSize: `${(zoomCoords.containerWidth || 600) * 2.5}px ${(zoomCoords.containerHeight || 600) * 2.5}px`,
                            backgroundPosition: `${zoomState.bgPositionXPercent}% ${zoomState.bgPositionYPercent}%`,
                        }}
                    />
                )}

                {/* FLOATING TOP-LEFT BADGES */}
                <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-1.5 pointer-events-none">
                    {badges.slice(0, 2).map((b, i) => (
                        <span key={i} className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-black/70 backdrop-blur-md text-white border border-white/20 shadow-md">
                            {b}
                        </span>
                    ))}
                    {currentSlide.type === "video" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-600 text-white shadow-md flex items-center gap-1">
                            <Play className="h-2.5 w-2.5 fill-current" /> Video
                        </span>
                    )}
                </div>

                {/* FULLSCREEN LIGHTBOX TRIGGER BUTTON */}
                {enableLightbox && currentSlide.type === "image" && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsLightboxOpen(true)
                        }}
                        className="absolute top-3 right-3 z-20 p-2 rounded-xl bg-black/50 hover:bg-black/80 text-white/90 hover:text-white backdrop-blur-md transition-all shadow-md"
                        aria-label="Abrir imagen en pantalla completa"
                    >
                        <Maximize2 className="h-4 w-4" />
                    </button>
                )}

                {/* PREV / NEXT NAVIGATION ARROWS */}
                {totalSlides > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                prevSlide()
                            }}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/90 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-100 hover:bg-white dark:hover:bg-zinc-800 shadow-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 focus:opacity-100"
                            aria-label="Foto anterior"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                nextSlide()
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/90 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-100 hover:bg-white dark:hover:bg-zinc-800 shadow-lg backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 focus:opacity-100"
                            aria-label="Siguiente foto"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </>
                )}

                {/* PAGINATION PILL */}
                {totalSlides > 1 && (
                    <div className="absolute bottom-3 right-3 z-20 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-bold shadow-md">
                        {currentIndex + 1} / {totalSlides}
                    </div>
                )}
            </div>

            {/* SYNCHRONIZED THUMBNAIL RIBBON */}
            {totalSlides > 1 && (
                <div
                    ref={thumbnailRibbonRef}
                    className="flex gap-2 overflow-x-auto scrollbar-none py-1 px-0.5"
                    role="tablist"
                    aria-label="Miniaturas de galería"
                >
                    {mediaItems.map((item, idx) => {
                        const isActive = idx === currentIndex

                        return (
                            <button
                                key={item.id}
                                ref={(el) => { thumbnailRefs.current[idx] = el }}
                                type="button"
                                onClick={() => goToSlide(idx)}
                                role="tab"
                                aria-selected={isActive}
                                aria-label={`Ver foto ${idx + 1}`}
                                className={cn(
                                    "relative shrink-0 h-14 w-14 rounded-xl overflow-hidden transition-all duration-200 border-2",
                                    isActive
                                        ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-zinc-950 border-primary scale-105 shadow-md"
                                        : "opacity-60 hover:opacity-100 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400"
                                )}
                            >
                                <img
                                    src={item.thumbnailUrl || item.url}
                                    alt={item.altText || `Miniatura ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = "https://cdn.pixy.app/fallback-item.webp"
                                    }}
                                />
                                {item.type === "video" && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <PlayCircle className="h-4 w-4 text-white" />
                                    </div>
                                )}
                                {item.type === "spin360" && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <Rotate3d className="h-4 w-4 text-white" />
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>
            )}

            {/* LIGHTBOX FULLSCREEN MODAL */}
            {enableLightbox && (
                <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
                    <DialogContent className="fixed inset-0 z-[100] max-w-none w-screen h-screen p-0 bg-black/95 border-none rounded-none flex flex-col justify-between">
                        <VisuallyHidden.Root>
                            <DialogTitle>{itemName} - Vista Completa</DialogTitle>
                            <DialogDescription>Visualizador de alta resolución para fotos de producto</DialogDescription>
                        </VisuallyHidden.Root>

                        {/* Top Bar */}
                        <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent z-10 text-white">
                            <span className="text-sm font-semibold truncate max-w-md">{itemName} ({currentIndex + 1}/{totalSlides})</span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setLightboxScale((s) => clampPinchScale(s - 0.5))}
                                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white"
                                    aria-label="Alejar"
                                >
                                    <ZoomOut className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLightboxScale((s) => clampPinchScale(s + 0.5))}
                                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white"
                                    aria-label="Acercar"
                                >
                                    <ZoomIn className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsLightboxOpen(false)}
                                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white ml-2"
                                    aria-label="Cerrar pantalla completa"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Main Stage */}
                        <div className="relative flex-1 flex items-center justify-center overflow-hidden p-4">
                            {currentSlide.type === "image" && (
                                <motion.img
                                    src={getZoomImageSource(true, currentSlide.url)}
                                    alt={currentSlide.altText || itemName}
                                    style={{ transform: `scale(${lightboxScale})` }}
                                    className="max-h-[85vh] max-w-[90vw] object-contain transition-transform duration-150"
                                />
                            )}

                            {/* Left/Right Lightbox controls */}
                            {totalSlides > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={prevSlide}
                                        className="absolute left-4 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white shadow-xl"
                                        aria-label="Foto anterior"
                                    >
                                        <ChevronLeft className="h-6 w-6" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={nextSlide}
                                        className="absolute right-4 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white shadow-xl"
                                        aria-label="Siguiente foto"
                                    >
                                        <ChevronRight className="h-6 w-6" />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Bottom Lightbox Ribbon */}
                        {totalSlides > 1 && (
                            <div className="flex justify-center gap-2 p-4 bg-gradient-to-t from-black/80 to-transparent overflow-x-auto">
                                {mediaItems.map((item, idx) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => goToSlide(idx)}
                                        className={cn(
                                            "h-12 w-12 rounded-lg overflow-hidden border-2 transition-all",
                                            idx === currentIndex
                                                ? "border-primary scale-110 shadow-lg"
                                                : "opacity-40 hover:opacity-100 border-white/20"
                                        )}
                                    >
                                        <img src={item.thumbnailUrl || item.url} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}
