import React from 'react';
import { FlowsGallery } from '@/modules/flows/components/flows-gallery';

import { SectionHeader } from "@/components/layout/section-header"
import { Sparkles } from "lucide-react"

export default function FlowsPage() {
    return (
        <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto">

            {/* HEADER: Standardized */}
            <SectionHeader
                title="Pixy Flows"
                subtitle="Selecciona una tarea y Pixy se encargará de ella automáticamente."
                icon={Sparkles}
            />

            {/* THE MENU: Results Gallery */}
            <section>
                <FlowsGallery />
            </section>

            {/* ACTIVE ROUTINES (If any) - Placeholder for MVP */}
            <section className="pt-8 border-t border-gray-800">
                <h2 className="text-xl font-semibold mb-4 text-white">Tus Rutinas Activas</h2>
                <div className="p-12 border border-dashed border-gray-700 rounded-lg text-center text-gray-500">
                    Aún no tienes rutinas activas. Empieza seleccionando una arriba.
                </div>
            </section>
        </div>
    );
}
