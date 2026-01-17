import React, { useState } from 'react';
import { StepCard } from './step-card';
import { StepConfigPanel } from './step-config-panel';
import { FlowStep } from '../../types';

// MOCK STEPS for Visualization
const MOCK_STEPS: FlowStep[] = [
    { id: '1', position: 1, type: 'trigger', key: 'invoice_overdue', label: 'Cuando la factura vence', config: {} },
    { id: '2', position: 2, type: 'wait', key: 'wait_3_days', label: 'Esperar 3 días', config: { days: 3 } },
    { id: '3', position: 3, type: 'rule', key: 'check_amount', label: '¿Monto > $50?', config: { amount: 50 } },
    { id: '4', position: 4, type: 'action', key: 'send_whatsapp', label: 'Enviar WhatsApp Amable', config: { template: 'soft' } },
];

export function RailContainer() {
    const [selectedStep, setSelectedStep] = useState<FlowStep | null>(null);

    return (
        <div className="flex h-screen bg-gray-950 text-white overflow-hidden">

            {/* LEFT: The Rail (Timeline) */}
            <div className="flex-1 overflow-y-auto flex flex-col items-center py-12 relative">

                {/* The Vertical Line */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-gray-800 left-1/2 transform -translate-x-1/2 z-0" />

                <div className="z-10 w-full max-w-md space-y-8">

                    {/* HEADER (Start) */}
                    <div className="flex justify-center">
                        <span className="px-3 py-1 bg-gray-800 text-xs rounded-full text-gray-400">INICIO</span>
                    </div>

                    {/* STEPS */}
                    {MOCK_STEPS.map((step) => (
                        <StepCard
                            key={step.id}
                            step={step}
                            isSelected={selectedStep?.id === step.id}
                            onClick={() => setSelectedStep(step)}
                        />
                    ))}

                    {/* FOOTER (End) */}
                    <div className="flex justify-center">
                        <span className="px-3 py-1 bg-gray-800 text-xs rounded-full text-gray-400">FIN DE RUTINA</span>
                    </div>

                </div>
            </div>

            {/* RIGHT: Config Panel (Contextual) */}
            {selectedStep && (
                <div className="w-96 border-l border-gray-800 bg-gray-900 shadow-2xl">
                    <StepConfigPanel
                        step={selectedStep}
                        onClose={() => setSelectedStep(null)}
                    />
                </div>
            )}
        </div>
    );
}
