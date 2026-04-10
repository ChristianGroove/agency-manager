"use client"

import { forwardRef } from "react"
import { cn } from "@/modules/infrastructure/utils/utils"
import { type DocumentBrandingSettings } from '../types'

interface InvoiceTemplateProps {
    invoice: any
    settings: any
    brandingSettings?: DocumentBrandingSettings
}

// Letter size dimensions in pixels at 96 DPI
// Width: 8.5in * 96 = 816px
// Height: 11in * 96 = 1056px

export const InvoiceTemplate = forwardRef<HTMLDivElement, InvoiceTemplateProps>(
    ({ invoice, settings, brandingSettings }, ref) => {
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
                {/* Watermark - Conditional (White-Label) */}
                {settings?.document_watermark_url && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                        <img
                            src={settings.document_watermark_url}
                            alt="Watermark"
                            className="w-[80%] opacity-[0.03] object-contain"
                        />
                    </div>
                )}

                <div className="flex flex-col h-full relative z-10">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-900">
                        <div className="flex flex-col items-center">
                            {/* Logo: Try Main Light -> Document -> Main -> Portal -> Agency Logo prop */}
                            {(settings?.main_logo_light_url || settings?.document_logo_url || settings?.main_logo_url || settings?.portal_logo_url || settings?.agency_logo) ? (
                                <img
                                    src={settings?.main_logo_light_url || settings?.document_logo_url || settings?.main_logo_url || settings?.portal_logo_url || settings?.agency_logo}
                                    alt="Agency Logo"
                                    className="h-14 w-auto object-contain"
                                />
                            ) : (
                                <div className="h-14 flex items-center justify-center bg-gray-100 px-4 rounded text-xs text-gray-400 font-medium">
                                    [ Logo ]
                                </div>
                            )}
                        </div>
                        <div className="text-right">
                            <h2 className="text-2xl font-bold text-gray-900 mb-1">
                                {invoice.document_type ? invoice.document_type.replace(/_/g, ' ') : 'CUENTA DE COBRO'}
                            </h2>
                            <p className="text-lg font-bold text-gray-900 mb-1">No. {invoice.number}</p>
                            <p className="text-xs text-gray-600">Fecha: {new Date(invoice.date).toLocaleDateString()}</p>
                        </div>
                    </div>

                    {/* Professional Intro Text */}
                    <div className="mb-6 text-left">
                        <p className="text-sm text-gray-500 italic">
                            Presentamos el detalle de su cuenta de cobro, lista para su gestión de pago.
                        </p>
                    </div>

                    {/* Retroactive / Scale Disclaimer Block */}
                    {(invoice.metadata?.cycle_period || invoice.is_late_issued) && (
                        <div className="mb-6 text-left max-w-lg border-l-4 border-gray-300 pl-4 py-1">
                            {invoice.metadata?.cycle_period && (
                                <p className="text-xs text-gray-600">
                                    <span className="font-bold">Periodo del Servicio:</span>{' '}
                                    {new Date(invoice.metadata.cycle_period.start).toLocaleDateString()} - {new Date(invoice.metadata.cycle_period.end).toLocaleDateString()}
                                </p>
                            )}
                            {invoice.is_late_issued && (
                                <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1 font-medium">
                                    Documento emitido de forma posterior al periodo del servicio.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Info Grid - Kept at top */}
                    <div className="grid grid-cols-2 gap-6 mb-4">
                        <div>
                            <h3 className="text-[10px] font-bold mb-1.5 uppercase text-gray-500 tracking-wider">Emitido por:</h3>
                            {/* Priority: Emitter (Invoice Specific) > Settings (Tenant) for Legal Info ONLY */}
                            <p className="font-bold text-base text-gray-900">{invoice.emitter?.legal_name || invoice.emitter?.display_name || settings?.company_name || settings?.agency_name}</p>

                            {(invoice.emitter?.identification_number || settings?.company_nit) &&
                                <p className="text-sm text-gray-700">NIT: {invoice.emitter?.identification_number || settings?.company_nit}</p>
                            }

                            {/* Contact Priority: Settings > Emitter  (As requested by user) */}
                            {(settings?.company_address || settings?.agency_address || invoice.emitter?.address) &&
                                <p className="text-sm text-gray-700">{settings?.company_address || settings?.agency_address || invoice.emitter?.address}</p>
                            }

                            {(settings?.company_email || settings?.agency_email || invoice.emitter?.email) &&
                                <p className="text-sm text-gray-700">{settings?.company_email || settings?.agency_email || invoice.emitter?.email}</p>
                            }

                            {(settings?.company_phone || settings?.agency_phone || invoice.emitter?.phone) &&
                                <p className="text-sm font-semibold text-gray-900 mt-1">Cel: {settings?.company_phone || settings?.agency_phone || invoice.emitter?.phone}</p>
                            }

                            {/* Siempre forzar que la web provenga del ADN si existe */}
                            {(settings?.agency_website || settings?.website) &&
                                <p className="text-sm text-gray-700 mt-0.5">{settings.agency_website || settings.website}</p>
                            }
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
                            {settings?.payment_methods?.map((method: any) => {
                                const titleLower = method.title.toLowerCase()
                                let iconSrc = "/payment-methods/default.png"
                                if (titleLower.includes('bancolombia')) iconSrc = "/payment-methods/bancolombia.png"
                                else if (titleLower.includes('nequi')) iconSrc = "/payment-methods/nequi.png"
                                else if (titleLower.includes('daviplata')) iconSrc = "/payment-methods/daviplata.png"
                                else if (titleLower.includes('paypal')) iconSrc = "/payment-methods/paypal.png"
                                else if (titleLower.includes('wompi')) iconSrc = "/payment-methods/wompi.png"
                                else if (titleLower.includes('bre-b') || titleLower.includes('breb')) iconSrc = "/payment-methods/bre-b.png"

                                const isGateway = method.type === 'GATEWAY'
                                const value = isGateway ? (method.details?.payment_link) : (method.details?.account_number)

                                if (!value) return null

                                return (
                                    <div key={method.id} className="p-2 rounded-lg bg-gray-50 border border-gray-300 flex items-center justify-between gap-2 overflow-hidden">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <img
                                                src={iconSrc}
                                                alt={method.title}
                                                className="h-4 w-4 object-contain flex-shrink-0"
                                                onError={(e) => { e.currentTarget.style.display = 'none' }}
                                            />
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-bold text-gray-900 truncate" title={method.title}>
                                                    {isGateway ? "Link de pago" : value}
                                                </p>
                                            </div>
                                        </div>
                                        {isGateway ? (
                                            <a
                                                href={value}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-2 py-0.5 text-[9px] font-medium rounded border transition-colors whitespace-nowrap"
                                                style={{
                                                    backgroundColor: `${brandingSettings?.document_primary_color || '#6B7280'}14`,
                                                    color: brandingSettings?.document_primary_color || '#6B7280',
                                                    borderColor: `${brandingSettings?.document_primary_color || '#6B7280'}33`
                                                }}
                                            >
                                                Pagar
                                            </a>
                                        ) : (
                                            <button
                                                className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-900 transition-colors flex-shrink-0"
                                                title="Copiar"
                                                onClick={() => { if (typeof navigator !== 'undefined') navigator.clipboard.writeText(value) }}
                                            >
                                                <span className="sr-only">Copiar</span>
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                            </button>
                                        )}
                                    </div>
                                )
                            })}

                            {/* Legacy Fallbacks */}
                            {(!settings?.payment_methods || settings.payment_methods.length === 0) && (
                                <>
                                    {/* Método: Bancolombia */}
                                    {settings?.bancolombia_account && (
                                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-300 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <img src="/payment-methods/bancolombia.png" alt="Bancolombia" className="h-4 w-4 object-contain flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-bold text-gray-900 truncate">{settings.bancolombia_account}</p>
                                                </div>
                                            </div>
                                            <button className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-900 transition-colors flex-shrink-0" title="Copiar">
                                                <span className="sr-only">Copiar</span>
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                            </button>
                                        </div>
                                    )}

                                    {/* Método: Bre-B */}
                                    {settings?.bre_b_number && (
                                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-300 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <img src="/payment-methods/bre-b.png" alt="Bre-B" className="h-4 w-4 object-contain flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-bold text-gray-900 truncate">{settings.bre_b_number}</p>
                                                </div>
                                            </div>
                                            <button className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-900 transition-colors flex-shrink-0" title="Copiar">
                                                <span className="sr-only">Copiar</span>
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                            </button>
                                        </div>
                                    )}

                                    {/* Método: Nequi */}
                                    {settings?.nequi_number && (
                                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-300 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <img src="/payment-methods/nequi.png" alt="Nequi" className="h-4 w-4 object-contain flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-bold text-gray-900 truncate">{settings.nequi_number}</p>
                                                </div>
                                            </div>
                                            <button className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-900 transition-colors flex-shrink-0" title="Copiar">
                                                <span className="sr-only">Copiar</span>
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                            </button>
                                        </div>
                                    )}

                                    {/* Método: Daviplata */}
                                    {settings?.daviplata_number && (
                                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-300 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <img src="/payment-methods/daviplata.png" alt="Daviplata" className="h-4 w-4 object-contain flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-bold text-gray-900 truncate">{settings.daviplata_number}</p>
                                                </div>
                                            </div>
                                            <button className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-900 transition-colors flex-shrink-0" title="Copiar">
                                                <span className="sr-only">Copiar</span>
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                            </button>
                                        </div>
                                    )}

                                    {/* Método: PayPal */}
                                    {settings?.paypal_link && (
                                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-300 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <img src="/payment-methods/paypal.png" alt="PayPal" className="h-4 w-4 object-contain flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-bold text-gray-900 truncate">Link de pago</p>
                                                </div>
                                            </div>
                                            <a
                                                href={settings.paypal_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-2 py-0.5 text-[9px] font-medium rounded border transition-colors whitespace-nowrap"
                                                style={{
                                                    backgroundColor: `${brandingSettings?.document_primary_color || '#6B7280'}14`,
                                                    color: brandingSettings?.document_primary_color || '#6B7280',
                                                    borderColor: `${brandingSettings?.document_primary_color || '#6B7280'}33`
                                                }}
                                            >
                                                Ir a pagar
                                            </a>
                                        </div>
                                    )}

                                    {/* Método: Wompi */}
                                    {settings?.wompi_link && (
                                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-300 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <img src="/payment-methods/wompi.png" alt="Wompi" className="h-4 w-4 object-contain flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-bold text-gray-900 truncate">Link de pago</p>
                                                </div>
                                            </div>
                                            <a
                                                href={settings.wompi_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-2 py-0.5 text-[9px] font-medium rounded border transition-colors whitespace-nowrap"
                                                style={{
                                                    backgroundColor: `${brandingSettings?.document_primary_color || '#6B7280'}14`,
                                                    color: brandingSettings?.document_primary_color || '#6B7280',
                                                    borderColor: `${brandingSettings?.document_primary_color || '#6B7280'}33`
                                                }}
                                            >
                                                Ir a pagar
                                            </a>
                                        </div>
                                    )}

                                </>
                            )}
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
