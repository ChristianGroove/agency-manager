"use client"

import { forwardRef } from "react"
import { cn } from "@/lib/utils"

interface InvoiceTemplateProps {
    invoice: any
    settings: any
}

// Letter size dimensions in pixels at 96 DPI
// Width: 8.5in * 96 = 816px
// Height: 11in * 96 = 1056px

export const InvoiceTemplate = forwardRef<HTMLDivElement, InvoiceTemplateProps>(
    ({ invoice, settings }, ref) => {
        return (
            <div
                ref={ref}
                className="w-full bg-white text-gray-900 shadow-lg border border-gray-200 relative overflow-hidden rounded-xl mx-auto print:shadow-none print:border-none print:rounded-none"
                style={{
                    width: '816px',
                    height: '1056px',
                    padding: '32px',
                    maxWidth: '100%',
                }}
            >
                {/* Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                    <img
                        src="/pixy-isotipo.png"
                        alt="Watermark"
                        className="w-[80%] opacity-[0.03] object-contain"
                    />
                </div>

                <div className="flex flex-col h-full relative z-10">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-900">
                        <div className="flex flex-col items-center">
                            <img src={settings?.agency_logo || "/branding/logo dark.svg"} alt="Agency Logo" className="h-11 w-auto" />
                            <p className="text-xs text-gray-600 mt-1 font-medium tracking-wide">
                                {settings?.agency_name || "Private design service"}
                            </p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-2xl font-bold text-gray-900 mb-1">CUENTA DE COBRO</h2>
                            <p className="text-lg font-bold text-gray-900 mb-1">No. {invoice.number}</p>
                            <p className="text-xs text-gray-600">Fecha: {new Date(invoice.date).toLocaleDateString()}</p>
                        </div>
                    </div>

                    {/* Professional Intro Text */}
                    <div className="mb-6 text-center">
                        <p className="text-sm text-gray-500 italic">
                            Presentamos el detalle de su cuenta de cobro, lista para su gestión de pago.
                        </p>
                    </div>

                    {/* Info Grid - Kept at top */}
                    <div className="grid grid-cols-2 gap-6 mb-4">
                        <div>
                            <h3 className="text-[10px] font-bold mb-1.5 uppercase text-gray-500 tracking-wider">Emitido por:</h3>
                            <p className="font-bold text-base text-gray-900">{settings?.company_name || "Cristian Camilo Gómez"}</p>
                            <p className="text-sm text-gray-700">NIT: {settings?.company_nit || "1110458437"}</p>
                            <p className="text-sm text-gray-700">{settings?.company_address || "Cra 4 #40-54 Macarena / Ibagué -Tolima"}</p>
                            <p className="text-sm text-gray-700">{settings?.company_email || "contact@pixy.com.co"}</p>
                            <p className="text-sm font-semibold text-gray-900 mt-1">Cel: {settings?.company_phone || "+57 350 407 6800"}</p>
                        </div>
                        <div>
                            <h3 className="text-[10px] font-bold mb-1.5 uppercase text-gray-500 tracking-wider">Para:</h3>
                            <p className="font-bold text-base text-gray-900">{invoice.client?.name}</p>
                            <p className="text-sm text-gray-700">{invoice.client?.company_name}</p>
                            <p className="text-sm text-gray-700">NIT/CC: {invoice.client?.nit}</p>
                            <p className="text-sm text-gray-700">{invoice.client?.address}</p>
                            <p className="text-sm text-gray-700">{invoice.client?.email}</p>
                            <p className="text-sm font-semibold text-gray-900 mt-1">Cel: {invoice.client?.phone}</p>
                        </div>
                    </div>

                    {/* Spacer to push content down */}
                    <div className="flex-grow"></div>

                    {/* Centered billing section (Table + Totals) */}
                    <div className="flex-shrink-0">
                        {/* Items Table - Relaxed Spacing */}
                        <div className="mb-6 rounded-lg overflow-hidden border border-gray-200">
                            <div className="bg-gray-50 text-gray-700 p-3 grid grid-cols-12 font-bold text-xs uppercase tracking-wider border-b border-gray-200">
                                <div className="col-span-1 text-center">#</div>
                                <div className="col-span-5">Descripción</div>
                                <div className="col-span-2 text-right">Precio Unit.</div>
                                <div className="col-span-2 text-center">Cant.</div>
                                <div className="col-span-2 text-right">Total</div>
                            </div>
                            <div className="bg-white">
                                {invoice.items.map((item: any, index: number) => (
                                    <div key={index} className="grid grid-cols-12 p-3 text-sm border-b border-gray-100 last:border-b-0 hover:bg-gray-50/30 transition-colors">
                                        <div className="col-span-1 text-center text-gray-500 font-medium">{index + 1}</div>
                                        <div className="col-span-5 font-medium text-gray-900">{item.description}</div>
                                        <div className="col-span-2 text-right text-gray-600">${item.price.toLocaleString()}</div>
                                        <div className="col-span-2 text-center text-gray-600">{item.quantity}</div>
                                        <div className="col-span-2 text-right font-bold text-gray-900 text-sm">${(item.price * item.quantity).toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Totals - Relaxed Spacing */}
                        <div className="flex justify-end mb-6">
                            <div className="w-1/2 border-t-2 border-gray-900 pt-4">
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-semibold text-gray-700">Subtotal:</span>
                                    <span className="text-base font-bold text-gray-900">${invoice.total.toLocaleString()} COP</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-gray-300">
                                    <span className="text-base font-bold text-gray-900">TOTAL:</span>
                                    <span className="text-xl font-bold text-gray-900">${invoice.total.toLocaleString()} COP</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Spacer to push content up */}
                    <div className="flex-grow"></div>

                    {/* Payment Methods */}
                    <div className="mt-auto mb-2">
                        <h4 className="text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Métodos de Pago</h4>
                        <div className="grid grid-cols-3 gap-2">
                            {/* Bancolombia */}
                            <div className="p-2 rounded-lg bg-gray-50 border border-gray-300 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <img src="/logos/bancolombia.png" alt="Bancolombia" className="h-4 w-4 object-contain flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-gray-900 truncate">{settings?.bancolombia_account || "068 000 030 18"}</p>
                                    </div>
                                </div>
                                <button className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-900 transition-colors flex-shrink-0" title="Copiar">
                                    <span className="sr-only">Copiar</span>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </button>
                            </div>

                            {/* Bold */}
                            <div className="p-2 rounded-lg bg-gray-50 border border-gray-300 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <img src="/logos/bold.png" alt="Bold" className="h-4 w-4 object-contain flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-gray-900 truncate">Link de pago</p>
                                    </div>
                                </div>
                                <a
                                    href={settings?.bold_link || "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-medium rounded border border-blue-200 hover:bg-blue-100 transition-colors whitespace-nowrap"
                                >
                                    Ir a pagar
                                </a>
                            </div>

                            {/* Nequi */}
                            <div className="p-2 rounded-lg bg-gray-50 border border-gray-300 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <img src="/logos/nequi.png" alt="Nequi" className="h-4 w-4 object-contain flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-gray-900 truncate">{settings?.nequi_number || "300 670 5958"}</p>
                                    </div>
                                </div>
                                <button className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-900 transition-colors flex-shrink-0" title="Copiar">
                                    <span className="sr-only">Copiar</span>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </button>
                            </div>

                            {/* Daviplata */}
                            <div className="p-2 rounded-lg bg-gray-50 border border-gray-300 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <img src="/logos/daviplata.png" alt="Daviplata" className="h-4 w-4 object-contain flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-gray-900 truncate">{settings?.daviplata_number || "300 670 5958"}</p>
                                    </div>
                                </div>
                                <button className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-900 transition-colors flex-shrink-0" title="Copiar">
                                    <span className="sr-only">Copiar</span>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </button>
                            </div>

                            {/* PayPal */}
                            <div className="p-2 rounded-lg bg-gray-50 border border-gray-300 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <img src="/logos/paypal.png" alt="PayPal" className="h-4 w-4 object-contain flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-gray-900 truncate">Link de pago</p>
                                    </div>
                                </div>
                                <a
                                    href={settings?.paypal_link || "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-medium rounded border border-blue-200 hover:bg-blue-100 transition-colors whitespace-nowrap"
                                >
                                    Ir a pagar
                                </a>
                            </div>

                            {/* Wompi */}
                            <div className="p-2 rounded-lg bg-gray-50 border border-gray-300 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <img src="/logos/wompi.png" alt="Wompi" className="h-4 w-4 object-contain flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-gray-900 truncate">Link de pago</p>
                                    </div>
                                </div>
                                <a
                                    href={settings?.wompi_link || "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[9px] font-medium rounded border border-purple-200 hover:bg-purple-100 transition-colors whitespace-nowrap"
                                >
                                    Ir a pagar
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Legal Text */}
                    <div className="pt-4 border-t border-gray-100">
                        <p className="text-[9px] text-gray-400 text-center leading-tight max-w-2xl mx-auto whitespace-pre-wrap">
                            {settings?.invoice_legal_text || `Declaro, bajo gravedad de juramento, que mis ingresos corresponden a servicios personales sin relación laboral ni legal y reglamentaria, y que no tomaré costos ni gastos como deducibles. Por tanto, solicito aplicar la tabla del artículo 383 del E.T., con el 25% de renta exenta conforme al artículo 206-10 ibídem.`}
                        </p>
                    </div>
                </div>
            </div>
        )
    }
)

InvoiceTemplate.displayName = "InvoiceTemplate"
