import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Invoice } from "@/types"
import { FileText, Printer } from "lucide-react"

interface InvoiceDetailModalProps {
    invoice: Invoice | null
    open: boolean
    onOpenChange: (open: boolean) => void
    token: string
}

export function InvoiceDetailModal({ invoice, open, onOpenChange, token }: InvoiceDetailModalProps) {
    if (!invoice) return null

    const handleViewPDF = () => {
        // /portal/[token]/invoice/[id]
        window.open(`/portal/${token}/invoice/${invoice.id}`, '_blank')
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-0 shadow-2xl rounded-xl bg-white">
                <DialogHeader className="p-6 pb-2 border-b border-gray-100 flex-row items-center justify-between space-y-0">
                    <DialogTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                        <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center">
                            <FileText className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <span>Documento</span>
                            <span className="block text-sm font-normal text-gray-500">#{invoice.number}</span>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    {/* Status & Dates */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Fecha de Emisión</p>
                            <p className="font-medium text-gray-900">{new Date(invoice.date).toLocaleDateString()}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Fecha de Vencimiento</p>
                            <p className="font-medium text-gray-900">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}</p>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                        <div className="bg-gray-50/50 px-4 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase flex justify-between">
                            <span>Descripción</span>
                            <span>Importe</span>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {invoice.items?.map((item: any, idx: number) => (
                                <div key={idx} className="px-4 py-3 flex justify-between text-sm group hover:bg-gray-50/50 transition-colors">
                                    <span className="text-gray-700">
                                        {item.description}
                                        {item.quantity > 1 && <span className="text-gray-400 ml-1 text-xs">x{item.quantity}</span>}
                                    </span>
                                    <span className="font-medium text-gray-900">${(item.price * item.quantity).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        <div className="bg-gray-50 px-4 py-4 flex justify-between items-center border-t border-gray-100">
                            <span className="text-gray-600 font-medium">Total</span>
                            <span className="text-xl font-bold text-gray-900">${invoice.total.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-4 pt-2 bg-white flex w-full">
                    <div className="flex flex-row w-full gap-2">
                        {/* Close Button */}
                        <Button
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="flex-1"
                        >
                            Cerrar
                        </Button>

                        {/* PDF - Always Visible, Full Width */}
                        <Button
                            variant="outline"
                            onClick={handleViewPDF}
                            className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
                        >
                            <Printer className="h-4 w-4" />
                            <span>PDF</span>
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
