"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { getContractGeneratorData } from "../actions"
import { BrandingConfig } from "@/types/branding"
import { format } from "date-fns"

interface ContractContextType {
    // Current Selections
    selectedClientId: string
    selectedServiceIds: string[]

    // Loaded Data
    tenantData: {
        name: string
        legalName: string
        country: string
        document_show_watermark: boolean
        branding: BrandingConfig | null
    } | null
    clientData: any | null
    servicesData: any[]

    // Generated Content
    contractContent: {
        header: string
        clauses: { title: string, content: string }[]
        footer: string
    } | null

    // Status
    isLoading: boolean
    isGenerating: boolean
    error: string | null

    // Actions
    setSelectedClientId: (id: string) => void
    setSelectedServiceIds: (ids: string[]) => void
    generateWithAi: (customPrompt?: string) => Promise<void>
    exportAsPdf: () => Promise<void>
    refreshData: () => Promise<void>
}

const ContractContext = createContext<ContractContextType | undefined>(undefined)

export function ContractProvider({ children }: { children: React.ReactNode }) {
    const [selectedClientId, setSelectedClientId] = useState("")
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])

    const [tenantData, setTenantData] = useState<ContractContextType['tenantData']>(null)
    const [clientData, setClientData] = useState<any>(null)
    const [servicesData, setServicesData] = useState<any[]>([])
    const [contractContent, setContractContent] = useState<ContractContextType['contractContent']>(null)

    const [isLoading, setIsLoading] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const refreshData = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const data = await getContractGeneratorData({
                clientId: selectedClientId,
                serviceIds: selectedServiceIds
            })

            if (data.tenant) setTenantData(data.tenant)
            if (data.client) setClientData(data.client)
            if (data.services) setServicesData(data.services)

        } catch (err: any) {
            setError(err.message || "Error al cargar datos del contrato")
        } finally {
            setIsLoading(false)
        }
    }, [selectedClientId, selectedServiceIds])

    const generateWithAi = async (customPrompt?: string) => {
        if (!selectedClientId) {
            setError("Por favor selecciona un cliente primero")
            return
        }
        setIsGenerating(true)
        setError(null)
        try {
            console.log("[ContractContext] 🤖 Requesting AI Generation with prompt:", customPrompt)
            console.log("[ContractContext] 📋 Contract context data:", { selectedClientId, selectedServiceIds })
            const { generateContractWithAi } = await import("../actions")
            const result = await generateContractWithAi({
                clientId: selectedClientId,
                serviceIds: selectedServiceIds,
                prompt: customPrompt
            })
            console.log("[ContractContext] ✅ AI Generation Result:", result)
            console.log("[ContractContext] 🔍 Result structure:", {
                hasHeader: !!result?.header,
                hasClauses: !!result?.clauses,
                clausesCount: result?.clauses?.length,
                hasFooter: !!result?.footer,
                isObject: typeof result === 'object'
            })
            setContractContent(result)
        } catch (err: any) {
            console.error("[ContractContext] ❌ AI Generation Error:", err)
            setError(err.message || "No se pudo generar el contrato con IA")
        } finally {
            setIsGenerating(false)
        }
    }

    const exportAsPdf = async () => {
        const element = document.getElementById('contract-document-render')
        if (!element) return

        setIsLoading(true)
        try {
            // Importar jsPDF para generar PDF real
            const { toJpeg } = await import('html-to-image')
            const { jsPDF } = await import('jspdf')
            const { exportContractAsPdf } = await import('../actions')

            console.log("[ContractContext] 📄 Starting PDF export process...")
            
            // Crear PDF con tamaño Letter
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'letter'
            })

            // Capturar todo el contenido (incluir todas las páginas)
            const dataUrl = await toJpeg(element, {
                quality: 0.95,
                pixelRatio: 2,
                cacheBust: true,
                skipFonts: false,
                backgroundColor: '#ffffff',
                width: element.scrollWidth,
                height: element.scrollHeight
            })

            // Añadir imagen al PDF
            const imgWidth = 216 // Letter width in mm  
            const imgHeight = 279 // Letter height in mm
            pdf.addImage(dataUrl, 'JPEG', 0, 0, imgWidth, imgHeight)
            
            console.log(`[ContractContext] ✅ Added contract to PDF`)

            // 4. Guardar PDF localmente
            const pdfBlob = pdf.output('blob')
            const pdfUrl = URL.createObjectURL(pdfBlob)
            
            const link = document.createElement('a')
            link.download = `Contrato_${clientData?.name || 'Cliente'}_${format(new Date(), 'yyyyMMdd')}.pdf`
            link.href = pdfUrl
            link.click()

            // 5. Enviar al servidor para cifrado y vaulting
            const reader = new FileReader()
            reader.onloadend = async () => {
                try {
                    const base64Data = reader.result as string
                    
                    const result = await exportContractAsPdf({
                        htmlContent: base64Data,
                        metadata: {
                            clientName: clientData?.name || 'Cliente',
                            agencyName: tenantData?.legalName || 'Agencia',
                            totalPages: 1
                        }
                    })

                    if (result.success) {
                        alert("✅ Contrato guardado y cifrado en el Data Vault exitosamente.")
                        console.log("[ContractContext] 🔐 Contract securely stored in vault")
                    } else {
                        console.error("[ContractContext] ❌ Vault storage failed:", result)
                    }
                } catch (vaultErr: any) {
                    console.error("[ContractContext] ❌ Vault storage error:", vaultErr)
                } finally {
                    URL.revokeObjectURL(pdfUrl)
                }
            }
            
            reader.readAsDataURL(pdfBlob)

        } catch (err: any) {
            console.error("[ContractContext] ❌ PDF Export Error:", err)
            setError(err.message || "Error al exportar PDF")
        } finally {
            setIsLoading(false)
        }
    }

    // Initial load for tenant branding
    useEffect(() => {
        refreshData()
    }, [selectedClientId, selectedServiceIds, refreshData])

    return (
        <ContractContext.Provider value={{
            selectedClientId,
            selectedServiceIds,
            tenantData,
            clientData,
            servicesData,
            contractContent,
            isLoading,
            isGenerating,
            error,
            setSelectedClientId,
            setSelectedServiceIds,
            generateWithAi,
            exportAsPdf,
            refreshData
        }}>
            {children}
        </ContractContext.Provider>
    )
}

export function useContract() {
    const context = useContext(ContractContext)
    if (context === undefined) {
        throw new Error("useContract must be used within a ContractProvider")
    }
    return context
}
