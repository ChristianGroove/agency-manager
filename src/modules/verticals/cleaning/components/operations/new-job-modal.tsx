"use client"

import { useState } from "react"
import { Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { JobForm } from "./job-form"

export function NewJobModal() {
    const [open, setOpen] = useState(false)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Nuevo Trabajo
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Agendar Trabajo de Limpieza</DialogTitle>
                    <DialogDescription>
                        Crea un nuevo servicio y asígnalo a un cliente.
                    </DialogDescription>
                </DialogHeader>

                <JobForm
                    onSuccess={() => {
                        setOpen(false)
                        window.location.reload()
                    }}
                    onCancel={() => setOpen(false)}
                />
            </DialogContent>
        </Dialog>
    )
}
