"use client"

import React, { useState, useEffect } from "react"
import { QrCode, X, Download, Printer, Search, ExternalLink, Check, Copy, Loader2 } from "lucide-react"
import QRCode from "react-qr-code"
import { supabase } from "@/modules/core/database/supabase"

interface TablesQrModalProps {
    tables?: any[]
    portalUrl: string
    orgName: string
    onClose: () => void
}

export function TablesQrModal({ tables: initialTables, portalUrl, orgName, onClose }: TablesQrModalProps) {
    const [tables, setTables] = useState<any[]>(initialTables || [])
    const [loading, setLoading] = useState<boolean>(!initialTables || initialTables.length === 0)
    const [searchTerm, setSearchTerm] = useState("")
    const [copiedId, setCopiedId] = useState<string | null>(null)

    useEffect(() => {
        if (!initialTables || initialTables.length === 0) {
            setLoading(true)
            supabase
                .from('resto_tables')
                .select('*')
                .then(({ data, error }) => {
                    if (data) {
                        setTables(data)
                    }
                    setLoading(false)
                })
        } else {
            setTables(initialTables)
            setLoading(false)
        }
    }, [initialTables])

    const filteredTables = tables.filter(t => 
        (t.table_identifier || `Mesa ${t.id}`).toLowerCase().includes(searchTerm.toLowerCase())
    )

    const downloadSVG = (tableId: string, identifier: string) => {
        const svg = document.getElementById(`qr-table-${tableId}`)
        if (!svg) return
        const svgData = new XMLSerializer().serializeToString(svg)
        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
        const svgUrl = URL.createObjectURL(svgBlob)
        const downloadLink = document.createElement("a")
        downloadLink.href = svgUrl
        downloadLink.download = `QR_Mesa_${identifier}.svg`
        document.body.appendChild(downloadLink)
        downloadLink.click()
        document.body.removeChild(downloadLink)
    }

    const downloadPNG = (tableId: string, identifier: string) => {
        const svg = document.getElementById(`qr-table-${tableId}`) as SVGElement | null
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
                downloadLink.download = `QR_Mesa_${identifier}.png`
                document.body.appendChild(downloadLink)
                downloadLink.click()
                document.body.removeChild(downloadLink)
            }
        }
        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)))
    }

    const handleCopy = (tableId: string, url: string) => {
        navigator.clipboard.writeText(url)
        setCopiedId(tableId)
        setTimeout(() => setCopiedId(null), 2000)
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/40">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-brand-pink/10 text-brand-pink flex items-center justify-center">
                            <QrCode className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                Códigos QR de Mesas
                                <span className="text-xs bg-brand-pink/10 text-brand-pink px-2.5 py-0.5 rounded-full font-bold">
                                    {tables.length} {tables.length === 1 ? 'mesa' : 'mesas'}
                                </span>
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                                Imprime estos QRs para vincular cada mesa al menú digital y recibir pedidos automáticos.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shadow-sm border border-gray-200 dark:border-zinc-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="p-4 px-6 border-b border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por mesa (ej: M-01)..."
                            className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-pink"
                        />
                    </div>
                    <div className="text-xs text-gray-400 font-medium">
                        Se muestra {filteredTables.length} de {tables.length} mesas
                    </div>
                </div>

                {/* Grid of Tables */}
                <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {loading ? (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
                            <Loader2 className="w-8 h-8 animate-spin text-brand-pink" />
                            <span className="text-sm font-semibold">Cargando mesas registradas...</span>
                        </div>
                    ) : filteredTables.length === 0 ? (
                        <div className="col-span-full py-16 text-center text-gray-400 dark:text-zinc-500 font-semibold text-sm border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl">
                            No se encontraron mesas registradas en este restaurante.
                        </div>
                    ) : (
                        filteredTables.map((t) => {
                            const identifier = t.table_identifier || `Mesa ${t.id}`
                            const qrParam = t.qr_token || t.table_identifier || t.id
                            const tableUrl = `${portalUrl}?table=${encodeURIComponent(qrParam)}`

                            return (
                                <div
                                    key={t.id}
                                    className="bg-gray-50/60 dark:bg-zinc-800/40 border border-gray-200/80 dark:border-zinc-700/60 rounded-2xl p-4 flex flex-col items-center text-center space-y-3 hover:border-brand-pink/40 transition-all shadow-sm"
                                >
                                    {/* Table title */}
                                    <div className="flex items-center justify-between w-full border-b border-gray-200/60 dark:border-zinc-700/60 pb-2">
                                        <span className="font-bold text-sm text-gray-900 dark:text-white">
                                            Mesa {identifier}
                                        </span>
                                        <button
                                            onClick={() => handleCopy(t.id, tableUrl)}
                                            className="text-xs text-gray-400 hover:text-brand-pink transition-colors flex items-center gap-1"
                                            title="Copiar enlace"
                                        >
                                            {copiedId === t.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>

                                    {/* QR Frame */}
                                    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200/80 dark:border-zinc-700 flex flex-col items-center justify-center">
                                        <div style={{ height: "130px", width: "130px" }}>
                                            <QRCode
                                                id={`qr-table-${t.id}`}
                                                size={256}
                                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                                value={tableUrl}
                                                viewBox={`0 0 256 256`}
                                            />
                                        </div>
                                    </div>

                                    {/* Download buttons */}
                                    <div className="grid grid-cols-2 gap-2 w-full pt-1">
                                        <button
                                            onClick={() => downloadPNG(t.id, identifier)}
                                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-brand-pink/10 hover:text-brand-pink hover:border-brand-pink/30 transition-all flex items-center justify-center gap-1 shadow-sm"
                                        >
                                            <Download className="w-3 h-3" /> PNG
                                        </button>
                                        <button
                                            onClick={() => downloadSVG(t.id, identifier)}
                                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-brand-pink/10 hover:text-brand-pink hover:border-brand-pink/30 transition-all flex items-center justify-center gap-1 shadow-sm"
                                        >
                                            <Download className="w-3 h-3" /> SVG
                                        </button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 px-6 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    )
}
