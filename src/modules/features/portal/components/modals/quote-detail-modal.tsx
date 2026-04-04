
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Quote } from "@/types"
import { useState } from "react"
import { CheckCircle2, FileText, Loader2, XCircle, Printer } from "lucide-react"

interface QuoteDetailModalProps {
    quote: Quote | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onAccept: (quoteId: string) => Promise<void>
    onReject: (quoteId: string) => Promise<void>
    settings?: any
    token: string
}

export function QuoteDetailModal({ quote, open, onOpenChange, onAccept, onReject, settings, token }: QuoteDetailModalProps) {
    const [isAccepting, setIsAccepting] = useState(false)
    const [isRejecting, setIsRejecting] = useState(false)

    if (!quote) return null

    const handleAccept = async () => {
        setIsAccepting(true)
        try {
            await onAccept(quote.id)
            onOpenChange(false)
        } catch (error) {
            console.error(error)
        } finally {
            setIsAccepting(false)
        }
    }

    const handleReject = async () => {
        if (!confirm("¿Estás seguro de que deseas rechazar esta cotización?")) return
        setIsRejecting(true)
        try {
            await onReject(quote.id)
            onOpenChange(false)
        } catch (error) {
            console.error(error)
        } finally {
            setIsRejecting(false)
        }
    }

    const handleViewPDF = () => {
        // Construct URL using the proper token passed from parent
        // /portal/[token]/quote/[id]
        window.open(`/portal/${token}/quote/${quote.id}`, '_blank')
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-0 shadow-2xl rounded-xl bg-white">
                <DialogHeader className="p-6 pb-2 border-b border-gray-100 flex-row items-center justify-between space-y-0">
                    <DialogTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                        <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center">
                            <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <span>Cotización</span>
                            <span className="block text-sm font-normal text-gray-500">#{quote.number}</span>
                        </div>
                    </DialogTitle>
                    {/* Native Close X is usually rendered by DialogContent, but we can ensure it's visible */}
                </DialogHeader>

                <div className="p-6 space-y-8">
                    {/* Items Table - Visual Refresh */}
                    <div className="rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">Concepto</th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-500 text-xs uppercase tracking-wider">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {quote.items?.map((item: any, i: number) => (
                                    <tr key={i} className="group hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3.5">
                                            <p className="font-medium text-gray-900">{item.description}</p>
                                            {item.quantity && <p className="text-xs text-gray-500 mt-0.5">Cant: {item.quantity}</p>}
                                        </td>
                                        <td className="px-4 py-3.5 text-right font-medium text-gray-900 whitespace-nowrap">
                                            {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(item.total || item.price * item.quantity)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50 border-t border-gray-100">
                                <tr>
                                    <td className="px-4 py-4 font-bold text-gray-900 text-right">Total a Pagar</td>
                                    <td className="px-4 py-4 font-bold text-xl text-gray-900 text-right">
                                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(quote.total)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {quote.status === 'accepted' ? (
                        <div className="bg-green-50 border border-green-100 text-green-700 p-4 rounded-xl flex items-center gap-3">
                            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                            </div>
                            <p className="font-medium text-sm">Esta cotización fue aprobada.</p>
                        </div>
                    ) : quote.status === 'rejected' ? (
                        <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl flex items-center gap-3">
                            <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <XCircle className="h-4 w-4 text-red-600" />
                            </div>
                            <p className="font-medium text-sm">Esta cotización fue rechazada.</p>
                        </div>
                    ) : (
                        <div className="bg-blue-50 border border-blue-100 text-blue-700 p-4 rounded-xl text-sm leading-relaxed text-center">
                            Al aprobar esta cotización, confirmas que estás de acuerdo con los términos y condiciones del servicio.
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 pt-2 bg-white flex w-full">
                    {/* Actions Group - Horizontal, Full Width */}
                    <div className="flex flex-row w-full gap-2">

                        {/* PDF - Always Visible */}
                        <Button
                            variant="outline"
                            onClick={handleViewPDF}
                            className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
                        >
                            <Printer className="h-4 w-4" />
                            <span className="hidden xs:inline">PDF</span>
                            <span className="inline xs:hidden">PDF</span>
                        </Button>

                        {/* Decision Buttons */}
                        {quote.status !== 'accepted' && quote.status !== 'rejected' && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={handleReject}
                                    disabled={isRejecting || isAccepting}
                                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 px-2"
                                >
                                    {isRejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rechazar"}
                                </Button>
                                <Button
                                    onClick={handleAccept}
                                    disabled={isAccepting || isRejecting}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 px-2"
                                >
                                    {isAccepting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aprobar"}
                                </Button>
                            </>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

