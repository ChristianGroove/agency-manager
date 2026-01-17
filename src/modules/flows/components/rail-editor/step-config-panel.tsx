import React from 'react';
import { FlowStep } from '../../types';
import { X, Save } from 'lucide-react';

interface StepConfigPanelProps {
    step: FlowStep;
    onClose: () => void;
}

export function StepConfigPanel({ step, onClose }: StepConfigPanelProps) {
    return (
        <div className="h-full flex flex-col">
            {/* HEADER */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
                <h3 className="font-semibold text-lg text-white">Configurar Paso</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* BODY (Form) */}
            <div className="flex-1 p-6 overflow-y-auto">

                <div className="mb-6">
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-2">Nombre del paso</label>
                    <input
                        type="text"
                        defaultValue={step.label}
                        className="w-full bg-gray-800 border-none rounded p-2 text-white focus:ring-1 focus:ring-blue-500"
                    />
                </div>

                <div className="space-y-4">
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <p className="text-xs text-blue-300">
                            ℹ️ En esta versión MVP, los detalles de configuración avanzada se gestionan en el Wizard inicial.
                        </p>
                    </div>

                    <h4 className="text-sm font-medium text-gray-300 border-b border-gray-800 pb-2">
                        Parámetros
                    </h4>

                    {/* MOCK DYNAMIC FIELDS */}
                    {Object.entries(step.config).map(([key, value]) => (
                        <div key={key}>
                            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">{key}</label>
                            <input
                                type="text"
                                defaultValue={String(value)}
                                className="w-full bg-gray-800 border-none rounded p-2 text-white font-mono text-sm"
                            />
                        </div>
                    ))}
                </div>

            </div>

            {/* FOOTER */}
            <div className="p-6 border-t border-gray-800 bg-gray-900/50">
                <button className="w-full flex items-center justify-center gap-2 bg-white text-black font-medium py-2 rounded hover:bg-gray-200 transition-colors">
                    <Save className="w-4 h-4" />
                    Guardar Cambios
                </button>
            </div>
        </div>
    );
}
