"use client";

import React from 'react';
import {
    Banknote,
    MessageSquareHeart,
    UserPlus,
    FileCheck,
    CalendarClock
} from 'lucide-react';
import { Card } from '@/components/ui/card'; // Using existing UI component if available, or HTML

// THE MAGIC 5 (Hardcoded for MVP Visualization)
const MASTER_TEMPLATES = [
    {
        id: 'payment_recovery',
        title: 'Recuperar pagos atrasados',
        description: 'Avisa amablemente a los clientes cuando su factura vence. Escala el tono si no responden.',
        icon: Banknote,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-400/10'
    },
    {
        id: 'budget_followup',
        title: 'Cerrar más presupuestos',
        description: 'Envía un seguimiento automático 48h después de enviar una cotización si no hay respuesta.',
        icon: FileCheck,
        color: 'text-blue-400',
        bgColor: 'bg-blue-400/10'
    },
    {
        id: 'client_reactivation',
        title: 'Reactivar clientes dormidos',
        description: 'Detecta inactividad de 60 días y envía una oferta especial de retorno.',
        icon: CalendarClock,
        color: 'text-amber-400',
        bgColor: 'bg-amber-400/10'
    },
    {
        id: 'review_request',
        title: 'Conseguir reseñas 5 estrellas',
        description: 'Espera a que un servicio finalice con éxito y solicita una reseña en Google.',
        icon: MessageSquareHeart,
        color: 'text-purple-400',
        bgColor: 'bg-purple-400/10'
    },
    {
        id: 'client_onboarding',
        title: 'Onboarding de Nuevo Cliente',
        description: 'Envía email de bienvenida, crea carpeta en Drive y avisa al equipo en Slack.',
        icon: UserPlus,
        color: 'text-pink-400',
        bgColor: 'bg-pink-400/10'
    }
];

import { WizardModal } from './wizard-modal';
import { useState } from 'react';

export function FlowsGallery() {
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {MASTER_TEMPLATES.map((template) => (
                    <button
                        key={template.id}
                        onClick={() => setSelectedTemplateId(template.id)}
                        className="group text-left h-[140px] w-full"
                    >
                        <div className="h-full w-full bg-white dark:bg-card/50 border border-gray-200 dark:border-white/10 rounded-xl p-4 hover:border-brand-pink/50 dark:hover:border-brand-pink/50 hover:shadow-lg hover:shadow-brand-pink/5 dark:hover:shadow-brand-pink/10 transition-all duration-300 group-hover:-translate-y-1 flex flex-col">

                            {/* HEADER: INLINE ICON + TITLE */}
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${template.bgColor} border border-white/5`}>
                                    <template.icon className={`w-4 h-4 ${template.color}`} />
                                </div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight group-hover:text-brand-pink transition-colors line-clamp-2">
                                    {template.title}
                                </h3>
                            </div>

                            {/* DESCRIPTION */}
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">
                                {template.description}
                            </p>
                        </div>
                    </button>
                ))}
            </div>

            {/* THE WIZARD MODAL */}
            {selectedTemplateId && (
                <WizardModal
                    isOpen={!!selectedTemplateId}
                    templateId={selectedTemplateId}
                    onClose={() => setSelectedTemplateId(null)}
                    onDeploy={(config) => {
                        console.log('Deploying Routine:', selectedTemplateId, config);
                        // In real Phase 2 integration, this would call FlowEngine.createRoutineFromTemplate
                        setSelectedTemplateId(null);
                        alert('¡Rutina configurada con éxito! (Simulación MVP)');
                    }}
                />
            )}
        </>
    );
}
