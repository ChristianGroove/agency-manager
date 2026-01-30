"use client"

import React, { useState } from "react"
import { SectionHeader } from "@/components/layout/section-header"
import { FileText, Sparkles, Settings2, MessageSquare } from "lucide-react"
import { useRegisterView } from "@/modules/core/caa/context/view-context"
import { ContractConfigPanel } from "@/modules/core/tools/contract-generator/components/contract-config-panel"
import { ContractLivePreview } from "@/modules/core/tools/contract-generator/components/contract-live-preview"
import { ContractAiCopilot } from "@/modules/core/tools/contract-generator/components/contract-ai-copilot"
import { MyContractsModal } from "@/modules/core/tools/contract-generator/components/my-contracts-modal"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { ContractProvider } from "@/modules/core/tools/contract-generator/context/contract-context"
import { Printer, Download, ShieldCheck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useContract } from "@/modules/core/tools/contract-generator/context/contract-context"

export default function ContractGeneratorPage() {
    // Register View for Assistant
    useRegisterView({
        viewId: "contract_generator",
        label: "Generador de Contratos",
        actions: [
            { id: "generate_from_ai", label: "Generar con IA", type: "function", target: "ai_generate", icon: Sparkles },
            { id: "reset_form", label: "Limpiar Formulario", type: "function", target: "reset", icon: Settings2 }
        ],
        topics: ["contract_generator_usage", "legal_templates"]
    })

    return (
        <ContractProvider>
            <ContractGeneratorLayout />
        </ContractProvider>
    )
}

function ContractGeneratorLayout() {
    return (
        <div className="flex flex-col h-[calc(100vh-2rem)] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 bg-white/50 dark:bg-brand-dark/50 backdrop-blur-sm shadow-sm z-10 flex items-center justify-between">
                <SectionHeader
                    title="Generador de Contratos"
                    subtitle="Crea contratos profesionales en segundos usando IA."
                    icon={FileText}
                    className="py-0 w-full"
                    action={<ContractActions />}
                />
            </div>

            <div className="flex-1 flex overflow-hidden lg:flex-row flex-col relative">

                {/* Panel Principal: Live Preview (Más grande) */}
                <div className="flex-1 flex flex-col bg-gray-100/30 dark:bg-black/40 overflow-hidden">
                    <div className="p-3 border-b border-gray-200 dark:border-white/10 flex items-center justify-between text-[11px] font-bold bg-white/5 backdrop-blur-sm uppercase tracking-tight">
                        <div className="flex items-center gap-2 text-gray-500">
                            <FileText className="w-3.5 h-3.5 text-brand-pink" />
                            Live Document Preview
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400">Estado:</span>
                            <div className="flex items-center gap-1.5 bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full border border-green-500/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                Lista para Firma
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 lg:py-12 lg:px-5 scrollbar-modern flex justify-center items-start">
                        <div className="transform scale-[0.85] lg:scale-100 origin-top transition-transform duration-500">
                            <ContractLivePreview />
                        </div>
                    </div>
                </div>

                {/* Panel de Control: Tabs (Sidebar Derecha) */}
                <div className="w-full lg:w-[400px] border-l border-gray-200 dark:border-white/10 flex flex-col bg-white dark:bg-brand-dark shadow-xl z-20">
                    <Tabs defaultValue="config" className="flex flex-col h-full">
                        <div className="px-4 py-2 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5">
                            <TabsList className="grid w-full grid-cols-2 bg-gray-200/50 dark:bg-white/5">
                                <TabsTrigger value="config" className="flex items-center gap-2 data-[state=active]:bg-brand-pink data-[state=active]:text-white">
                                    <Settings2 className="w-4 h-4" />
                                    Configuración
                                </TabsTrigger>
                                <TabsTrigger value="ai" className="flex items-center gap-2 data-[state=active]:bg-brand-pink data-[state=active]:text-white">
                                    <MessageSquare className="w-4 h-4" />
                                    AI Assistant
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="config" className="flex-1 overflow-y-auto m-0 p-0 border-none outline-none">
                            <div className="p-6">
                                <ContractConfigPanel />
                            </div>
                        </TabsContent>

                        <TabsContent value="ai" className="flex-1 overflow-hidden m-0 p-0 border-none outline-none flex flex-col">
                            <ContractAiCopilot />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}

function ContractActions() {
    const { isLoading, isGenerating, exportAsPdf, generateWithAi } = useContract()

    return (
        <div className="flex items-center gap-3">
            <MyContractsModal />

            <Button
                variant="outline"
                size="sm"
                className="h-11 px-6 text-xs font-bold gap-2 rounded-xl border-dashed border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900/50 hover:bg-gray-50 dark:hover:bg-white/5 transition-all w-[140px] justify-center"
                onClick={() => window.print()}
            >
                <Printer className="w-4 h-4 text-gray-500" />
                Imprimir
            </Button>

            <Button
                variant="outline"
                size="sm"
                className="h-11 px-6 text-xs font-bold gap-2 rounded-xl border-dashed border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900/50 hover:bg-gray-50 dark:hover:bg-white/5 transition-all w-[140px] justify-center"
                onClick={exportAsPdf}
                disabled={isLoading || isGenerating}
            >
                <Download className="w-4 h-4 text-gray-500" />
                Exportar PDF
            </Button>

            <Button
                size="sm"
                className="h-11 px-6 bg-brand-pink hover:bg-brand-pink/90 text-white text-xs font-bold gap-2 rounded-xl shadow-lg shadow-pink-500/20 transition-all active:scale-95 w-[180px] justify-center"
                onClick={exportAsPdf}
                disabled={isLoading || isGenerating}
            >
                {isLoading || isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Cifrar y Guardar
            </Button>
        </div>
    )
}
