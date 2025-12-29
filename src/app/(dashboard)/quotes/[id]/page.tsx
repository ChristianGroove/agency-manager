"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, Download, Share2, Mail, ArrowLeft, UserPlus, Edit } from "lucide-react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { Quote, Client, Lead } from "@/types"
import { convertLeadToClient } from "@/modules/verticals/agency/leads/actions"

import { QuoteTemplate } from "@/modules/verticals/agency/quotes/quote-template"
import { QuoteWhatsAppModal } from "@/modules/verticals/agency/quotes/quote-whatsapp-modal"
import { ShareButton } from "@/components/animate-ui/components/community/share-button"

export default function QuoteDetailPage() {
    const params = useParams()
    const router = useRouter()
    const [quote, setQuote] = useState<Quote | null>(null)
    const [settings, setSettings] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [converting, setConverting] = useState(false)
    const [downloading, setDownloading] = useState(false)
    const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false)
    const quoteRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (params.id) {
            fetchQuote(params.id as string)
            fetchSettings()
        }
    }, [params.id])

    const fetchSettings = async () => {
        const { data } = await supabase.from('organization_settings').select('*').single()
        if (data) setSettings(data)
    }

    const fetchQuote = async (id: string) => {
        try {
            const { data, error } = await supabase
                .from('quotes')
                .select(`
          *,
          client:clients (*),
          lead:leads (*)
        `)
                .eq('id', id)
                .single()

            if (error) throw error
            setQuote(data)
        } catch (error) {
            console.error("Error fetching quote:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleConvertLead = async () => {
        if (!quote?.lead_id) return
        if (!confirm("¿Estás seguro de convertir este prospecto en cliente?")) return

        setConverting(true)
        try {
            const res = await convertLeadToClient(quote.lead_id)
            if (!res.success || !res.data) throw new Error(res.error)

            alert(`¡Prospecto convertido exitosamente! Ahora es el cliente: ${res.data.name}`)
            // Refresh to show client data instead of lead
            fetchQuote(quote.id)
        } catch (error: any) {
            console.error("Error converting lead:", error)
            alert(`Error al convertir: ${error.message}`)
        } finally {
            setConverting(false)
        }
    }

    const handleConvertToInvoice = async () => {
        if (!quote) return
        if (!confirm("¿Convertir esta cotización en servicios y facturas?")) return
        setConverting(true)
        try {
            // Import dynamically or at top? using Server Action
            const { convertQuote } = await import("@/modules/verticals/agency/quotes/conversion-actions")
            const result = await convertQuote(quote.id)

            if (result.success) {
                const { servicesCreated, invoicesCreated } = result.results || { servicesCreated: 0, invoicesCreated: 0 }
                let message = "Conversión exitosa.\n"
                if (servicesCreated > 0) message += `✅ ${servicesCreated} Servicio(s) de suscripción creados.\n`
                if (invoicesCreated) message += `✅ Factura de cobro único generada.\n`

                alert(message)

                // Redirect logic
                // If invoice created, go there? Or staying here is fine?
                // User asked: "Redirigir al usuario a la vista del Cliente o del Nuevo Servicio."
                if (result.results?.unifiedInvoiceId) {
                    router.push(`/invoices/${result.results.unifiedInvoiceId}`)
                } else if (quote.client_id) {
                    router.push(`/clients/${quote.client_id}?tab=services`)
                } else {
                    router.push('/dashboard')
                }
            } else {
                throw new Error(result.error)
            }
        } catch (error: any) {
            console.error(error)
            alert(error.message || "Error al convertir")
        } finally {
            setConverting(false)
        }
    }

    const handleDownloadPDF = () => {
        window.print()
    }

    const handleEmailShare = async () => {
        if (!quote) return
        const email = quote.client?.email || quote.lead?.email
        if (!email) return alert("El cliente no tiene email registrado")

        try {
            setDownloading(true)

            // Dynamic import for html-to-image and jspdf to avoid SSR issues
            const { toPng } = await import('html-to-image')
            const jsPDF = (await import('jspdf')).default

            if (!quoteRef.current) return

            // Generate PNG using html-to-image
            const dataUrl = await toPng(quoteRef.current, {
                quality: 0.95,
                backgroundColor: '#ffffff'
            })

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            })

            const imgProps = pdf.getImageProperties(dataUrl)
            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width

            pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight)

            // Get PDF as base64 string
            const pdfBase64 = pdf.output('datauristring')

            // Send to API
            const response = await fetch('/api/send-quote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    quoteNumber: quote.number,
                    clientName: quote.client?.name || quote.lead?.name,
                    total: `$${quote.total.toLocaleString()}`,
                    date: new Date(quote.date).toLocaleDateString(),
                    pdfBase64
                }),
            })

            if (!response.ok) {
                const contentType = response.headers.get("content-type")
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    const errorData = await response.json()
                    throw new Error(errorData.error || 'Failed to send email')
                } else {
                    const errorText = await response.text()
                    console.error('Non-JSON API Error:', errorText)
                    throw new Error(`Server Error (${response.status}): ${errorText.slice(0, 100)}...`)
                }
            }

            alert('Cotización enviada exitosamente por correo')

        } catch (error: any) {
            console.error('Error sending email:', error)
            alert(`Error al enviar el correo: ${error.message}`)
        } finally {
            setDownloading(false)
        }
    }

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
    }

    if (!quote) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-100">Cotización no encontrada</div>
    }

    // Determine who the quote is for
    const entity = quote.client || quote.lead
    const isLead = !!quote.lead_id

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col print:p-0 print:bg-white rounded-xl print:rounded-none">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border border-gray-200/50 shadow-sm rounded-xl mb-8 print:hidden">
                <div className="px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/quotes">
                                <Button variant="ghost" size="sm" className="hover:bg-gray-100">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Volver
                                </Button>
                            </Link>
                            <div className="h-8 w-px bg-gray-300" />
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Cotización</h1>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${quote.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                                quote.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                                    quote.status === 'accepted' ? 'bg-green-100 text-green-700' :
                                        'bg-red-100 text-red-700'
                                }`}>
                                {quote.status === 'draft' ? 'Borrador' :
                                    quote.status === 'sent' ? 'Enviada' :
                                        quote.status === 'accepted' ? 'Aprobada' : 'Rechazada'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {isLead && (
                                <Button
                                    onClick={handleConvertLead}
                                    disabled={converting}
                                    className="bg-brand-pink hover:bg-brand-pink/90 text-white shadow-sm"
                                >
                                    {converting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                    Convertir a Cliente
                                </Button>
                            )}

                            {quote.client_id && (
                                <Button
                                    onClick={handleConvertToInvoice}
                                    disabled={converting}
                                    className="bg-brand-pink hover:bg-brand-pink/90 text-white border-0"
                                >
                                    {converting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Convertir a Factura
                                </Button>
                            )}

                            {quote.status === 'draft' && (
                                <Link href={`/quotes/${quote.id}/edit`}>
                                    <Button variant="outline" className="shadow-sm">
                                        <Edit className="mr-2 h-4 w-4" /> Editar
                                    </Button>
                                </Link>
                            )}

                            <ShareButton
                                disabled={downloading}
                                className="bg-gray-900 hover:bg-gray-800 text-white shadow-sm min-w-[140px]"
                                onIconClick={(platform) => {
                                    if (platform === 'whatsapp') setIsWhatsAppOpen(true)
                                    if (platform === 'email') handleEmailShare()
                                    if (platform === 'download') handleDownloadPDF()
                                }}
                            >
                                {downloading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    "Compartir"
                                )}
                            </ShareButton>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quote Content Wrapper */}
            <div className="flex-1 flex justify-center px-4 pb-12">
                <QuoteTemplate
                    ref={quoteRef}
                    quote={quote}
                    settings={settings}
                />
            </div>

            <QuoteWhatsAppModal
                quote={quote}
                open={isWhatsAppOpen}
                onOpenChange={setIsWhatsAppOpen}
            />
        </div>
    )
}
