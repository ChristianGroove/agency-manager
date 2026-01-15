"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { CalendarClock, ArchiveRestore, Forward } from "lucide-react"
import { useState } from "react"
import { differenceInDays, format } from "date-fns"
import { es } from "date-fns/locale"

interface ServiceRetroactiveModalProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    startDate: Date
    onConfirm: (strategy: 'RETROACTIVE' | 'IGNORE_PAST') => void
}

export function ServiceRetroactiveModal({ isOpen, onOpenChange, startDate, onConfirm }: ServiceRetroactiveModalProps) {
    const [strategy, setStrategy] = useState<'RETROACTIVE' | 'IGNORE_PAST'>('RETROACTIVE')

    const daysDiff = differenceInDays(new Date(), startDate)

    const handleConfirm = () => {
        onConfirm(strategy)
        onOpenChange(false)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-600">
                        <CalendarClock className="h-5 w-5" />
                        Fecha de Inicio en el Pasado
                    </DialogTitle>
                    <DialogDescription>
                        Has seleccionado iniciar el servicio el <strong>{format(startDate, "PPP", { locale: es })}</strong>, que fue hace {daysDiff} días.
                        ¿Cómo deseas manejar la facturación de este periodo pasado?
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <RadioGroup value={strategy} onValueChange={(v: any) => setStrategy(v)} className="gap-4">
                        {/* Option 1: Retroactive */}
                        <div className={`flex items-start space-x-3 space-y-0 text-sm border p-4 rounded-xl cursor-pointer transition-all ${strategy === 'RETROACTIVE' ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500' : 'border-gray-200 hover:bg-gray-50'}`} onClick={() => setStrategy('RETROACTIVE')}>
                            <RadioGroupItem value="RETROACTIVE" id="r1" className="mt-1" />
                            <div className="grid gap-1.5 cursor-pointer">
                                <Label htmlFor="r1" className="font-bold flex items-center gap-2 cursor-pointer">
                                    <ArchiveRestore className="h-4 w-4" />
                                    Generar Cobros Retroactivos
                                </Label>
                                <p className="text-gray-500">
                                    El sistema calculará los ciclos vencidos desde la fecha de inicio hasta hoy y generará las facturas correspondientes inmediatamente.
                                </p>
                            </div>
                        </div>

                        {/* Option 2: Ignore Past */}
                        <div className={`flex items-start space-x-3 space-y-0 text-sm border p-4 rounded-xl cursor-pointer transition-all ${strategy === 'IGNORE_PAST' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:bg-gray-50'}`} onClick={() => setStrategy('IGNORE_PAST')}>
                            <RadioGroupItem value="IGNORE_PAST" id="r2" className="mt-1" />
                            <div className="grid gap-1.5 cursor-pointer">
                                <Label htmlFor="r2" className="font-bold flex items-center gap-2 cursor-pointer">
                                    <Forward className="h-4 w-4" />
                                    Iniciar Facturación Hoy
                                </Label>
                                <p className="text-gray-500">
                                    Ignorar el tiempo pasado. El primer ciclo de cobro comenzará a contar desde hoy (o la fecha de corte más cercana a futuro).
                                </p>
                            </div>
                        </div>
                    </RadioGroup>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleConfirm} className="bg-black text-white hover:bg-gray-800">
                        Confirmar Configuración
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
