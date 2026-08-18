"use client"

import React, { useState, useEffect } from "react"
import { StorefrontHeroConfig, StorefrontHeroSlide } from "@/types/catalog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sparkles,
  ArrowRight,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"

export interface StorefrontHeroBannerProps {
  hero?: StorefrontHeroConfig
  primaryColor?: string
  secondaryColor?: string
  onWhatsAppClick?: () => void
  isDarkTheme?: boolean
  className?: string
  isPreview?: boolean
}

export function StorefrontHeroBanner({
  hero,
  primaryColor = "#4F46E5",
  secondaryColor = "#EC4899",
  onWhatsAppClick,
  isDarkTheme = false,
  className,
  isPreview = false,
}: StorefrontHeroBannerProps) {
  if (!hero || hero.enabled === false) return null

  const bgType = hero.background_type || (hero.slides && hero.slides.length > 0 ? "slideshow" : hero.bg_image_url ? "image" : "gradient")
  const slides: StorefrontHeroSlide[] = hero.slides || []
  const hasSlides = bgType === "slideshow" && slides.length > 0

  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // Auto-play for Slideshow
  useEffect(() => {
    if (!hasSlides || slides.length <= 1 || isPaused) return
    const interval = setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % slides.length)
    }, hero.slide_interval || 5000)
    return () => clearInterval(interval)
  }, [hasSlides, slides.length, isPaused, hero.slide_interval])

  const handlePrevSlide = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setActiveSlideIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1))
  }

  const handleNextSlide = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setActiveSlideIndex((prev) => (prev + 1) % slides.length)
  }

  const currentSlide = hasSlides ? slides[activeSlideIndex] : null

  // Text alignment classes
  const textAlign = hero.text_align || "center"
  const alignContainerClass =
    textAlign === "left"
      ? "text-left items-start mr-auto"
      : textAlign === "right"
      ? "text-right items-end ml-auto"
      : "text-center items-center mx-auto"

  const alignButtonsClass =
    textAlign === "left"
      ? "justify-start"
      : textAlign === "right"
      ? "justify-end"
      : "justify-center"

  // Banner height classes
  const heightClass =
    hero.banner_height === "compact"
      ? isPreview ? "py-6 min-h-[160px]" : "py-10 sm:py-14 min-h-[240px]"
      : hero.banner_height === "tall"
      ? isPreview ? "py-16 min-h-[300px]" : "py-24 sm:py-36 min-h-[480px]"
      : hero.banner_height === "full"
      ? isPreview ? "min-h-[350px] py-16" : "min-h-[70vh] py-20"
      : isPreview ? "py-10 min-h-[220px]" : "py-16 sm:py-24 min-h-[340px]"

  // Overlay opacity (default 40%)
  const overlayOpacity = typeof hero.overlay_opacity === "number" ? hero.overlay_opacity / 100 : 0.4

  // Active texts (override from active slide if present)
  const title = currentSlide?.title || hero.title || ""
  const subtitle = currentSlide?.subtitle || hero.subtitle || ""
  const badgeText = currentSlide?.badge_text || hero.badge_text || ""
  const ctaText = currentSlide?.cta_text || hero.cta_text || "Explorar Catálogo"
  const ctaUrl = currentSlide?.cta_url || hero.cta_url || "#catalog"
  const isCtaEnabled = hero.cta_enabled !== false && !!ctaText
  const isWhatsAppEnabled = hero.whatsapp_cta_enabled !== false
  const whatsappCtaText = hero.whatsapp_cta_text || "WhatsApp Directo"
  const hideText = hero.hide_text || (!title && !subtitle)

  // Clickable slide wrapper if in graphical mode
  const slideLink = currentSlide?.link_url || hero.cta_url

  return (
    <section
      className={cn(
        "relative overflow-hidden text-white flex flex-col justify-center transition-all select-none",
        heightClass,
        bgType === "gradient" && (hero.bg_gradient || "bg-gradient-to-br from-indigo-950 via-slate-950 to-black"),
        className
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* 1. SINGLE IMAGE BACKGROUND */}
      {bgType === "image" && hero.bg_image_url && (
        <div className="absolute inset-0 z-0">
          <img
            src={hero.bg_image_url}
            alt={title || "Banner"}
            className="w-full h-full object-cover object-center"
          />
          {/* Contrast Overlay */}
          {!hideText && (
            <div
              className="absolute inset-0 bg-black"
              style={{ opacity: overlayOpacity }}
            />
          )}
        </div>
      )}

      {/* 2. SLIDESHOW / MULTI-BANNER BACKGROUND */}
      {hasSlides && (
        <div className="absolute inset-0 z-0">
          {slides.map((slide, idx) => (
            <div
              key={slide.id || idx}
              className={cn(
                "absolute inset-0 transition-opacity duration-700 ease-in-out",
                idx === activeSlideIndex ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
              )}
            >
              <img
                src={slide.image_url}
                alt={slide.title || `Slide ${idx + 1}`}
                className="w-full h-full object-cover object-center"
              />
              {!hideText && (
                <div
                  className="absolute inset-0 bg-black"
                  style={{ opacity: overlayOpacity }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* 3. GRADIENT AMBIENT GLOW ORBS */}
      {bgType === "gradient" && (
        <>
          <div
            className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl opacity-30 pointer-events-none"
            style={{ backgroundColor: primaryColor }}
          />
          <div
            className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-25 pointer-events-none"
            style={{ backgroundColor: secondaryColor }}
          />
        </>
      )}

      {/* 4. CONTENT LAYER (TEXT + CTAS) */}
      {!hideText ? (
        <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
          <div className={cn("flex flex-col space-y-4 max-w-3xl", alignContainerClass)}>
            {badgeText && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold tracking-wide uppercase shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>{badgeText}</span>
              </div>
            )}

            {title && (
              <h1 className={cn(
                "font-black tracking-tight leading-tight sm:leading-tight drop-shadow-md",
                isPreview ? "text-xl sm:text-2xl" : "text-3xl sm:text-5xl"
              )}>
                {title}
              </h1>
            )}

            {subtitle && (
              <p className={cn(
                "text-zinc-200 font-normal leading-relaxed max-w-2xl drop-shadow-sm",
                isPreview ? "text-xs line-clamp-2" : "text-sm sm:text-lg"
              )}>
                {subtitle}
              </p>
            )}

            {/* CTA Buttons */}
            {(isCtaEnabled || isWhatsAppEnabled) && (
              <div className={cn("flex flex-wrap items-center gap-3 pt-2", alignButtonsClass)}>
                {isCtaEnabled && (
                  <a
                    href={ctaUrl}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full font-black text-white shadow-xl hover:opacity-95 transition-all hover:scale-105",
                      isPreview ? "px-4 py-2 text-[11px]" : "px-6 py-3.5 text-xs"
                    )}
                    style={{ backgroundColor: primaryColor }}
                  >
                    <span>{ctaText}</span>
                    <ArrowRight className="h-4 w-4" />
                  </a>
                )}

                {isWhatsAppEnabled && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onWhatsAppClick) onWhatsAppClick()
                    }}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full font-bold bg-white/15 hover:bg-white/25 border border-white/25 text-white backdrop-blur-md transition-all shadow-md hover:scale-105 cursor-pointer",
                      isPreview ? "px-4 py-2 text-[11px]" : "px-6 py-3.5 text-xs"
                    )}
                  >
                    <MessageCircle className="h-4 w-4 text-emerald-400" />
                    <span>{whatsappCtaText}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Pure Graphic Banner Mode (Full clickable surface if link configured) */
        slideLink && (
          <a
            href={slideLink}
            className="absolute inset-0 z-20 flex items-end justify-end p-4 focus:outline-none"
            aria-label="Abrir enlace del banner"
          >
            <span className="sr-only">Ir a {slideLink}</span>
          </a>
        )
      )}

      {/* 5. SLIDESHOW NAVIGATION CHEVRONS (Overlay) */}
      {hasSlides && slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrevSlide}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-black/40 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all hover:scale-110 active:scale-95 shadow-lg cursor-pointer"
            aria-label="Slide anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={handleNextSlide}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-black/40 hover:bg-black/70 border border-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all hover:scale-110 active:scale-95 shadow-lg cursor-pointer"
            aria-label="Slide siguiente"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10">
            {slides.map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveSlideIndex(dotIdx)
                }}
                className={cn(
                  "h-2 rounded-full transition-all duration-300 cursor-pointer",
                  activeSlideIndex === dotIdx ? "w-6 bg-white shadow-sm" : "w-2 bg-white/40 hover:bg-white/70"
                )}
                aria-label={`Ir al slide ${dotIdx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
