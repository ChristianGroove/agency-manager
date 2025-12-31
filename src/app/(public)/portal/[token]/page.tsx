"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getPortalData, acceptQuote, rejectQuote } from "@/modules/core/portal/actions"
import { Client, Invoice, Quote, Briefing, ClientEvent, Service } from "@/types"
import { Loader2, AlertTriangle, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PortalLayout } from "@/modules/core/portal/portal-layout"
import { WorkerPortalLayout } from "@/modules/core/portal/worker-portal-layout"
import { QuoteDetailModal } from "@/modules/core/portal/quote-detail-modal"
import { PaymentOptionsModal } from "@/modules/core/portal/payment-options-modal"
import { InvoiceDetailModal } from "@/modules/core/portal/invoice-detail-modal"

// ... existing imports

export default function PortalPage() {
    const params = useParams()

    // Portal Context
    const [portalType, setPortalType] = useState<'client' | 'staff'>('client')

    // Client Data
    const [client, setClient] = useState<Client | null>(null)
    const [services, setServices] = useState<Service[]>([])
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [quotes, setQuotes] = useState<Quote[]>([])
    const [briefings, setBriefings] = useState<Briefing[]>([])
    const [events, setEvents] = useState<ClientEvent[]>([])
    const [activeModules, setActiveModules] = useState<any[]>([])

    // Payment Methods State (NEW)
    const [paymentMethods, setPaymentMethods] = useState<any[]>([])
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
    const [paymentInvoiceIds, setPaymentInvoiceIds] = useState<string[]>([])

    // Staff Data
    const [staff, setStaff] = useState<any>(null)
    const [jobs, setJobs] = useState<any[]>([])

    // Shared
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

            if (data.type === 'staff') {
                setPortalType('staff')
                setStaff(data.staff)
                setJobs(data.jobs || [])
                setSettings(data.settings || {})
            } else {
                setPortalType('client')
                setClient(data.client || null)
                setInvoices(data.invoices || [])
                setQuotes(data.quotes || [])
                setBriefings(data.briefings || [])
                setEvents(data.events || [])
                setSettings(data.settings || {})
                setServices(data.services || [])
                setActiveModules(data.activePortalModules || [])
                setPaymentMethods(data.paymentMethods || [])
            }
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

    const handleRejectQuote = async (quoteId: string) => {
        if (!params.token) return
        try {
            const result = await rejectQuote(params.token as string, quoteId)
            if (result.success) {
                setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: 'rejected' } : q))
                fetchData(params.token as string)
            } else {
                console.error(result.error)
                alert("Error al rechazar la cotización")
            }
        } catch (error) {
            console.error(error)
            alert("Error inesperado")
        }
    }

    // New Handler: Open Payment Modal
    const handlePayClick = (invoiceIds: string[]) => {
        setPaymentInvoiceIds(invoiceIds)
        setIsPaymentModalOpen(true)
    }

    // Old Logic moved to separate function, triggered by Modal
    const handleWompiPay = async () => {
        const invoiceIds = paymentInvoiceIds
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

            if (!response.ok) {
                const errorData = await response.json()
                const errorMessage = errorData.details
                    ? `${errorData.error}: ${errorData.details}`
                    : (errorData.error || 'Error generating signature')
                throw new Error(errorMessage)
            }

            const { reference, amountInCents, currency, signature, publicKey } = await response.json()

            // Wompi WAF blocks 'localhost' in redirect-url on Production. 
            // We use a dummy URL for local testing to verify the Gateway loads.
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            const redirectUrl = isLocalhost ? 'https://example.com' : window.location.href

            const wompiUrl = `https://checkout.wompi.co/p/?public-key=${publicKey}&currency=${currency}&amount-in-cents=${amountInCents}&reference=${reference}&signature:integrity=${signature}&redirect-url=${encodeURIComponent(redirectUrl)}&customer-data:email=${client?.email || ''}&customer-data:full-name=${encodeURIComponent(client?.name || '')}`

            window.location.href = wompiUrl

        } catch (error: any) {
            console.error('Payment error:', error)
            alert(error.message || 'Error al iniciar el pago')
            setIsProcessing(false)
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-pink-500" /></div>
    if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>

    // Branding Colors Injection + White-Label Phase 3
    const brandingStyles = {
        '--portal-primary': settings.portal_primary_color || '#F205E2',
        '--portal-secondary': settings.portal_secondary_color || '#00E0FF',
        '--primary': settings.portal_primary_color || '#F205E2', // Override Shadcn primary
        backgroundColor: settings.portal_login_background_color || '#F3F4F6',
        backgroundImage: settings.portal_login_background_url ? `url(${settings.portal_login_background_url})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        fontFamily: settings.brand_font_family || 'Inter, sans-serif',
    } as React.CSSProperties

    // -------------------------------------------------------------
    // RENDER: STAFF PORTAL
    // -------------------------------------------------------------
    if (portalType === 'staff' && staff) {
        return (
            <div className="min-h-screen" style={brandingStyles}>
                <WorkerPortalLayout
                    staff={staff}
                    jobs={jobs}
                    settings={settings}
                    token={params.token as string}
                />
            </div>
        )
    }

    // -------------------------------------------------------------
    // RENDER: CLIENT PORTAL (Default)
    // -------------------------------------------------------------
    if (!client) return null // Should not happen due to error state

    // Portal Disabled Check (Only for clients maybe? or both?)
    if (settings.portal_enabled === false) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
                <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Portal en Mantenimiento</h1>
                <p className="text-gray-600 max-w-md">
                    El portal de clientes no está disponible en este momento. Por favor contacta a la empresa directamente.
                </p>
            </div>
        )
    }

    // Determine Payment Amount
    const paymentAmount = invoices
        .filter(i => paymentInvoiceIds.includes(i.id))
        .reduce((acc, curr) => acc + curr.total, 0)

    return (
        <div className="min-h-screen" style={brandingStyles}>
            <PortalLayout
                token={params.token as string}
                client={client}
                invoices={invoices}
                quotes={quotes}
                briefings={briefings}
                events={events}
                services={services}
                settings={settings}
                activeModules={activeModules}
                onPay={handlePayClick}
                onViewInvoice={setViewInvoice}
                onViewQuote={setViewQuote}
            />

            {/* Payment Options Modal */}
            <PaymentOptionsModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                amount={paymentAmount}
                paymentMethods={paymentMethods}
                onWompiPay={handleWompiPay}
                settings={settings}
                invoiceIds={paymentInvoiceIds}
            />

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
            <InvoiceDetailModal
                invoice={viewInvoice}
                open={!!viewInvoice}
                onOpenChange={(open: boolean) => !open && setViewInvoice(null)}
                token={params.token as string}
            />

            {/* Quote Detail Modal */}
            <QuoteDetailModal
                quote={viewQuote}
                open={!!viewQuote}
                onOpenChange={(open: boolean) => !open && setViewQuote(null)}
                onAccept={handleAcceptQuote}
                onReject={handleRejectQuote}
                settings={settings}
                token={params.token as string}
            />
        </div>
    )
}


