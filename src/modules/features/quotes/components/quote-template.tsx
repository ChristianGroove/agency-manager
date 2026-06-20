
import { Quote, Client } from "@/types"
import { forwardRef } from "react"
import { cn } from "@/modules/infrastructure/utils/utils"
import { getDocumentBranding } from '@/modules/core/settings/actions/branding'
import { type DocumentBrandingSettings } from '@/modules/features/billing/types'

interface QuoteTemplateProps {
    quote: Quote
    settings?: any
    brandingSettings?: DocumentBrandingSettings
    className?: string
}

export const QuoteTemplate = forwardRef<HTMLDivElement, QuoteTemplateProps>(
    ({ quote, settings, brandingSettings, className }, ref) => {
        const entity = quote.client || quote.lead
        const isLead = !!quote.lead_id

        return (
            <div
                ref={ref}
                className={cn("w-full max-w-[800px] bg-white text-zinc-900 p-12 shadow-lg border border-zinc-200 relative overflow-hidden rounded-xl", className)}
                style={{ minHeight: '1123px' }}
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
                    <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-zinc-900">
                        <div className="flex flex-col items-start">
                            {/* Logo */}
                            <img
                                src={settings?.agency_logo && settings.agency_logo !== "" ? settings.agency_logo : "/branding/logo dark.svg"}
                                alt="Logo"
                                className="h-11 w-auto object-contain mb-1"
                            />
                            {settings?.agency_description && <p className="text-xs text-zinc-600 font-medium tracking-wide">{settings.agency_description}</p>}
                        </div>
                        <div className="text-right">
                            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">COTIZACIÓN</h2>
                            <p className="text-lg font-bold text-zinc-900 mt-0.5"># {quote.number}</p>
                            <p className="text-xs text-zinc-600 mt-1">Fecha: {new Date(quote.date).toLocaleDateString()}</p>
                        </div>
                    </div>

                    {/* Info Grid - Horizontal Layout */}
                    <div className="grid grid-cols-2 gap-12 mb-8">
                        {/* Emitido por */}
                        <div>
                            <h3 className="text-[10px] font-bold mb-1.5 uppercase text-zinc-500 tracking-wider">Emitido por:</h3>
                            {/* Prioridad: Emisor seleccionado > Nombre de Agencia */}
                            <p className="font-bold text-base text-zinc-900 mb-1">{(quote as any).emitter?.legal_name || (quote as any).emitter?.display_name || settings?.agency_name || "Pixy Agency"}</p>

                            <div className="space-y-0.5 text-sm text-zinc-600">
                                {((quote as any).emitter?.identification_number || settings?.company_nit) && (
                                    <p>NIT: {(quote as any).emitter?.identification_number || settings?.company_nit}</p>
                                )}
                                {(settings?.agency_address || settings?.company_address || (quote as any).emitter?.address) && (
                                    <p>{settings?.agency_address || settings?.company_address || (quote as any).emitter?.address}</p>
                                )}
                                {(settings?.agency_email || settings?.company_email || (quote as any).emitter?.email) && (
                                    <p>{settings?.agency_email || settings?.company_email || (quote as any).emitter?.email}</p>
                                )}
                                {(settings?.agency_phone || settings?.company_phone || (quote as any).emitter?.phone) && (
                                    <p className="font-semibold text-zinc-900">Cel: {settings?.agency_phone || settings?.company_phone || (quote as any).emitter?.phone}</p>
                                )}
                                {(settings?.agency_website || settings?.website) && (
                                    <p>{settings?.agency_website || settings?.website}</p>
                                )}
                            </div>
                        </div>

                        {/* Para */}
                        <div>
                            <h3 className="text-[10px] font-bold mb-1.5 uppercase text-zinc-500 tracking-wider">Para:</h3>
                            <p className="font-bold text-base text-zinc-900">{entity?.name}</p>
                            {entity?.company_name && <p className="text-sm text-zinc-700">{entity.company_name}</p>}
                            {'nit' in (entity || {}) && <p className="text-sm text-zinc-700">NIT/CC: {(entity as Client).nit}</p>}
                            {entity?.email && <p className="text-sm text-zinc-700">{entity.email}</p>}
                            {entity?.phone && <p className="text-sm font-semibold text-zinc-900 mt-0.5">Cel: {entity.phone}</p>}
                            {isLead && <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] bg-yellow-100 text-yellow-800 font-medium">Prospecto</span>}
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="mb-12 rounded-lg overflow-hidden border border-zinc-200">
                        <div className="bg-zinc-50 text-zinc-700 p-4 grid grid-cols-12 font-bold text-xs uppercase tracking-wider border-b border-zinc-200">
                            <div className="col-span-1 text-center">#</div>
                            <div className="col-span-5">Descripción</div>
                            <div className="col-span-2 text-right">Precio Unit.</div>
                            <div className="col-span-2 text-center">Cant.</div>
                            <div className="col-span-2 text-right">Total</div>
                        </div>
                        <div className="bg-white">
                            {quote.items.length === 0 ? (
                                <div className="p-8 text-center text-zinc-500 italic">
                                    No hay items en esta cotización.
                                </div>
                            ) : (
                                quote.items.map((item, index) => (
                                    <div key={index} className="grid grid-cols-12 p-4 text-sm border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50/30 transition-colors">
                                        <div className="col-span-1 text-center text-zinc-500 font-medium">{index + 1}</div>
                                        <div className="col-span-5 font-medium text-zinc-900">{item.description}</div>
                                        <div className="col-span-2 text-right text-zinc-600">${item.price.toLocaleString()}</div>
                                        <div className="col-span-2 text-center text-zinc-600">{item.quantity}</div>
                                        <div className="col-span-2 text-right font-bold text-zinc-900">${(item.price * item.quantity).toLocaleString()}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end mb-12">
                        <div className="w-1/2 border-t-2 border-zinc-900 pt-4">
                            <div className="flex justify-between pt-2">
                                <span className="text-base font-bold text-zinc-900">TOTAL:</span>
                                <span className="text-xl font-bold text-zinc-900">${quote.total.toLocaleString()} COP</span>
                            </div>
                        </div>
                    </div>

                    {/* Terms */}
                    <div className="mt-auto pt-8 border-t border-zinc-100">
                        <p className="text-[10px] text-zinc-400 text-center leading-relaxed max-w-2xl mx-auto">
                            {settings?.quote_validity_text || "Esta cotización tiene una validez de 15 días calendario. Los precios están sujetos a cambios después de este periodo."}
                        </p>
                    </div>
                </div>
            </div>

        )
    }
)

QuoteTemplate.displayName = "QuoteTemplate"
