"use client"

import React, { useMemo } from "react"
import {
    UniversalCatalogItem,
    CatalogSpecTab,
    CatalogClassification,
    PhysicalProductDetails,
    DigitalProductDetails,
    ServiceProductDetails,
    SubscriptionProductDetails
} from "@/types/catalog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
    CheckCircle2,
    XCircle,
    FileText,
    Download,
    ShieldCheck,
    Clock,
    Gauge,
    Car,
    Home,
    Cpu,
    Layers,
    Fuel,
    Calendar,
    KeyRound,
    Maximize2,
    Wifi,
    HardDrive,
    Sparkles,
    AlertCircle,
    FileCheck
} from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"

export interface SpecificationTabsProps {
    item: UniversalCatalogItem
    specsTabs?: CatalogSpecTab[]
    specifications?: Record<string, any>
    classification?: CatalogClassification
    defaultTab?: string
    className?: string
}

/**
 * Computes active visible tab IDs for generic/test contract adherence
 */
export function getVisibleTabs(item: {
    description?: string | null
    specifications?: Record<string, any>
}): string[] {
    const tabs: string[] = []
    if (item.description && item.description.trim().length > 0) {
        tabs.push("description")
    }
    if (item.specifications?.features && item.specifications.features.length > 0) {
        tabs.push("features")
    }
    if (item.specifications?.deliverables && item.specifications.deliverables.length > 0) {
        tabs.push("deliverables")
    }
    if (item.specifications?.warranty) {
        tabs.push("warranty")
    }
    if (item.specifications?.terms) {
        tabs.push("terms")
    }
    return tabs
}

