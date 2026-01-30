"use client"

import React, { useRef, useState, useMemo } from "react"
import { useContract } from "../context/contract-context"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ContractLivePreview() {
    const { tenantData, clientData, servicesData, contractContent, isLoading, isGenerating } = useContract()
    const containerRef = useRef<HTMLDivElement>(null)
    const [currentPage, setCurrentPage] = useState(0)

    const branding = tenantData?.branding
    // Use official document logo (main_light) if available, fallback to main, then default
    const logoUrl = branding?.logos?.main_light || branding?.logos?.main || "/branding/logo dark.svg"
    const showWatermark = tenantData?.document_show_watermark ?? true

    // Pagination Logic: Group clauses into logical pages
    const pages = useMemo(() => {
        if (!contractContent) return [null]

        const itemsPerPage = 4 // Adjust based on content density
        const grouped = []
        for (let i = 0; i < contractContent.clauses.length; i += itemsPerPage) {
            grouped.push(contractContent.clauses.slice(i, i + itemsPerPage))
        }
        return grouped
    }, [contractContent])

    if ((isLoading || isGenerating) && !tenantData && !contractContent) {
        return (
            <div className="w-[816px] h-[1056px] bg-white shadow-2xl rounded-sm flex items-center justify-center font-sans tracking-tight">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-brand-pink animate-spin" />
                    <p className="text-gray-400 font-medium font-sans">Preparando documento inteligente...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-8 items-center preview-container">
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&display=swap');
                
                .preview-container {
                    font-family: 'Inter', sans-serif !important;
                }

                #contract-document-render {
                    width: 8.5in !important;
                    height: 11in !important;
                    padding: 0.4in !important;
                    font-family: 'Inter', sans-serif !important;
                    font-size: 14px !important;
                    line-height: 1.6;
                    color: #1e293b;
                    background: white;
                    position: relative;
                    box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
                }

                #contract-document-render h1, 
                #contract-document-render h2, 
                #contract-document-render h3 {
                    font-weight: 800; /* Reduced from 900 as requested */
                    letter-spacing: 0.05em;
                }

                @media print {
                    @page {
                        size: Letter;
                        margin: 0.5in;
                    }
                    body { 
                        background: white !important; 
                        margin: 0 !important;
                        padding: 0 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    /* Hide absolutely everything except the contract */
                    body * {
                        visibility: hidden;
                    }
                    /* Show only the contract document */
                    #contract-document-render, 
                    #contract-document-render * {
                        visibility: visible;
                    }
                    #contract-document-render {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        box-shadow: none !important;
                        padding: 0.5in !important;
                        page-break-after: always;
                        page-break-inside: avoid;
                        background: white !important;
                    }
                    .no-print {
                        display: none !important;
                        visibility: hidden !important;
                    }
                    /* Hide parent containers' backgrounds */
                    .preview-container,
                    .preview-container * {
                        background: transparent !important;
                    }
                    #contract-document-render {
                        background: white !important;
                    }
                    /* Ensure all pages are visible and positioned correctly */
                    .preview-container {
                        display: block !important;
                        position: relative !important;
                    }
                    /* Reset transforms for print */
                    .transform {
                        transform: none !important;
                        scale: 1 !important;
                    }
                }
            `}</style>

            {/* Paginator Controls */}
            {pages.length > 1 && (
                <div className="flex items-center gap-4 bg-white/80 dark:bg-zinc-900 shadow-xl px-6 py-2 rounded-full border border-gray-100 dark:border-white/10 z-30 transition-all hover:scale-105 no-print">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                        disabled={currentPage === 0}
                        className="rounded-full h-8 w-8"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 font-sans">
                        Página <span className="text-brand-pink">{currentPage + 1}</span> de {pages.length}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCurrentPage(prev => Math.min(pages.length - 1, prev + 1))}
                        disabled={currentPage === pages.length - 1}
                        className="rounded-full h-8 w-8"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            )}

            <div
                ref={containerRef}
                id="contract-document-render"
                className="flex flex-col select-none"
            >
                {/* Header Branding */}
                <div className="flex justify-between items-center mb-16">
                    <div className="flex items-center gap-8">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="h-11 w-auto object-contain" />
                        ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-900 flex items-center justify-center text-white font-black text-xl">
                                {tenantData?.name?.charAt(0) || "P"}
                            </div>
                        )}
                        <div className="h-8 w-px bg-gray-100" />
                        <div>
                            {/* REMOVED H1 as requested to avoid duplicate name */}
                            <p className="text-[10px] uppercase tracking-widest text-brand-pink font-bold mt-1 opacity-80">
                                {contractContent?.header || "Documento Contractual"}
                            </p>
                            {/* NIT Placeholder - added 4px lower as requested */}
                            <p className="text-[9px] text-gray-400 font-medium mt-1">
                                NIT: 900.123.456-7
                            </p>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="text-[9px] font-black uppercase text-gray-300 tracking-[0.2em] mb-1">CÓDIGO DOC.</div>
                        <div className="text-[11px] font-black text-gray-800 tracking-tighter">
                            CON-{format(new Date(), "yyyyMMdd")}-{(clientData?.name?.substring(0, 3) || 'GEN').toUpperCase()}
                        </div>
                        <div className="text-[10px] font-bold text-gray-400 mt-0.5">{format(new Date(), "PP", { locale: es })}</div>
                    </div>
                </div>

                {/* Content Rendering */}
                <div className="flex-1 space-y-12 animate-in fade-in duration-500">
                    {contractContent ? (
                        <>
                            {currentPage === 0 && (
                                <div className="text-center mb-20">
                                    <h2 className="text-lg font-extrabold uppercase tracking-widest text-gray-900 mb-4">
                                        {contractContent.header}
                                    </h2>
                                    <div className="h-1 w-12 bg-gray-900 mx-auto opacity-10" />
                                </div>
                            )}

                            <div className="space-y-10">
                                {pages[currentPage]?.map((clause: any, idx: number) => (
                                    <section key={idx} className="space-y-4">
                                        <h3 className="text-xs font-bold flex items-center gap-4 tracking-widest text-gray-900 uppercase">
                                            <span className="text-brand-pink">{(currentPage * 4 + idx + 1).toString().padStart(2, '0')}</span>
                                            {clause.title}
                                        </h3>
                                        <div className="text-justify text-[13px] leading-relaxed text-gray-600 pl-10 pr-4 whitespace-pre-wrap font-sans">
                                            {clause.content}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="space-y-16">
                            <div className="text-center mb-20">
                                <h2 className="text-2xl font-extrabold uppercase tracking-widest text-gray-900 mb-4">Contrato de Servicios Profesionales</h2>
                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">Borrador Preliminar</p>
                            </div>

                            <section className="space-y-6">
                                <h3 className="text-xs font-bold flex items-center gap-4 tracking-widest text-gray-900 uppercase">
                                    <span className="text-brand-pink">01</span> Partes del Acuerdo
                                </h3>
                                <div className="text-justify text-[13px] leading-relaxed text-gray-600 pl-10 pr-4">
                                    El presente Acuerdo de Prestación de Servicios se celebra entre <span className="font-bold text-gray-900">{tenantData?.legalName || "LA AGENCIA"}</span> y
                                    <span className="font-bold text-gray-900"> {clientData?.name || "EL CLIENTE"}</span>. Ambas partes declaran la voluntad de obligarse bajo los términos y condiciones aquí descritos.
                                </div>
                            </section>

                            <section className="space-y-10">
                                <h3 className="text-xs font-bold flex items-center gap-4 tracking-widest text-gray-900 uppercase">
                                    <span className="text-brand-pink">02</span> Objeto y Servicios
                                </h3>
                                <div className="space-y-6 pl-10 pr-4">
                                    {servicesData.length > 0 ? (
                                        servicesData.map(service => (
                                            <div key={service.id} className="group flex justify-between items-start pb-6 border-b border-gray-50">
                                                <div className="space-y-1">
                                                    <div className="text-[11px] font-bold text-gray-900 uppercase tracking-widest">{service.name}</div>
                                                    <p className="text-[10px] text-gray-500 font-medium max-w-sm">{service.description || "Involucra la ejecución de servicios expertos."}</p>
                                                </div>
                                                <div className="text-sm font-extrabold text-gray-900 font-sans tracking-tight">
                                                    ${Number(service.base_price || 0).toLocaleString()}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-12 border-2 border-dashed border-gray-100 rounded-3xl text-center bg-gray-50/10">
                                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Esperando definición de servicios...</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    )}
                </div>

                {/* Signature Block - Only on Last Page */}
                {currentPage === pages.length - 1 && (
                    <div className="mt-auto pt-16 border-t border-gray-100">
                        <div className="grid grid-cols-2 gap-24 px-12 mb-16 text-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-full border-b border-gray-300" />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Por El Prestador</span>
                                <div className="text-[9px] text-gray-900 font-bold uppercase mt-1">{tenantData?.legalName}</div>
                            </div>
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-full border-b border-gray-300" />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Por El Cliente</span>
                                <div className="text-[9px] text-gray-900 font-bold uppercase mt-1">{clientData?.name}</div>
                            </div>
                        </div>

                        <div className="text-center space-y-6">
                            <p className="text-[10px] text-justify text-gray-400 italic px-10 leading-relaxed font-sans">
                                {contractContent?.footer || `Este instrumento legal se acoge a la jurisdicción de la República de ${tenantData?.country || "Colombia"}.`}
                            </p>
                            <p className="text-[8px] text-gray-300 uppercase tracking-[0.6em] font-black pt-12">
                                {showWatermark ? "PIXY GLOBAL • SECURE DOCUMENT • NO REPRODUCTION" : `DOCUMENTO PRIVADO PARA USO EXCLUSIVO`}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Empty space to avoid scroll overlap */}
            <div className="h-20 no-print" />
        </div>
    )
}
