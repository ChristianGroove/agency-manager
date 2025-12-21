"use client"

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { InvoiceForm } from "@/components/modules/finance/invoice-form"
import { toast } from "sonner"

interface InvoiceFormModalProps {
    isOpen: boolean
    onClose: () => void
}

export function InvoiceFormModal({ isOpen, onClose }: InvoiceFormModalProps) {

    const handleSuccess = () => {
        toast.success("Factura creada correctamente")
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto top-[5%] translate-y-0">
                {/* Header is visually handled by InvoiceForm but we can wrap it if needed */}
                <InvoiceForm onCancel={onClose} onSuccess={handleSuccess} />
            </DialogContent>
        </Dialog>
    )
}
