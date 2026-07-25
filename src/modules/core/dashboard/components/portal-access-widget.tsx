"use client"

import React, { useState } from "react"
import { Copy, Check, ExternalLink, Download } from "lucide-react"
import QRCode from "react-qr-code"
import { toast } from "sonner"

interface PortalAccessWidgetProps {
    url: string
    orgName: string
}

export function PortalAccessWidget({ url, orgName }: PortalAccessWidgetProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText(url)
        setCopied(true)
        toast.success("Enlace copiado al portapapeles")
        setTimeout(() => setCopied(false), 2000)
    }

    const downloadSVG = () => {
        const svg = document.getElementById("qr-general-menu")
        if (!svg) return
        const svgData = new XMLSerializer().serializeToString(svg)
        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
        const svgUrl = URL.createObjectURL(svgBlob)
        const downloadLink = document.createElement("a")
        downloadLink.href = svgUrl
        downloadLink.download = `QR_Menu_General_${orgName.replace(/\s+/g, "_")}.svg`
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)
        toast.success("Código QR descargado en SVG")
    }

    const downloadPNG = () => {
        const svg = document.getElementById("qr-general-menu") as SVGElement | null
        if (!svg) return
        const svgData = new XMLSerializer().serializeToString(svg)
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        const img = new Image()
        img.onload = () => {
            canvas.width = 512
            canvas.height = 512
            if (ctx) {
                ctx.fillStyle = "#FFFFFF"
                ctx.fillRect(0, 0, canvas.width, canvas.height)
                ctx.drawImage(img, 0, 0, 512, 512)
                const pngUrl = canvas.toDataURL("image/png")
                const downloadLink = document.createElement("a")
                downloadLink.href = pngUrl
                downloadLink.download = `QR_Menu_General_${orgName.replace(/\s+/g, "_")}.png`
                document.body.appendChild(downloadLink)
                downloadLink.click()
                document.body.removeChild(downloadLink)
                toast.success("Código QR descargado en PNG")
            }
        }
        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)))
    }

    return (
        <div className="glass-card bg-white/80 dark:bg-zinc-900/80 border border-gray-200/80 dark:border-zinc-800 backdrop-blur-md rounded-3xl p-5 shadow-sm flex flex-col md:flex-row gap-5 items-center justify-between transition-all">
            {/* Context Info */}
            <div className="flex-1 space-y-2.5 min-w-0 w-full">
                <div>
                    <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                        Acceso Público al Menú: {orgName}
                    </h2>
                    <p className="text-gray-500 dark:text-zinc-400 text-xs mt-0.5 leading-normal">
                        Enlace público del menú digital interactivo para captar pedidos de domicilios y para llevar desde canales digitales.
                    </p>
                </div>

                {/* Unified Toolbar (Input + PNG + SVG + Copiar + Abrir) */}
                <div className="flex flex-wrap items-center gap-2 bg-gray-50 dark:bg-zinc-950/60 p-2 rounded-2xl border border-gray-200/60 dark:border-zinc-800">
                    <input
                        readOnly
                        value={url}
                        className="bg-transparent flex-1 min-w-[200px] outline-none px-2 text-xs text-gray-700 dark:text-gray-300 font-mono font-medium truncate"
                    />

                    {/* Descargar PNG */}
                    <button
                        onClick={downloadPNG}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 hover:bg-brand-pink/10 hover:text-brand-pink hover:border-brand-pink/30 transition-all flex items-center gap-1.5 shadow-sm"
                        title="Descargar código QR en formato PNG"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>PNG</span>
                    </button>

                    {/* Descargar SVG */}
                    <button
                        onClick={downloadSVG}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 hover:bg-brand-pink/10 hover:text-brand-pink hover:border-brand-pink/30 transition-all flex items-center gap-1.5 shadow-sm"
                        title="Descargar código QR en formato SVG"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>SVG</span>
                    </button>

                    {/* Copiar Enlace */}
                    <button
                        onClick={handleCopy}
                        className="px-3 py-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded-xl transition-colors text-gray-700 dark:text-gray-200 flex items-center gap-1.5 text-xs font-bold border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                        title="Copiar enlace al portapapeles"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? "Copiado" : "Copiar"}</span>
                    </button>

                    {/* Abrir Portal */}
                    <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 hover:bg-brand-pink/10 hover:text-brand-pink rounded-xl transition-colors text-gray-700 dark:text-gray-200 flex items-center gap-1.5 text-xs font-bold border border-transparent"
                        title="Abrir en pestaña nueva"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Abrir</span>
                    </a>
                </div>
            </div>

            {/* QR Frame Compact (Clean & Height Optimized) */}
            <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-gray-200/80 dark:border-zinc-700/80 shrink-0">
                <div style={{ height: "105px", width: "105px" }}>
                    <QRCode
                        id="qr-general-menu"
                        size={256}
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                        value={url}
                        viewBox={`0 0 256 256`}
                    />
                </div>
            </div>
        </div>
    )
}
