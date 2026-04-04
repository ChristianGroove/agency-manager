"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Briefcase } from "lucide-react"
import { CreateFormSheet } from "./create-form-sheet"
import { SectionHeader } from "@/components/layout/section-header"

export function FormPageHeader() {
    const [isModalOpen, setIsModalOpen] = useState(false)

    return (
        <>
            <SectionHeader
                title="Formularios / Briefings"
                subtitle="Gestiona los formularios de requerimientos de tus clientes."
                icon={Briefcase}
                action={
                    <div className="w-full md:w-auto">
                        <Button
                            onClick={() => setIsModalOpen(true)}
                            className="w-full md:w-auto bg-brand-pink hover:bg-brand-pink/90 text-white shadow-md border-0"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Nuevo Formulario
                        </Button>
                    </div>
                }
            />

            <CreateFormSheet
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                onSuccess={() => setIsModalOpen(false)}
            />
        </>
    )
}
