import { describe, it, expect } from "vitest"
import {
    formatCOPCurrency,
    convertCOPToWompiCents,
    isNewItem,
    shouldShowLowStockBadge,
    calculateDiscountBadge,
    getDisplayedBadges,
    evaluateDynamicBadges,
    calculateStorefrontPricing,
    calculateEffectiveTotalPrice,
    calculateCatalogItemPrice
} from "./status-badge"

describe("StatusBadge and Pricing Engine Test Suite", () => {
    describe("Currency Formatting & Conversion", () => {
        it("formats COP with Colombian thousand dots and COP suffix", () => {
            expect(formatCOPCurrency(1250000)).toBe("$1.250.000 COP")
            expect(formatCOPCurrency(0)).toBe("$0 COP")
            expect(formatCOPCurrency(-500)).toBe("$0 COP")
        })

        it("converts COP to Wompi cents (integer multiplied by 100)", () => {
            expect(convertCOPToWompiCents(15000)).toBe(1500000)
            expect(convertCOPToWompiCents(0)).toBe(0)
            expect(convertCOPToWompiCents(-100)).toBe(0)
        })
    })

    describe("Dynamic Badge Evaluation", () => {
        it("detects new items created within 30 days", () => {
            const now = new Date()
            const recent = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
            const old = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString()

            expect(isNewItem(recent, now.toISOString())).toBe(true)
            expect(isNewItem(old, now.toISOString())).toBe(false)
        })

        it("calculates discount badge string", () => {
            expect(calculateDiscountBadge(80000, 100000)).toBe("-20%")
            expect(calculateDiscountBadge(100000, 100000)).toBeNull()
            expect(calculateDiscountBadge(120000, 100000)).toBeNull()
        })

        it("triggers low stock badge when inventory is below threshold", () => {
            expect(shouldShowLowStockBadge(3, 5, true)).toBe(true)
            expect(shouldShowLowStockBadge(10, 5, true)).toBe(false)
            expect(shouldShowLowStockBadge(0, 5, true)).toBe(false) // 0 is sold out, not low stock
            expect(shouldShowLowStockBadge(3, 5, false)).toBe(false) // untracked inventory
        })

        it("evaluates and deduplicates dynamic badges", () => {
            const item = {
                base_price: 80000,
                compare_at_price: 100000,
                created_at: new Date().toISOString(),
                track_inventory: true,
                inventory_quantity: 2,
                low_stock_threshold: 5,
                badges: ["Destacado"]
            }
            const badges = evaluateDynamicBadges(item)
            expect(badges).toContain("Destacado")
            expect(badges).toContain("Descuento -20%")
            expect(badges).toContain("Novedad")
            expect(badges).toContain("Pocas Unidades")
        })
    })

    describe("Pricing Recalculation Engine", () => {
        it("accurately calculates pricing with variant override, add-ons, and quantity", () => {
            const item = { base_price: 100000, compare_at_price: 150000 }
            const variant = { id: "v1", title: "Pro", price_override: 120000, price_modifier: 20000, is_active: true, attributes: {}, sku: "PRO" }
            const addons = [
                { name: "Addon 1", priceDelta: 20000, quantity: 2 }, // 40000
                { name: "Addon 2", priceDelta: 10000, quantity: 1 }  // 10000
            ]
            const result = calculateStorefrontPricing(item, variant, addons, 2, "COP")

            // Unit price = 120000 + 40000 + 10000 = 170000
            expect(result.unitPrice).toBe(170000)
            // Total price for qty 2 = 170000 * 2 = 340000
            expect(result.bundleTotalPrice).toBe(340000)
        })

        it("enforces zero floor protection against negative prices", () => {
            const item = { base_price: 10000 }
            const variant = { id: "v1", title: "Discounted", price_modifier: -50000, is_active: true, attributes: {}, sku: "DISC" }
            const result = calculateStorefrontPricing(item, variant, [], 1, "COP")
            expect(result.unitPrice).toBe(0)
            expect(result.bundleTotalPrice).toBe(0)
        })
    })
})
