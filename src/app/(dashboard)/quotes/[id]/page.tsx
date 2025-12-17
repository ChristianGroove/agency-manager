"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, Download, Share2, Mail, ArrowLeft, UserPlus, Edit } from "lucide-react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { Quote, Client, Lead } from "@/types"
import { LeadsService } from "@/services/leads-service"
import { QuotesService } from "@/services/quotes-service"
import { QuoteWhatsAppModal } from "@/components/modules/quotes/quote-whatsapp-modal"

export default function QuoteDetailPage() {
    const params = useParams()
    const router = useRouter()
    const [quote, setQuote] = useState<Quote | null>(null)
    const [loading, setLoading] = useState(true)
    const [converting, setConverting] = useState(false)
    const [downloading, setDownloading] = useState(false)
    const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false)
    const quoteRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (params.id) {
            fetchQuote(params.id as string)
        }
    }, [params.id])

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
            const newClient = await LeadsService.convertLeadToClient(quote.lead_id)
            alert(`¡Prospecto convertido exitosamente! Ahora es el cliente: ${newClient.name}`)
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
        if (!confirm("¿Convertir esta cotización en factura?")) return
        setConverting(true)
        try {
            const invoice = await QuotesService.convertQuoteToInvoice(quote.id)
            alert("Factura generada exitosamente")
            router.push(`/invoices/${invoice.id}`)
        } catch (error: any) {
            console.error(error)
            alert(error.message || "Error al convertir a factura")
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

                            <Button variant="outline" className="shadow-sm" onClick={() => setIsWhatsAppOpen(true)}>
                                <Share2 className="mr-2 h-4 w-4 text-green-600" /> WhatsApp
                            </Button>

                            <Button variant="outline" className="shadow-sm" onClick={handleEmailShare} disabled={downloading}>
                                {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />} Email
                            </Button>

                            <Button variant="outline" className="shadow-sm" onClick={handleDownloadPDF} disabled={downloading}>
                                <Download className="mr-2 h-4 w-4" /> PDF
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quote Content Wrapper */}
            <div className="flex-1 flex justify-center px-4 pb-12">
                {/* Quote Container */}
                <div
                    ref={quoteRef}
                    className="w-full max-w-[800px] bg-white text-gray-900 p-12 shadow-lg border border-gray-200 relative overflow-hidden rounded-xl"
                    style={{ minHeight: '1123px' }}
                >
                    {/* Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                        <img
                            src="/pixy-isotipo.png"
                            alt="Watermark"
                            className="w-[80%] opacity-[0.03] object-contain"
                        />
                    </div>

                    <div className="flex flex-col h-full relative z-10">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-12 pb-6 border-b-2 border-gray-900">
                            <div className="flex flex-col items-center">
                                <img src="/branding/logo dark.svg" alt="PIXY" className="h-12 w-auto" />
                                <p className="text-sm text-gray-600 mt-2 font-medium tracking-wide">Private design service</p>
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
                                <p className="font-bold text-base text-gray-900">Cristian Camilo Gómez</p>
                                <p className="text-sm text-gray-700">NIT: 1110458437</p>
                                <p className="text-sm text-gray-700">Cra 3 # 41-107 Ibagué-Tolima</p>
                                <p className="text-sm text-gray-700">contact@pixy.com.co</p>
                                <p className="text-sm font-semibold text-gray-900 mt-1">Cel: +57 350 407 6800</p>
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
                                Esta cotización tiene una validez de 15 días calendario. Los precios están sujetos a cambios después de este periodo.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <QuoteWhatsAppModal
                quote={quote}
                open={isWhatsAppOpen}
                onOpenChange={setIsWhatsAppOpen}
            />
        </div>
    )
}
