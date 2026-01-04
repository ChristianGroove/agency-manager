"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { JobForm } from "../job-form"
import { Plus } from "lucide-react"

export function CreateWorkOrderSheet({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false)

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {children}
            </SheetTrigger>
            <SheetContent className="sm:max-w-[540px] overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle>Crear Nueva Orden de Trabajo</SheetTitle>
                    <SheetDescription>
                        Diligencia los detalles para agendar un nuevo servicio.
                    </SheetDescription>
                </SheetHeader>
                <JobForm
                    onSuccess={() => {
                        setOpen(false)
                        // Optional: trigger refresh if needed, but actions usually revalidatePath
                    }}
                    onCancel={() => setOpen(false)}
                />
            </SheetContent>
        </Sheet>
    )
}
