"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getPortalData, acceptQuote } from "@/app/actions/portal-actions"
import { Client, Invoice, Quote, Briefing, ClientEvent } from "@/types"
import { Loader2, AlertTriangle, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PortalDashboard } from "@/components/modules/portal/portal-dashboard"
import { QuoteDetailModal } from "@/components/modules/portal/quote-detail-modal"

export default function PortalPage() {
    const params = useParams()
    const [client, setClient] = useState<Client | null>(null)
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [quotes, setQuotes] = useState<Quote[]>([])
    const [briefings, setBriefings] = useState<Briefing[]>([])
    const [events, setEvents] = useState<ClientEvent[]>([])
    const [settings, setSettings] = useState<any>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [isProcessing, setIsProcessing] = useState(false)
    const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null)
    const [viewQuote, setViewQuote] = useState<Quote | null>(null)
    const [showSuccessMessage, setShowSuccessMessage] = useState(false)

    useEffect(() => {
        if (params.token) {
            fetchData(params.token as string)
        }

        // Check for Wompi return
        const searchParams = new URLSearchParams(window.location.search)
        if (searchParams.get('id')) {
            setShowSuccessMessage(true)
            window.history.replaceState({}, '', window.location.pathname)
        }
    }, [params.token])

    const fetchData = async (token: string) => {
        try {
            const data = await getPortalData(token)
            setClient(data.client)
            setInvoices(data.invoices)
            setQuotes(data.quotes)
            setBriefings(data.briefings)
            setEvents(data.events)
            setSettings(data.settings || {})
        } catch (err) {
            console.error(err)
            setError("No se pudo cargar la información. El enlace puede ser inválido.")
        } finally {
            setLoading(false)
        }
    }

    const handleAcceptQuote = async (quoteId: string) => {
        if (!params.token) return
        try {
            const result = await acceptQuote(params.token as string, quoteId)
            if (result.success) {
                // Update local state
                setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: 'accepted' } : q))
                // Refresh data to get the new event
                fetchData(params.token as string)
            } else {
                console.error(result.error)
                alert("Error al aprobar la cotización")
            }
        } catch (error) {
            console.error(error)
            alert("Error inesperado")
        }
    }

    const handlePay = async (invoiceIds: string[]) => {
        if (invoiceIds.length === 0) return

        // Check min payment amount
        const totalAmount = invoices
            .filter(i => invoiceIds.includes(i.id))
            .reduce((acc, curr) => acc + curr.total, 0)

        if (settings.min_payment_amount && totalAmount < settings.min_payment_amount) {
            alert(`El monto mínimo para pagos en línea es de $${parseInt(settings.min_payment_amount).toLocaleString()}`)
            return
        }

        setIsProcessing(true)
        try {
            const response = await fetch('/api/wompi/signature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invoiceIds })
            })

            if (!response.ok) throw new Error('Error generating signature')

            const { reference, amountInCents, currency, signature, publicKey } = await response.json()

            const redirectUrl = window.location.href

            const wompiUrl = `https://checkout.wompi.co/p/?public-key=${publicKey}&currency=${currency}&amount-in-cents=${amountInCents}&reference=${reference}&signature:integrity=${signature}&redirect-url=${encodeURIComponent(redirectUrl)}&customer-data:email=${client?.email || ''}&customer-data:full-name=${encodeURIComponent(client?.name || '')}`

            window.location.href = wompiUrl

        } catch (error) {
            console.error('Payment error:', error)
            alert('Error al iniciar el pago')
            setIsProcessing(false)
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-pink-500" /></div>
    if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>
    if (!client) return null

    // Portal Disabled Check
    if (settings.portal_enabled === false) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
                <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Portal en Mantenimiento</h1>
                <p className="text-gray-600 max-w-md">
                    El portal de clientes no está disponible en este momento. Por favor contacta a la agencia directamente.
                </p>
            </div>
        )
    }

    // Branding Colors Injection
    const brandingStyles = {
        '--portal-primary': settings.portal_primary_color || '#F205E2',
        '--portal-secondary': settings.portal_secondary_color || '#00E0FF',
    } as React.CSSProperties

    return (
        <div className="min-h-screen bg-gray-50" style={brandingStyles}>
            <div className="max-w-7xl mx-auto p-4 md:p-8">
                {/* Logo Header */}
                <div className="flex justify-center mb-8 relative">
                    <img
                        src={settings.portal_logo_url || "/branding/logo dark.svg"}
                        alt="Logo"
                        className="h-10 object-contain"
                    />
                    <span className="absolute -right-4 top-0 bg-pink-500 text-white text-[10px] px-1 rounded">v2.0</span>
                </div>
                {/* Debug Info */}
                <div className="hidden">
                    {console.log('Portal Data:', { client, invoices, quotes, briefings, events, settings })}
                </div>

                <PortalDashboard
                    client={client}
                    invoices={invoices}
                    quotes={quotes}
                    briefings={briefings}
                    events={events}
                    onPay={handlePay}
                    onViewInvoice={setViewInvoice}
                    onViewQuote={setViewQuote}
                    settings={settings}
                />

                {/* Footer */}
                {settings.portal_footer_text && (
                    <div className="text-center text-sm text-gray-400 mt-12 pb-8">
                        {settings.portal_footer_text}
                    </div>
                )}
            </div>

            {/* Success Message Modal */}
            {showSuccessMessage && settings.payment_success_message && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full text-center space-y-4 animate-in zoom-in-95">
                        <div className="h-12 w-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                            <Check className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">¡Pago Recibido!</h3>
                        <p className="text-gray-600 whitespace-pre-wrap">{settings.payment_success_message}</p>
                        <Button onClick={() => setShowSuccessMessage(false)} className="w-full text-white" style={{ backgroundColor: settings.portal_primary_color || '#F205E2' }}>
                            Entendido
                        </Button>
                    </div>
                </div>
            )}

            {/* Invoice Detail Modal */}
            {viewInvoice && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewInvoice(null)}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b flex justify-between items-center">
                            <h3 className="text-lg font-bold">Factura #{viewInvoice.number}</h3>
                            <Button variant="ghost" size="sm" onClick={() => setViewInvoice(null)}>✕</Button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500">Fecha de Emisión</p>
                                    <p className="font-medium">{new Date(viewInvoice.date).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Fecha de Vencimiento</p>
                                    <p className="font-medium">{viewInvoice.due_date ? new Date(viewInvoice.due_date).toLocaleDateString() : '-'}</p>
                                </div>
                            </div>

                            <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
                                {viewInvoice.items?.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span>{item.description} <span className="text-gray-400">x{item.quantity}</span></span>
                                        <span className="font-medium">${(item.price * item.quantity).toLocaleString()}</span>
                                    </div>
                                ))}
                                <div className="border-t pt-2 mt-2 flex justify-between font-bold text-gray-900">
                                    <span>Total</span>
                                    <span>${viewInvoice.total.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t bg-gray-50 flex justify-end">
                            <Button onClick={() => setViewInvoice(null)}>Cerrar</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quote Detail Modal */}
            <QuoteDetailModal
                quote={viewQuote}
                open={!!viewQuote}
                onOpenChange={(open) => !open && setViewQuote(null)}
                onAccept={handleAcceptQuote}
            />
        </div>
    )
}

