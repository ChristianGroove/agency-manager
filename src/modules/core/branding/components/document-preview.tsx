"use client"

import { BrandingConfig } from "../actions"
import { cn } from "@/lib/utils"

interface DocumentPreviewProps {
    settings: BrandingConfig
}

export function DocumentPreview({ settings }: DocumentPreviewProps) {

    // Derived styles
    const brandColor = settings.colors?.primary || '#0F172A'
    const logoUrl = settings.logos?.main || '/branding/logo dark.svg' // Fallback to main
    const agencyName = settings.name || "YOUR AGENCY"

    // Note: We don't have 'invoice_footer' in BrandingConfig yet, 
    // will need to add it or ignore for now.

    return (
        <div className="w-full bg-gray-100 rounded-lg p-8 overflow-hidden flex flex-col items-center">

            {/* A4 Paper Simulation (Scaled down) */}
            <div className="bg-white shadow-xl w-full max-w-[400px] aspect-[1/1.414] p-6 text-[10px] leading-tight flex flex-col relative transition-all">

                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                    <div className="w-24">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="w-full object-contain" />
                        ) : (
                            <div className="font-bold text-lg">{agencyName}</div>
                        )}
                        <div className="mt-2 text-gray-500">
                            <p>{agencyName}</p>
                            <p>NIT: 900.000.000-1</p>
                            <p>Calle 123 # 45-67</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-lg font-bold" style={{ color: brandColor }}>CUENTA DE COBRO</h2>
                        <p className="text-gray-500"># 1024</p>
                        <div className="mt-2">
                            <span className="bg-red-100 text-red-600 px-1 py-0.5 rounded text-[8px] font-bold">PENDIENTE</span>
                        </div>
                    </div>
                </div>

                {/* Bill To */}
                <div className="mb-6 ml-[50%]">
                    <h3 className="font-bold text-gray-900 mb-1">CLIENTE:</h3>
                    <p className="text-sm">Acme Corp S.A.S.</p>
                    <p className="text-gray-500">NIT: 800.123.456</p>
                    <p className="text-gray-500">bogota@acme.com</p>
                </div>

                {/* Dates */}
                <div className="border-t border-b border-gray-200 py-2 flex justify-between mb-4">
                    <div>
                        <span className="text-gray-500 block">FECHA DE EMISIÓN</span>
                        <span className="font-bold">Jan 01, 2026</span>
                    </div>
                    <div className="text-right">
                        <span className="text-gray-500 block">FECHA DE VENCIMIENTO</span>
                        <span className="font-bold">Jan 15, 2026</span>
                    </div>
                </div>

                {/* Items Table */}
                <div className="mb-4">
                    <div className="grid grid-cols-12 py-1 font-bold text-white mb-2" style={{ backgroundColor: brandColor }}>
                        <div className="col-span-6 pl-2">DESCRIPCIÓN</div>
                        <div className="col-span-2 text-center">CANT</div>
                        <div className="col-span-2 text-right">PRECIO</div>
                        <div className="col-span-2 text-right pr-2">TOTAL</div>
                    </div>
                    {[1, 2].map(i => (
                        <div key={i} className="grid grid-cols-12 py-1 border-b border-gray-100 text-gray-600">
                            <div className="col-span-6 pl-2">Servicio Profesional {i}</div>
                            <div className="col-span-2 text-center">1</div>
                            <div className="col-span-2 text-right">$500,000</div>
                            <div className="col-span-2 text-right pr-2">$500,000</div>
                        </div>
                    ))}
                </div>

                {/* Totals */}
                <div className="mt-auto pt-4 flex flex-col items-end">
                    <div className="flex justify-between w-1/2 mb-1">
                        <span className="text-gray-500">Subtotal:</span>
                        <span>$1,000,000</span>
                    </div>
                    <div className="flex justify-between w-1/2 border-t pt-1">
                        <span className="font-bold text-sm" style={{ color: brandColor }}>TOTAL</span>
                        <span className="font-bold text-sm">$1,000,000</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center text-gray-400 mt-6 text-[8px]">
                    <p>Resolución de Facturación No. 18760000001</p>
                    <p>Generado por Agency Manager</p>
                </div>

            </div>

            <p className="mt-4 text-xs text-gray-400">Preview del PDF generado</p>
        </div>
    )
}
