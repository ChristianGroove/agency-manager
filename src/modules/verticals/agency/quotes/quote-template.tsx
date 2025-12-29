
import { Quote, Client } from "@/types"
import { forwardRef } from "react"
import { cn } from "@/lib/utils"
import { getDocumentBranding, type DocumentBrandingSettings } from '@/modules/core/settings/actions'

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
                className={cn("w-full max-w-[800px] bg-white text-gray-900 p-12 shadow-lg border border-gray-200 relative overflow-hidden rounded-xl", className)}
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
                    <div className="flex justify-between items-start mb-12 pb-6 border-b-2 border-gray-900">
                        <div className="flex flex-col items-center">
                            <img src={settings?.agency_logo || "/branding/logo dark.svg"} alt="PIXY" className="h-12 w-auto" />
                            <p className="text-sm text-gray-600 mt-2 font-medium tracking-wide">{settings?.agency_description || "Private design service"}</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-2xl font-bold text-gray-900 mb-1">COTIZACIÓN</h2>
                            <p className="text-lg font-bold text-gray-900 mb-1">No. {quote.number}</p>
                            <p className="text-sm text-gray-600">Fecha: {new Date(quote.date).toLocaleDateString()}</p>
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-12 mb-12">
                        <div>
                            <h3 className="text-xs font-bold mb-3 uppercase text-gray-500 tracking-wider">Emitido por:</h3>
                            <p className="font-bold text-base text-gray-900">{settings?.agency_name || "[ Nombre de la Empresa ]"}</p>
                            {settings?.company_address && <p className="text-sm text-gray-700">{settings.company_address}</p>}
                            {settings?.company_email && <p className="text-sm text-gray-700">{settings.company_email}</p>}
                            {settings?.company_phone && <p className="text-sm font-semibold text-gray-900 mt-1">Cel: {settings.company_phone}</p>}
                        </div>
                        <div>
                            <h3 className="text-xs font-bold mb-3 uppercase text-gray-500 tracking-wider">Para:</h3>
                            <p className="font-bold text-base text-gray-900">{entity?.name}</p>
                            {entity?.company_name && <p className="text-sm text-gray-700">{entity.company_name}</p>}
                            {'nit' in (entity || {}) && <p className="text-sm text-gray-700">NIT/CC: {(entity as Client).nit}</p>}
                            {entity?.email && <p className="text-sm text-gray-700">{entity.email}</p>}
                            {entity?.phone && <p className="text-sm font-semibold text-gray-900 mt-1">Cel: {entity.phone}</p>}
                            {isLead && <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] bg-yellow-100 text-yellow-800 font-medium">Prospecto</span>}
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="mb-12 rounded-lg overflow-hidden border border-gray-200">
                        <div className="bg-gray-50 text-gray-700 p-4 grid grid-cols-12 font-bold text-xs uppercase tracking-wider border-b border-gray-200">
                            <div className="col-span-1 text-center">#</div>
                            <div className="col-span-5">Descripción</div>
                            <div className="col-span-2 text-right">Precio Unit.</div>
                            <div className="col-span-2 text-center">Cant.</div>
                            <div className="col-span-2 text-right">Total</div>
                        </div>
                        <div className="bg-white">
                            {quote.items.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 italic">
                                    No hay items en esta cotización.
                                </div>
                            ) : (
                                quote.items.map((item, index) => (
                                    <div key={index} className="grid grid-cols-12 p-4 text-sm border-b border-gray-100 last:border-b-0 hover:bg-gray-50/30 transition-colors">
                                        <div className="col-span-1 text-center text-gray-500 font-medium">{index + 1}</div>
                                        <div className="col-span-5 font-medium text-gray-900">{item.description}</div>
                                        <div className="col-span-2 text-right text-gray-600">${item.price.toLocaleString()}</div>
                                        <div className="col-span-2 text-center text-gray-600">{item.quantity}</div>
                                        <div className="col-span-2 text-right font-bold text-gray-900">${(item.price * item.quantity).toLocaleString()}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end mb-12">
                        <div className="w-1/2 border-t-2 border-gray-900 pt-4">
                            <div className="flex justify-between pt-2">
                                <span className="text-base font-bold text-gray-900">TOTAL:</span>
                                <span className="text-xl font-bold text-gray-900">${quote.total.toLocaleString()} COP</span>
                            </div>
                        </div>
                    </div>

                    {/* Terms */}
                    <div className="mt-auto pt-8 border-t border-gray-100">
                        <p className="text-[10px] text-gray-400 text-center leading-relaxed max-w-2xl mx-auto">
                            {settings?.quote_validity_text || "Esta cotización tiene una validez de 15 días calendario. Los precios están sujetos a cambios después de este periodo."}
                        </p>
                    </div>
                </div>
            </div>
        )
    }
)

QuoteTemplate.displayName = "QuoteTemplate"
