"use client"

import React, { useState } from "react"
import { Copy, Check, ExternalLink, QrCode } from "lucide-react"
import QRCode from "react-qr-code"

interface PortalAccessWidgetProps {
    url: string
    orgName: string
}

export function PortalAccessWidget({ url, orgName }: PortalAccessWidgetProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-8 items-center justify-between">
            <div className="flex-1 space-y-4">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-primary" />
                        Acceso Público: {orgName}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Este es el enlace oficial para que tus clientes puedan ver el menú interactivo, hacer pedidos y rastrear sus compras. Puedes imprimir este código QR y colocarlo en las mesas o el mostrador.</p>
                </div>

                <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-950 p-2 rounded-lg border border-gray-100 dark:border-zinc-800">
                    <input
                        readOnly
                        value={url}
                        className="bg-transparent flex-1 outline-none px-2 text-sm text-gray-700 dark:text-gray-300 font-medium truncate"
                    />
                    <button
                        onClick={handleCopy}
                        className="p-2 hover:bg-white dark:hover:bg-zinc-800 rounded-md transition-colors text-gray-500 hover:text-gray-900 dark:hover:text-white"
                        title="Copiar enlace"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 hover:bg-primary/10 hover:text-primary rounded-md transition-colors text-gray-500 hover:text-primary"
                        title="Abrir en pestaña nueva"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col items-center gap-2 shrink-0">
                <div style={{ height: "140px", margin: "0 auto", maxWidth: "140px", width: "100%" }}>
                    <QRCode
                        size={256}
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                        value={url}
                        viewBox={`0 0 256 256`}
                    />
                </div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-2">Menú QR</span>
            </div>
        </div>
    )
}
