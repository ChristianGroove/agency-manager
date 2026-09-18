import { describe, it, expect } from "vitest"
import {
    normalizeBannerSlides,
    interpolateTokens,
    getTextColorClass,
    GlobalBannerConfig,
    GlobalBannerSlide
} from "./global-dashboard-banner"

describe("GlobalDashboardBanner Multi-Slide Engine", () => {
    describe("normalizeBannerSlides (Backward Compatibility)", () => {
        it("should gracefully handle null/undefined config", () => {
            expect(normalizeBannerSlides(null)).toEqual([])
            expect(normalizeBannerSlides(undefined)).toEqual([])
        })

        it("should normalize legacy banner with single string description into 1 slide with default 8s phrase", () => {
            const legacyConfig: GlobalBannerConfig = {
                id: "legacy-123",
                space_type: "agency",
                title: "Banner Tradicional",
                description: "Texto simple de la versión anterior",
                media_type: "json_lottie",
                media_url: "/animations/test.json",
                layout_pos: "right",
                theme: "brand_primary",
                is_active: true
            }

            const slides = normalizeBannerSlides(legacyConfig)
            expect(slides).toHaveLength(1)
            expect(slides[0].id).toBe("legacy-legacy-123")
            expect(slides[0].title).toBe("Banner Tradicional")
            expect(slides[0].phrases).toHaveLength(1)
            expect(slides[0].phrases[0].text).toBe("Texto simple de la versión anterior")
            expect(slides[0].phrases[0].durationSeconds).toBe(8)
            expect(slides[0].media_url).toBe("/animations/test.json")
            expect(slides[0].theme).toBe("brand_primary")
        })

        it("should normalize legacy banner with array of descriptions into 1 slide with multiple 8s phrases", () => {
            const legacyConfig: GlobalBannerConfig = {
                id: "legacy-456",
                space_type: "resto",
                title: "Resto Banner",
                description: ["Tip 1 de cocina", "Tip 2 de mesas", "Tip 3 de pedidos"],
                is_active: true
            }

            const slides = normalizeBannerSlides(legacyConfig)
            expect(slides).toHaveLength(1)
            expect(slides[0].phrases).toHaveLength(3)
            expect(slides[0].phrases[0]).toEqual({ text: "Tip 1 de cocina", durationSeconds: 8 })
            expect(slides[0].phrases[1]).toEqual({ text: "Tip 2 de mesas", durationSeconds: 8 })
            expect(slides[0].phrases[2]).toEqual({ text: "Tip 3 de pedidos", durationSeconds: 8 })
        })

        it("should preserve modern multi-slide sequence with custom durations and hierarchy", () => {
            const multiSlideConfig: GlobalBannerConfig = {
                id: "multi-789",
                space_type: "retail",
                is_active: true,
                slides: [
                    {
                        id: "s1",
                        kicker: "PROMO",
                        kickerColor: "amber",
                        title: "Gran Venta",
                        titleColor: "emerald",
                        showSubtitle: true,
                        subtitle: "Aprovecha descuentos",
                        subtitleColor: "muted",
                        phrases: [
                            { text: "Frase rápida", durationSeconds: 4 },
                            { text: "Frase extendida", durationSeconds: 7 }
                        ],
                        phrasesColor: "cyan",
                        cta_text: "Comprar",
                        cta_url: "/shop",
                        cta_open_new_tab: true,
                        cta_variant: "secondary",
                        media_type: "image",
                        media_url: "https://example.com/promo.png",
                        layout_pos: "left",
                        theme: "dark"
                    },
                    {
                        id: "s2",
                        title: "Nueva Colección",
                        phrases: [{ text: "Llegaron nuevos productos", durationSeconds: 5 }],
                        media_type: "json_lottie",
                        media_url: "/animations/box.json",
                        layout_pos: "right",
                        theme: "light"
                    }
                ]
            }

            const slides = normalizeBannerSlides(multiSlideConfig)
            expect(slides).toHaveLength(2)

            // Slide 1 checks
            expect(slides[0].kicker).toBe("PROMO")
            expect(slides[0].kickerColor).toBe("amber")
            expect(slides[0].title).toBe("Gran Venta")
            expect(slides[0].titleColor).toBe("emerald")
            expect(slides[0].showSubtitle).toBe(true)
            expect(slides[0].subtitle).toBe("Aprovecha descuentos")
            expect(slides[0].phrases).toHaveLength(2)
            expect(slides[0].phrases[0].durationSeconds).toBe(4)
            expect(slides[0].phrases[1].durationSeconds).toBe(7)
            expect(slides[0].cta_open_new_tab).toBe(true)
            expect(slides[0].layout_pos).toBe("left")

            // Slide 2 checks
            expect(slides[1].title).toBe("Nueva Colección")
            expect(slides[1].phrases[0].durationSeconds).toBe(5)
            expect(slides[1].theme).toBe("light")
        })
    })

    describe("interpolateTokens (Dynamic Variables)", () => {
        it("should replace tokens when provided in context", () => {
            const raw = "Hola {user_name}, bienvenido a {org_name} en tu espacio {space_name}!"
            const result = interpolateTokens(raw, {
                userName: "Carlos",
                orgName: "Acme Corp",
                spaceName: "Agencia"
            })
            expect(result).toBe("Hola Carlos, bienvenido a Acme Corp en tu espacio Agencia!")
        })

        it("should fallback gracefully when tokens are not in context", () => {
            const raw = "Bienvenido {user_name} de {org_name} ({space_name})"
            const result = interpolateTokens(raw, {})
            expect(result).toBe("Bienvenido Usuario de Tu Empresa (Pixy)")
        })

        it("should handle empty or null string without errors", () => {
            expect(interpolateTokens("", { userName: "Carlos" })).toBe("")
        })
    })

    describe("getTextColorClass (Dark/Light Safe Color Roles)", () => {
        it("should map semantic color roles to proper Tailwind or CSS variable classes", () => {
            expect(getTextColorClass("brand_primary")).toContain("var(--brand-pink")
            expect(getTextColorClass("brand_secondary")).toContain("var(--brand-cyan")
            expect(getTextColorClass("muted")).toContain("text-gray-600 dark:text-gray-300")
            expect(getTextColorClass("emerald")).toContain("text-emerald-600 dark:text-emerald-400")
            expect(getTextColorClass("amber")).toContain("text-amber-600 dark:text-amber-400")
            expect(getTextColorClass("cyan")).toContain("text-cyan-600 dark:text-cyan-400")
            expect(getTextColorClass("indigo")).toContain("text-indigo-600 dark:text-indigo-400")
            expect(getTextColorClass("white")).toContain("text-white")
            expect(getTextColorClass("default", "custom-fallback")).toBe("custom-fallback")
        })
    })
})
