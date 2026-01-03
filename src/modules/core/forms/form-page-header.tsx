"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { CreateFormSheet } from "./create-form-sheet"
import { SplitText } from "@/components/ui/split-text"

export function FormPageHeader() {
    const [isModalOpen, setIsModalOpen] = useState(false)

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                    <SplitText>Formularios / Briefings</SplitText>
                </h2>
                <p className="text-muted-foreground mt-1">Gestiona los formularios de requerimientos de tus clientes.</p>
            </div>
            <div className="w-full md:w-auto">
                <Button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full md:w-auto bg-brand-pink hover:bg-brand-pink/90 text-white shadow-md border-0"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Formulario
                </Button>
            </div>

            <CreateFormSheet
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onSuccess={() => setIsModalOpen(false)}
            />
        </div>
    )
}
