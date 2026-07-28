"use client"

import React, { useState } from "react"
import { SectionHeader } from "@/components/layout/section-header"
import { RestoStaffAdminView } from "./resto-staff-admin-view"
import { Users, Plus } from "lucide-react"

interface RestoStaffPageContainerProps {
    orgId: string
    zones: any[]
}

export function RestoStaffPageContainer({ orgId, zones }: RestoStaffPageContainerProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false)

    return (
        <div className="flex-1 space-y-6">
            <SectionHeader
                title="Personal Operativo"
                subtitle="Gestión del equipo de sala, barra y caja, asignación de zonas y credenciales de acceso a portales POS."
                icon={Users}
                action={
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-white bg-brand-pink hover:opacity-90 transition-all shadow-md shadow-brand-pink/20 cursor-pointer whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Colaborador
                    </button>
                }
            />
            <RestoStaffAdminView
                orgId={orgId}
                zones={zones}
                isCreateOpen={isCreateOpen}
                onCloseCreate={() => setIsCreateOpen(false)}
            />
        </div>
    )
}
