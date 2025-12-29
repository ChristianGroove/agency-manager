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

export interface NewJobModalProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    trigger?: React.ReactNode
}

export function NewJobModal({ open: externalOpen, onOpenChange: externalOnOpenChange, trigger }: NewJobModalProps) {
    const [internalOpen, setInternalOpen] = useState(false)

    const isControlled = externalOpen !== undefined
    const open = isControlled ? externalOpen : internalOpen
    const onOpenChange = isControlled ? externalOnOpenChange : setInternalOpen

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger ? (
                <DialogTrigger asChild>
                    {trigger}
                </DialogTrigger>
            ) : (
                !isControlled && (
                    <DialogTrigger asChild>
                        <Button>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Nuevo Trabajo
                        </Button>
                    </DialogTrigger>
                )
            )}
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Agendar Trabajo de Limpieza</DialogTitle>
                    <DialogDescription>
                        Crea un nuevo servicio y asígnalo a un cliente.
                    </DialogDescription>
                </DialogHeader>

                <JobForm
                    onSuccess={() => {
                        onOpenChange && onOpenChange(false)
                        window.location.reload()
                    }}
                    onCancel={() => onOpenChange && onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    )
}
