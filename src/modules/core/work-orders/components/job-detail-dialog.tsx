import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FileX2 } from "lucide-react"

interface JobDetailDialogProps {
    job: any | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onUpdate: () => void
}

export function JobDetailDialog({ job, open, onOpenChange, onUpdate }: JobDetailDialogProps) {
    // TEMPORARILY DISABLED DUE TO TYPE MISMATCHES  
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Componente temporalmente deshabilitado</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-12 text-center">
                    <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                        <FileX2 className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Diálogo de detalle temporalmente deshabilitado</h3>
                    <p className="text-sm text-gray-500 max-w-sm mt-1">
                        Este componente requiere refactorización de tipos. Será restaurado pronto.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
}