export function SpecificationTabs({
    item,
    specsTabs,
    specifications,
    classification,
    defaultTab,
    className
}: SpecificationTabsProps) {
    const activeSpecs = specifications || item.specifications || {}
    const activeClassification = classification || item.classification || "physical"
    const portalMeta = item.metadata?.portal_card || {}
    const categoryLower = (item.category || "").toLowerCase()

    // 1. Vehicle specs detection
    const isVehicle =
        categoryLower.includes("vehículo") ||
        categoryLower.includes("auto") ||
        categoryLower.includes("carro") ||
        categoryLower.includes("moto") ||
        Boolean(activeSpecs.vin || activeSpecs.engine || activeSpecs.mileage || activeSpecs.transmission)

    // 2. Real estate specs detection
    const isRealEstate =
        categoryLower.includes("inmueble") ||
        categoryLower.includes("propiedad") ||
        categoryLower.includes("inmobiliaria") ||
        categoryLower.includes("apartamento") ||
        categoryLower.includes("casa") ||
        Boolean(activeSpecs.total_area || activeSpecs.bedrooms || activeSpecs.strata || activeSpecs.bathrooms)

    // 3. Tech / Electronics detection
    const isTech =
        categoryLower.includes("tecnología") ||
        categoryLower.includes("electrónica") ||
        categoryLower.includes("smartphone") ||
        categoryLower.includes("computador") ||
        categoryLower.includes("hardware") ||
        Boolean(activeSpecs.processor || activeSpecs.ram || activeSpecs.storage || activeSpecs.battery)

    // 4. Physical details
    const physical = (item.physical_details || item.classification_metadata?.physical || {}) as PhysicalProductDetails

    // 5. Digital details
    const digital = (item.digital_details || item.classification_metadata?.digital || {}) as DigitalProductDetails

    // 6. Service details
    const service = (item.service_details || item.classification_metadata?.service || {}) as ServiceProductDetails

    // 7. Subscription details
    const subscription = (item.subscription_details || item.classification_metadata?.subscription || {}) as SubscriptionProductDetails

    // Compute all available tab configurations
    const computedTabs = useMemo(() => {
        const tabs: Array<{ id: string; label: string; icon: React.ReactNode; render: () => React.ReactNode }> = []

        // Description Tab
        const descText = item.description || portalMeta.detailed_description
        if (descText && descText.trim().length > 0) {
            tabs.push({
                id: "description",
                label: "Descripción",
                icon: <FileText className="h-4 w-4 mr-1.5" />,
                render: () => (
                    <div className="prose dark:prose-invert text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                        <p className="whitespace-pre-line">{descText}</p>
                    </div>
                )
            })
        }

        // Features Tab
        const features = activeSpecs.features || portalMeta.features || []
        if (Array.isArray(features) && features.length > 0) {
            tabs.push({
                id: "features",
                label: "Características",
                icon: <Sparkles className="h-4 w-4 mr-1.5" />,
                render: () => (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {features.map((feat: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                <span>{feat}</span>
                            </li>
                        ))}
                    </ul>
                )
            })
        }

        // Industry Adaptive: Vehicle Specs
        if (isVehicle) {
            tabs.push({
                id: "vehicle_specs",
                label: "Ficha Técnica",
                icon: <Car className="h-4 w-4 mr-1.5" />,
                render: () => (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {activeSpecs.engine && (
                                <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">Motor / Cilindrada</span>
                                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{activeSpecs.engine}</span>
                                </div>
                            )}
                            {activeSpecs.transmission && (
                                <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">Transmisión</span>
                                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{activeSpecs.transmission}</span>
                                </div>
                            )}
                            {activeSpecs.mileage && (
                                <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">Kilometraje</span>
                                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{activeSpecs.mileage}</span>
                                </div>
                            )}
                            {activeSpecs.fuel_type && (
                                <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">Combustible</span>
                                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{activeSpecs.fuel_type}</span>
                                </div>
                            )}
                            {activeSpecs.traction && (
                                <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">Tracción</span>
                                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{activeSpecs.traction}</span>
                                </div>
                            )}
                            {activeSpecs.year && (
                                <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">Año / Modelo</span>
                                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{activeSpecs.year}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )
            })
        }

        // Industry Adaptive: Real Estate Specs
        if (isRealEstate) {
            tabs.push({
                id: "property_specs",
                label: "Propiedad",
                icon: <Home className="h-4 w-4 mr-1.5" />,
                render: () => (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {activeSpecs.total_area && (
                                <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 text-center">
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">Área Total</span>
                                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">{activeSpecs.total_area} m²</span>
                                </div>
                            )}
                            {activeSpecs.bedrooms && (
                                <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 text-center">
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">Habitaciones</span>
                                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">{activeSpecs.bedrooms}</span>
                                </div>
                            )}
                            {activeSpecs.bathrooms && (
                                <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 text-center">
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">Baños</span>
                                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">{activeSpecs.bathrooms}</span>
                                </div>
                            )}
                            {activeSpecs.strata && (
                                <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 text-center">
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 block font-medium">Estrato</span>
                                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">{activeSpecs.strata}</span>
                                </div>
                            )}
                        </div>

                        {activeSpecs.hoa_fee && (
                            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-3 rounded-xl flex items-center justify-between text-xs">
                                <span className="font-semibold text-amber-900 dark:text-amber-300">Administración (HOA):</span>
                                <span className="font-bold text-amber-950 dark:text-amber-200">{activeSpecs.hoa_fee}</span>
                            </div>
                        )}

                        {Array.isArray(activeSpecs.amenities) && activeSpecs.amenities.length > 0 && (
                            <div>
                                <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Amenidades</h5>
                                <div className="flex flex-wrap gap-1.5">
                                    {activeSpecs.amenities.map((a: string, i: number) => (
                                        <span key={i} className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs rounded-full font-medium">
                                            {a}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )
            })
        }

        // Industry Adaptive: Tech Specs
        if (isTech) {
            tabs.push({
                id: "tech_specs",
                label: "Especificaciones",
                icon: <Cpu className="h-4 w-4 mr-1.5" />,
                render: () => (
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
                        {activeSpecs.processor && (
                            <div className="py-2 flex justify-between">
                                <span className="text-zinc-500 dark:text-zinc-400">Procesador</span>
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{activeSpecs.processor}</span>
                            </div>
                        )}
                        {activeSpecs.ram && (
                            <div className="py-2 flex justify-between">
                                <span className="text-zinc-500 dark:text-zinc-400">Memoria RAM</span>
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{activeSpecs.ram}</span>
                            </div>
                        )}
                        {activeSpecs.storage && (
                            <div className="py-2 flex justify-between">
                                <span className="text-zinc-500 dark:text-zinc-400">Almacenamiento</span>
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{activeSpecs.storage}</span>
                            </div>
                        )}
                        {activeSpecs.display && (
                            <div className="py-2 flex justify-between">
                                <span className="text-zinc-500 dark:text-zinc-400">Pantalla</span>
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{activeSpecs.display}</span>
                            </div>
                        )}
                        {activeSpecs.battery && (
                            <div className="py-2 flex justify-between">
                                <span className="text-zinc-500 dark:text-zinc-400">Batería</span>
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{activeSpecs.battery}</span>
                            </div>
                        )}
                    </div>
                )
            })
        }

        // Deliverables / SLA Tab (Services)
        const deliverables = activeSpecs.deliverables || service.deliverables || []
        const sla = activeSpecs.sla || service.sla_hours ? `${service.sla_hours} horas` : null
        if ((Array.isArray(deliverables) && deliverables.length > 0) || sla) {
            tabs.push({
                id: "deliverables",
                label: "Entregables & SLA",
                icon: <FileCheck className="h-4 w-4 mr-1.5" />,
                render: () => (
                    <div className="space-y-4">
                        {Array.isArray(deliverables) && deliverables.length > 0 && (
                            <div>
                                <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">Entregables Incluidos</h5>
                                <ul className="space-y-2">
                                    {deliverables.map((item: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {sla && (
                            <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/30 p-3 rounded-xl flex items-center justify-between text-xs">
                                <span className="font-semibold text-indigo-900 dark:text-indigo-300">Garantía de Tiempo (SLA):</span>
                                <span className="font-bold text-indigo-950 dark:text-indigo-200">{sla}</span>
                            </div>
                        )}
                    </div>
                )
            })
        }

        // Warranty / Returns Tab
        const warranty = activeSpecs.warranty
        if (warranty) {
            tabs.push({
                id: "warranty",
                label: "Garantía",
                icon: <ShieldCheck className="h-4 w-4 mr-1.5" />,
                render: () => (
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 p-4 rounded-2xl">
                        <div className="flex items-start gap-3">
                            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                            <div>
                                <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 mb-1">
                                    Póliza de Garantía
                                </h5>
                                <p className="text-sm text-emerald-950 dark:text-emerald-200">
                                    {typeof warranty === "string" ? warranty : JSON.stringify(warranty)}
                                </p>
                            </div>
                        </div>
                    </div>
                )
            })
        }

        // Terms Tab
        const terms = activeSpecs.terms
        if (terms) {
            tabs.push({
                id: "terms",
                label: "Términos",
                icon: <AlertCircle className="h-4 w-4 mr-1.5" />,
                render: () => (
                    <div className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-xl">
                        <p>{typeof terms === "string" ? terms : JSON.stringify(terms)}</p>
                    </div>
                )
            })
        }

        // Custom Specs Tabs from item schema
        const customTabs = specsTabs || item.specs_tabs || []
        if (Array.isArray(customTabs)) {
            for (const cTab of customTabs) {
                if (cTab.is_enabled !== false) {
                    tabs.push({
                        id: `custom_${cTab.id || cTab.title}`,
                        label: cTab.title,
                        icon: <Layers className="h-4 w-4 mr-1.5" />,
                        render: () => (
                            <div className="text-sm text-zinc-700 dark:text-zinc-300">
                                {cTab.type === "bullets" && Array.isArray(cTab.items) && (
                                    <ul className="space-y-1.5">
                                        {cTab.items.map((itemStr, i) => (
                                            <li key={i} className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                                <span>{itemStr}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {cTab.type === "key_value" && cTab.key_values && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(cTab.key_values).map(([k, v]) => (
                                            <div key={k} className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                                                <span className="text-xs text-zinc-400 block">{k}</span>
                                                <span className="font-semibold text-xs">{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {(!cTab.type || cTab.type === "text") && (
                                    <p className="whitespace-pre-line">{cTab.content}</p>
                                )}
                            </div>
                        )
                    })
                }
            }
        }

        return tabs
    }, [item, activeSpecs, activeClassification, isVehicle, isRealEstate, isTech, specsTabs, portalMeta, service])

    if (computedTabs.length === 0) {
        return null
    }

    const initialTab = defaultTab || computedTabs[0]?.id || "description"

    return (
        <div className={cn("w-full mt-4", className)}>
            <Tabs defaultValue={initialTab} className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto scrollbar-none h-11 bg-zinc-100/80 dark:bg-zinc-800/70 p-1 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/40">
                    {computedTabs.map((tab) => (
                        <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            className="flex items-center px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-zinc-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                        >
                            {tab.icon}
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {computedTabs.map((tab) => (
                    <TabsContent
                        key={tab.id}
                        value={tab.id}
                        className="pt-4 focus-visible:outline-none animate-in fade-in-50 duration-200"
                    >
                        {tab.render()}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    )
}
