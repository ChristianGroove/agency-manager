"use client"

import { useState } from "react"
import { ServiceCatalogItem } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageCircle, ArrowRight, Info, CheckCircle2, Pencil, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface CatalogItemFlipCardProps {
    item: ServiceCatalogItem
    variant?: 'portal' | 'admin'  // New: admin or portal variant
    isRequested?: boolean
    onRequestInterest?: (item: ServiceCatalogItem) => void
    onEdit?: (item: ServiceCatalogItem) => void  // New: for admin variant
    onDelete?: (id: string) => void  // New: for admin variant
    settings?: { agency_phone?: string }
}

import { useTranslation } from "@/lib/i18n/use-translation"

export function CatalogItemFlipCard({
    item,
    variant = 'portal',
    isRequested = false,
    onRequestInterest,
    onEdit,
    onDelete,
    settings = {}
}: CatalogItemFlipCardProps) {
    const { t } = useTranslation()
    const [isFlipped, setIsFlipped] = useState(false)

    // Extract metadata for portal display
    const portalMeta = item.metadata?.portal_card || {}
    const detailedDescription = portalMeta.detailed_description || item.description
    const features = portalMeta.features || []
    const highlights = portalMeta.highlights || []
    const customFields = portalMeta.custom_fields || {}

    const formatPrice = (price?: number) => {
        if (!price) return t('portal.components.flip_card.consult')
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(price)
    }

    const handleFlip = (e: React.MouseEvent) => {
        // Don't flip if clicking the button
        if ((e.target as HTMLElement).closest('button')) return
        setIsFlipped(!isFlipped)
    }

    const handleRequest = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (onRequestInterest) {
            onRequestInterest(item)
        }
    }

    return (
        <div
            className="group perspective-1000 h-[380px] cursor-pointer"
            onClick={handleFlip}
        >
            <div className={cn(
                "relative w-full h-full transition-all duration-700 transform-style-3d",
                isFlipped && "rotate-y-180"
            )}>
                {/* FRONT FACE */}
                <div className={cn(
                    "absolute inset-0 backface-hidden",
                    "bg-white backdrop-blur-xl border border-gray-200/50",
                    "rounded-2xl shadow-lg overflow-hidden",
                    "hover:shadow-2xl hover:-translate-y-1 transition-all duration-300",
                    "flex flex-col",
                    "z-10" // Force front face order
                )} style={{ transform: 'translateZ(1px)' }}>
                    {/* 80% Image Area */}
                    <div className="h-[80%] relative overflow-hidden bg-gray-100">
                        {item.image_url ? (
                            <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-brand-pink/20 via-purple-100 to-blue-100 flex items-center justify-center relative">
                                <div className="absolute inset-0 bg-grid-pattern opacity-20" />
                                <div className="text-brand-pink/40 animate-pulse text-xs font-bold uppercase tracking-widest">
                                    {t('portal.components.flip_card.no_image')}
                                </div>
                            </div>
                        )}

                        {/* Minimalist Integrated Header */}
                        <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/20 to-transparent z-10 flex cursor-default pointer-events-none">
                            <div className="flex gap-1.5 items-center">
                                <span className="text-[10px] font-bold text-white uppercase tracking-wider drop-shadow-sm">
                                    {item.category}
                                </span>
                                {item.type === 'recurring' && (
                                    <>
                                        <span className="w-1 h-1 rounded-full bg-white/40" />
                                        <span className="text-[9px] font-medium text-white/80 uppercase tracking-tight">
                                            {t('portal.components.flip_card.subscription')}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 20% Content Area */}
                    <div className="h-[20%] p-3.5 flex flex-col justify-between bg-white">
                        <div className="flex justify-between items-start gap-2">
                            <h3 className="text-sm font-bold text-gray-900 line-clamp-1 leading-tight">
                                {item.name}
                            </h3>
                        </div>

                        <div className="flex items-end justify-between mt-auto">
                            <div className="flex items-center gap-1.5 text-[9px] text-gray-400 font-semibold pb-0.5">
                                <ArrowRight className="h-2 w-2" />
                                <span>{t('portal.components.flip_card.tap_details')}</span>
                            </div>

                            <div className="flex flex-col items-end">
                                <span className="text-[8px] text-gray-400 uppercase font-bold tracking-tighter mb-0.5 opacity-70">
                                    {item.price_label_type === 'from'
                                        ? t('portal.components.flip_card.from')
                                        : item.price_label_type === 'price'
                                            ? t('portal.components.flip_card.price')
                                            : t('portal.components.flip_card.base_price')}
                                </span>
                                <span className="text-lg font-extrabold text-gray-900 leading-none">
                                    {formatPrice(item.base_price)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BACK FACE */}
                <div className={cn(
                    "absolute inset-0 backface-hidden rotate-y-180",
                    "bg-gradient-to-br from-gray-50 to-white",
                    "border border-gray-200 rounded-2xl shadow-xl overflow-hidden",
                    "flex flex-col"
                )} style={{ transform: 'rotateY(180deg) translateZ(1px)' }}>
                    {/* Ultra-compact Header */}
                    <div className="bg-gray-900 p-3.5 text-white relative overflow-hidden shrink-0">
                        <div className="relative z-10 flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold truncate uppercase tracking-tight">
                                    {item.name}
                                </h3>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-base font-extrabold leading-none">{formatPrice(item.base_price)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Content - vertical only */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-4 scrollbar-thin scrollbar-thumb-gray-300">
                        {/* Detailed Description */}
                        {detailedDescription && (
                            <div>
                                <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">
                                    {t('portal.components.flip_card.description')}
                                </h4>
                                <p className="text-sm text-gray-700 leading-relaxed break-words">
                                    {detailedDescription}
                                </p>
                            </div>
                        )}

                        {/* Features List */}
                        {features.length > 0 && (
                            <div>
                                <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">
                                    {t('portal.components.flip_card.features')}
                                </h4>
                                <ul className="space-y-2">
                                    {features.map((feature: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Highlights */}
                        {highlights.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <h4 className="text-xs font-bold uppercase text-amber-700 mb-2">
                                    {t('portal.components.flip_card.highlights')}
                                </h4>
                                <ul className="space-y-1">
                                    {highlights.map((highlight: string, idx: number) => (
                                        <li key={idx} className="text-sm text-amber-900">
                                            • {highlight}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Custom Fields (vertical-specific) */}
                        {Object.keys(customFields).length > 0 && (
                            <div>
                                <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">
                                    {t('portal.components.flip_card.additional_info')}
                                </h4>
                                <dl className="space-y-2">
                                    {Object.entries(customFields).map(([key, value]) => (
                                        <div key={key} className="flex justify-between text-sm">
                                            <dt className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}:</dt>
                                            <dd className="text-gray-900 font-medium">{String(value)}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        )}

                    </div>

                    {/* Action Footer */}
                    <div className="p-4 border-t border-gray-100 bg-white">
                        {variant === 'portal' ? (
                            <Button
                                onClick={handleRequest}
                                className={cn(
                                    "w-full transition-all shadow-md font-bold uppercase tracking-wide text-xs h-10",
                                    isRequested
                                        ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                                        : "bg-[var(--brand-pink,#F205E2)] hover:opacity-90 text-white"
                                )}
                                style={!isRequested ? { backgroundColor: 'var(--brand-pink, #F205E2)' } : {}}
                            >
                                {item.cta_type === 'buy' && t('portal.components.flip_card.cta_buy')}
                                {item.cta_type === 'info' && t('portal.components.flip_card.cta_info')}
                                {item.cta_type === 'quote' && t('portal.components.flip_card.cta_quote')}
                                {item.cta_type === 'appointment' && t('portal.components.flip_card.cta_appointment')}
                                {item.cta_type === 'portfolio' && t('portal.components.flip_card.cta_details')}                                {(!item.cta_type || item.cta_type === 'whatsapp') && (
                                    <>
                                        <MessageCircle className="h-4 w-4 mr-2" />
                                        {isRequested ? t('portal.components.flip_card.request_again') : t('portal.components.flip_card.request_whatsapp')}
                                    </>
                                )}
                            </Button>
                        ) : (
                            <div className="flex gap-2">
                                <Button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onEdit?.(item)
                                    }}
                                    className="flex-1 bg-brand-pink hover:bg-brand-pink/90 text-white shadow-md font-bold text-xs h-9"
                                >
                                    <Pencil className="h-3.5 w-3.5 mr-2" />
                                    {t('portal.components.flip_card.edit')}
                                </Button>
                                <Button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onDelete?.(item.id)
                                    }}
                                    variant="ghost"
                                    className="hover:bg-red-50 hover:text-red-600 text-gray-400 h-9 w-9"
                                    size="icon"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .perspective-1000 {
                    perspective: 1200px;
                }
                .transform-style-3d {
                    transform-style: preserve-3d;
                    will-change: transform;
                }
                .backface-hidden {
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                    -moz-backface-visibility: hidden;
                }
                .rotate-y-180 {
                    transform: rotateY(180deg);
                }
                .bg-grid-pattern {
                    background-image: 
                        linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px);
                    background-size: 20px 20px;
                }
            `}</style>
        </div>
    )
}
