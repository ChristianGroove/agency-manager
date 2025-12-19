import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Quote } from "@/types"
import { useState } from "react"
import { CheckCircle2, FileText, Loader2 } from "lucide-react"

interface QuoteDetailModalProps {
    quote: Quote | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onAccept: (quoteId: string) => Promise<void>
}

export function QuoteDetailModal({ quote, open, onOpenChange, onAccept }: QuoteDetailModalProps) {
    const [isAccepting, setIsAccepting] = useState(false)

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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        Cotización #{quote.number}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Items Table */}
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-gray-500">Descripción</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-500">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {quote.items?.map((item: any, i: number) => (
                                    <tr key={i}>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-900">{item.description}</p>
                                            {item.quantity && <p className="text-xs text-gray-500">Cant: {item.quantity}</p>}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                                            {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(item.total || item.price * item.quantity)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50">
                                <tr>
                                    <td className="px-4 py-3 font-bold text-gray-900 text-right">Total</td>
                                    <td className="px-4 py-3 font-bold text-gray-900 text-right">
                                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(quote.total)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {quote.status === 'accepted' ? (
                        <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5" />
                            Esta cotización ya ha sido aprobada.
                        </div>
                    ) : (
                        <div className="bg-blue-50 text-blue-700 p-4 rounded-lg text-sm">
                            Al aprobar esta cotización, confirmas que estás de acuerdo con los términos y condiciones.
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cerrar
                    </Button>
                    {quote.status !== 'accepted' && (
                        <Button onClick={handleAccept} disabled={isAccepting} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {isAccepting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Aprobando...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Aprobar Cotización
                                </>
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
