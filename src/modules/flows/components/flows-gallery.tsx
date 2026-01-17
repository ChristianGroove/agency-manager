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

export function FlowsGallery() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MASTER_TEMPLATES.map((template) => (
                <button
                    key={template.id}
                    className="group text-left h-full transition-all hover:-translate-y-1"
                    onClick={() => console.log('Open Wizard for:', template.id)}
                >
                    <div className="h-full bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-600 hover:shadow-xl transition-colors">

                        {/* ICON HEADER */}
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${template.bgColor}`}>
                            <template.icon className={`w-6 h-6 ${template.color}`} />
                        </div>

                        {/* CONTENT */}
                        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                            {template.title}
                        </h3>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            {template.description}
                        </p>

                        {/* CTA (Invisible until hover implied) */}
                        <div className="mt-6 flex items-center text-xs font-medium text-gray-500 group-hover:text-white transition-colors">
                            Configurar en 2 minutos &rarr;
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}
