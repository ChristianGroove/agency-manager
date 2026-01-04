"use client"

import { Button } from "@/components/ui/button"

export function CreateWorkOrderSheet({ children }: { children: React.ReactNode }) {
    return (
        <Button disabled variant="outline">
            Crear Orden (Deshabilitado)
        </Button>
    )
}
