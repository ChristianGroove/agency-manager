"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetTrigger,
} from "@/components/ui/sheet"
import { QuoteBuilder } from "./quote-builder"
import { Emitter } from "@/types"

interface CreateQuoteSheetProps {
    emitters?: Emitter[]
    open?: boolean
    onOpenChange?: (open: boolean) => void
    trigger?: React.ReactNode
    onSuccess?: () => void
    leadId?: string // Pre-link to lead
    leadName?: string
    leadEmail?: string
    leadPhone?: string
}

export function CreateQuoteSheet({ emitters = [], open: controlledOpen, onOpenChange: setControlledOpen, trigger, onSuccess, leadId, leadName, leadEmail, leadPhone }: CreateQuoteSheetProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : internalOpen

    const setOpen = (val: boolean) => {
        if (!isControlled) setInternalOpen(val)
        if (setControlledOpen) setControlledOpen(val)
    }

    const router = useRouter()

    const handleSuccess = () => {
        setOpen(false)
        if (onSuccess) onSuccess()
        else router.refresh()
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            {trigger ? (
                <SheetTrigger asChild>
                    {trigger}
                </SheetTrigger>
            ) : (
                <SheetTrigger asChild>
                    <Button className="w-full md:w-auto bg-brand-pink hover:bg-brand-pink/90 text-white shadow-md border-0 transition-all hover:scale-105 active:scale-95">
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva Cotización
                    </Button>
                </SheetTrigger>
            )}
            <SheetContent
                side="right"
                className="
                    sm:max-w-[1000px] w-full p-0 gap-0 border-none shadow-2xl
                    mr-4 my-4 h-[calc(100vh-2rem)] rounded-3xl overflow-hidden
                    data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:mr-6
                    bg-transparent
                "
            >
                <SheetHeader className="hidden">
                    <SheetTitle>{leadName ? `Cotización para ${leadName}` : 'Nueva Cotización'}</SheetTitle>
                    <SheetDescription>Formulario para crear una nueva cotización.</SheetDescription>
                </SheetHeader>
                <QuoteBuilder
                    mode="sheet"
                    onSuccess={handleSuccess}
                    emitters={emitters}
                    prefillLeadId={leadId}
                    prefillLeadName={leadName}
                    prefillLeadEmail={leadEmail}
                    prefillLeadPhone={leadPhone}
                />
            </SheetContent>
        </Sheet>
    )
}
