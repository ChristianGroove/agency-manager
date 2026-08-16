"use client"

import React, { useState, useEffect, useRef } from "react"
import { UniversalCatalogItem, CatalogVariant } from "@/types/catalog"
import { generateCatalogQRCodeAction } from "@/modules/features/catalog/qr-actions"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  QrCode,
  Download,
  Copy,
  ExternalLink,
  Loader2,
  Share2,
  Check,
  Palette,
} from "lucide-react"
import { toast } from "sonner"

export interface QRCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: UniversalCatalogItem | null
  portalToken?: string | null
  organizationId?: string | null
  themeColor?: string
}

export function QRCodeDialog({
  open,
  onOpenChange,
  item,
  portalToken,
  organizationId,
  themeColor = "#0f172a",
}: QRCodeDialogProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string>("all")
  const [darkColor, setDarkColor] = useState<string>(themeColor || "#0f172a")
  const [lightColor, setLightColor] = useState<string>("#ffffff")
  const [qrSize, setQrSize] = useState<number>(300)
  const [qrSvg, setQrSvg] = useState<string>("")
  const [qrDataUrl, setQrDataUrl] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [copied, setCopied] = useState<boolean>(false)

  // Construct Deep Link URL
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://pixy.agency"
  const portalPath = portalToken ? `/portal?token=${portalToken}` : "/portal"

  const deepLink = React.useMemo(() => {
    if (!item) return ""
    let url = `${baseUrl}${portalPath}&service=${item.id}`
    if (selectedVariantId && selectedVariantId !== "all") {
      url += `&variant=${selectedVariantId}`
    }
    return url
  }, [baseUrl, portalPath, item, selectedVariantId])

  // Fetch or generate QR Code SVG & Data URL
  const generateQR = async () => {
    if (!deepLink || !item) return
    setIsGenerating(true)
    try {
      const res = await generateCatalogQRCodeAction({
        url: deepLink,
        title: item.name,
        size: qrSize,
        darkColor,
        lightColor,
      })

      if (res.success) {
        setQrSvg(res.svg)
        setQrDataUrl(res.dataUrl)
      } else {
        toast.error("Error al generar código QR")
      }
    } catch (err: any) {
      console.error("QR generation error:", err)
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    if (open && item) {
      generateQR()
    }
  }, [open, deepLink, darkColor, lightColor, qrSize])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(deepLink)
    setCopied(true)
    toast.success("Enlace copiado al portapapeles")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadSVG = () => {
    if (!qrSvg) return
    const blob = new Blob([qrSvg], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `qr-${item?.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "producto"}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("Código QR SVG descargado")
  }

  const handleDownloadPNG = () => {
    if (!qrSvg) return
    const canvas = document.createElement("canvas")
    canvas.width = 1024
    canvas.height = 1024
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new Image()
    const svgBlob = new Blob([qrSvg], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(svgBlob)

    img.onload = () => {
      ctx.drawImage(img, 0, 0, 1024, 1024)
      const pngUrl = canvas.toDataURL("image/png")
      const a = document.createElement("a")
      a.href = pngUrl
      a.download = `qr-${item?.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "producto"}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Código QR PNG (Alta Resolución) descargado")
    }
    img.src = url
  }

  if (!item) return null

  const variants = item.variants || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl p-6 border border-zinc-200 dark:border-white/10 shadow-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-brand-pink">
            <QrCode className="h-5 w-5" />
            <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-white">
              Código QR de Producto
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-500">
            Escanea directamente para abrir {item.name} en el portal interactivo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* QR Display Card */}
          <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 relative min-h-[260px]">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-brand-pink" />
                <span className="text-xs text-zinc-500">Generando QR...</span>
              </div>
            ) : qrSvg ? (
              <div
                className="rounded-2xl p-3 shadow-md bg-white border border-zinc-200/60 max-w-[220px]"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            ) : (
              <QrCode className="h-24 w-24 text-zinc-300" />
            )}

            <div className="mt-3 text-center">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block truncate max-w-xs">
                {item.name}
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">
                ${item.base_price?.toLocaleString()} COP
              </span>
            </div>
          </div>

          {/* Variant Selector (if has variants) */}
          {variants.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Vincular a una Variante Específica</Label>
              <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue placeholder="Producto Principal (Sin variante preseleccionada)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el Producto (General)</SelectItem>
                  {variants.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.title || v.sku || "Variante"} (+${(v.price_modifier || 0).toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Color & Style Controls */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Color del Código</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={darkColor}
                  onChange={(e) => setDarkColor(e.target.value)}
                  className="h-8 w-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                />
                <Input
                  value={darkColor}
                  onChange={(e) => setDarkColor(e.target.value)}
                  className="h-8 text-xs font-mono rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Color de Fondo</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={lightColor}
                  onChange={(e) => setLightColor(e.target.value)}
                  className="h-8 w-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                />
                <Input
                  value={lightColor}
                  onChange={(e) => setLightColor(e.target.value)}
                  className="h-8 text-xs font-mono rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Deep Link URL Copy Bar */}
          <div className="flex items-center gap-2 p-2 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
            <Input
              readOnly
              value={deepLink}
              className="h-8 text-xs font-mono border-0 bg-transparent shadow-none focus-visible:ring-0 truncate"
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleCopyLink}
              className="h-8 px-3 rounded-xl text-xs font-bold shrink-0 gap-1"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
        </div>

        {/* Footer Downloads */}
        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadSVG}
            disabled={!qrSvg}
            className="rounded-xl text-xs font-semibold gap-1.5 flex-1"
          >
            <Download className="h-3.5 w-3.5" />
            Descargar SVG
          </Button>
          <Button
            type="button"
            onClick={handleDownloadPNG}
            disabled={!qrSvg}
            className="rounded-xl bg-brand-pink hover:bg-brand-pink/90 text-white text-xs font-bold gap-1.5 flex-1 shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            Descargar PNG (1024px)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
