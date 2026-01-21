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

export function CatalogItemFlipCard({
    item,
    variant = 'portal',
    isRequested = false,
    onRequestInterest,
    onEdit,
    onDelete,
    settings = {}
}: CatalogItemFlipCardProps) {
    const [isFlipped, setIsFlipped] = useState(false)

    // Extract metadata for portal display
    const portalMeta = item.metadata?.portal_card || {}
    const detailedDescription = portalMeta.detailed_description || item.description
    const features = portalMeta.features || []
    const highlights = portalMeta.highlights || []
    const customFields = portalMeta.custom_fields || {}

    const formatPrice = (price?: number) => {
        if (!price) return "Consultar"
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
                    "bg-white/80 backdrop-blur-xl border border-gray-200/50",
                    "rounded-2xl shadow-lg overflow-hidden",
                    "hover:shadow-2xl hover:-translate-y-1 transition-all duration-300",
                    "flex flex-col"
                )}>
                    {/* Gradient Header */}
                    <div className="h-32 bg-gradient-to-br from-brand-pink/10 via-purple-50 to-blue-50 relative overflow-hidden">
                        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
                        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
                            <Badge
                                variant="secondary"
                                className="capitalize bg-white/90 backdrop-blur text-gray-700 shadow-sm border-0"
                            >
                                {item.category}
                            </Badge>
                            {item.type === 'recurring' && (
                                <Badge
                                    variant="outline"
                                    className="text-xs bg-white/90 backdrop-blur border-purple-200 text-purple-700"
                                >
                                    Suscripción
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 pt-4 flex flex-col">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 min-h-[3.5rem]">
                            {item.name}
                        </h3>

                        <p className="text-sm text-gray-500 line-clamp-3 mb-4 flex-1">
                            {item.description}
                        </p>

                        {/* Price Section */}
                        <div className="mt-auto pt-4 border-t border-gray-100">
                            <div className="flex items-baseline justify-between mb-4">
                                <div>
                                    <span className="text-sm text-gray-500 block mb-1">
                                        {item.type === 'recurring' ? 'Desde / mes' : 'Precio base'}
                                    </span>
                                    <span className="text-2xl font-bold text-gray-900">
                                        {formatPrice(item.base_price)}
                                    </span>
                                </div>
                                <button
                                    className="text-brand-pink hover:text-brand-pink/80 transition-colors p-2 rounded-full hover:bg-brand-pink/10"
                                    onClick={handleFlip}
                                >
                                    <Info className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Tooltip to flip */}
                            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                                <ArrowRight className="h-3 w-3 animate-pulse" />
                                <span>Toca para ver detalles</span>
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
                )}>
                    {/* Header with compact price */}
                    <div className="bg-gradient-to-r from-brand-pink to-purple-600 p-5 text-white relative overflow-hidden">
                        <div className="absolute inset-0 bg-black/10" />
                        <div className="relative z-10">
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <Badge
                                    variant="outline"
                                    className="bg-white/20 border-white/40 text-white backdrop-blur text-xs"
                                >
                                    {item.category}
                                </Badge>
                                <div className="text-right">
                                    <div className="text-sm font-bold">{formatPrice(item.base_price)}</div>
                                    <div className="text-[10px] opacity-80">
                                        {item.type === 'recurring' ? '/ mes' : 'Pago único'}
                                    </div>
                                </div>
                            </div>
                            <h3 className="text-base font-bold line-clamp-2">
                                {item.name}
                            </h3>
                        </div>
                    </div>

                    {/* Scrollable Content - vertical only */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-4 scrollbar-thin scrollbar-thumb-gray-300">
                        {/* Detailed Description */}
                        {detailedDescription && (
                            <div>
                                <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">
                                    Descripción
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
                                    Características
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
                                    ⭐ Destacados
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
                                    Información Adicional
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
                    <div className="p-6 pt-4 border-t border-gray-200 bg-white space-y-3">
                        {variant === 'portal' ? (
                            <>
                                <Button
                                    onClick={handleRequest}
                                    className={cn(
                                        "w-full transition-all shadow-md",
                                        isRequested
                                            ? "bg-gray-600 hover:bg-gray-700 text-white"
                                            : "bg-gray-800 hover:bg-gray-900 text-white"
                                    )}
                                >
                                    <MessageCircle className="h-4 w-4 mr-2" />
                                    {isRequested ? 'Solicitar nuevamente' : 'Solicitar por WhatsApp'}
                                </Button>
                            </>
                        ) : (
                            <>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onEdit?.(item)
                                        }}
                                        className="flex-1 bg-brand-pink hover:bg-brand-pink/90 text-white shadow-md"
                                    >
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Editar
                                    </Button>
                                    <Button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onDelete?.(item.id)
                                        }}
                                        variant="ghost"
                                        className="hover:bg-red-50 hover:text-red-600 text-gray-500"
                                        size="icon"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </>
                        )}

                        <button
                            onClick={handleFlip}
                            className="w-full text-xs text-gray-500 hover:text-gray-700 transition-colors flex items-center justify-center gap-1"
                        >
                            <ArrowRight className="h-3 w-3 rotate-180" />
                            Volver
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .perspective-1000 {
                    perspective: 1000px;
                }
                .transform-style-3d {
                    transform-style: preserve-3d;
                }
                .backface-hidden {
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
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
