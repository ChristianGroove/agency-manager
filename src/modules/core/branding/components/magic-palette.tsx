"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Wand2, Loader2, Check } from "lucide-react"
import { toast } from "sonner"

interface MagicPaletteProps {
    imageUrl: string | null
    onColorsFound: (colors: { primary: string, secondary: string }) => void
}

export function MagicPalette({ imageUrl, onColorsFound }: MagicPaletteProps) {
    const [analyzing, setAnalyzing] = useState(false)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const analyzeImage = () => {
        if (!imageUrl) return
        setAnalyzing(true)

        const img = new Image()
        img.crossOrigin = "Anonymous"
        img.src = imageUrl

        img.onload = () => {
            try {
                const canvas = canvasRef.current
                if (!canvas) return

                const ctx = canvas.getContext('2d')
                if (!ctx) return

                canvas.width = img.width
                canvas.height = img.height
                ctx.drawImage(img, 0, 0)

                // Simple Quantization Algorithm
                // 1. Sample pixels
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                const data = imageData.data
                const colorCounts: Record<string, number> = {}
                let maxCount = 0
                let dominantColor = { r: 0, g: 0, b: 0 }

                // Step 5px for performance
                for (let i = 0; i < data.length; i += 4 * 20) {
                    const r = data[i]
                    const g = data[i + 1]
                    const b = data[i + 2]
                    const a = data[i + 3]

                    if (a < 128) continue // Skip transparent
                    if (r > 240 && g > 240 && b > 240) continue // Skip white-ish
                    if (r < 20 && g < 20 && b < 20) continue // Skip black-ish

                    const key = `${Math.round(r / 10) * 10},${Math.round(g / 10) * 10},${Math.round(b / 10) * 10}`
                    colorCounts[key] = (colorCounts[key] || 0) + 1

                    if (colorCounts[key] > maxCount) {
                        maxCount = colorCounts[key]
                        dominantColor = { r, g, b }
                    }
                }

                // Convert to Hex
                const toHex = (c: { r: number, g: number, b: number }) => {
                    return "#" + [c.r, c.g, c.b].map(x => {
                        const hex = x.toString(16)
                        return hex.length === 1 ? "0" + hex : hex
                    }).join("")
                }

                const primaryHex = toHex(dominantColor)

                // Find "Accent" - Color with most different Hue but decent saturation
                // Simplified: Just inverse or find complementary for now, typically nice.
                // Or: secondary buckets.
                // Let's generate a complementary logic manually for simplicity and "safe" design

                // Simple shift
                const secondaryColor = {
                    r: Math.max(0, dominantColor.r - 50),
                    g: Math.max(0, dominantColor.g - 50),
                    b: Math.min(255, dominantColor.b + 100)
                }
                const secondaryHex = toHex(secondaryColor)

                onColorsFound({
                    primary: primaryHex,
                    secondary: secondaryHex
                })

                toast.success("Magic Palette applied!")

            } catch (e) {
                console.error("Color analysis failed", e)
                toast.error("Could not extract colors (CORS usually)")
            } finally {
                setAnalyzing(false)
            }
        }

        img.onerror = () => {
            setAnalyzing(false)
            toast.error("Could not load image for analysis")
        }
    }

    if (!imageUrl) return null

    return (
        <div className="flex items-center gap-4 p-4 border rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20">
            <div className="p-3 bg-white dark:bg-zinc-900 rounded-full shadow-sm">
                <Wand2 className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="flex-1">
                <h4 className="font-semibold text-sm text-indigo-900 dark:text-indigo-200">Magic Palette</h4>
                <p className="text-xs text-indigo-700 dark:text-indigo-400">
                    Use AI to extract the best colors from your logo directly.
                </p>
            </div>
            <Button
                size="sm"
                variant="outline"
                onClick={analyzeImage}
                disabled={analyzing}
                className="bg-white/50 border-indigo-200 hover:bg-white text-indigo-700"
            >
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {analyzing ? "Thinking..." : "Apply Magic"}
            </Button>

            {/* Hidden Canvas for computation */}
            <canvas ref={canvasRef} className="hidden" />
        </div>
    )
}
