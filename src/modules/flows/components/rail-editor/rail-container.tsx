import React, { useState, useEffect } from 'react';
import { StepCard } from './step-card';
import { StepConfigPanel } from './step-config-panel';
import { ExecutionHistoryList } from '../execution-history-list';
import { FlowStep, ExecutionResult } from '../../types';
import { FlowEngine } from '../../services/flow-engine';

interface RailContainerProps {
    steps: FlowStep[];
    routineId?: string; // Optional for MVP preview, required for real view
}

export function RailContainer({ steps, routineId }: RailContainerProps) {
    const [selectedStep, setSelectedStep] = useState<FlowStep | null>(null);
    const [executions, setExecutions] = useState<ExecutionResult[]>([]);

    // Fetch History on Mount (Phase 6)
    useEffect(() => {
        if (routineId) {
            FlowEngine.getRecentExecutions(routineId).then(setExecutions);
        }
    }, [routineId]);

    // Phase 7: Life Controls
    const [status, setStatus] = useState<'active' | 'paused' | 'archived'>('active');

    const handleToggleStatus = (newStatus: 'active' | 'paused') => {
        setStatus(newStatus);
        if (routineId) FlowEngine.updateStatus(routineId, newStatus);
    };

    return (
        <div className="flex h-screen bg-gray-950 text-white overflow-hidden">

            {/* LEFT: The Rail (Timeline) */}
            <div className="flex-1 overflow-y-auto flex flex-col items-center py-12 relative scrollbar-hide">

                {/* The Vertical Line */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-gray-800 left-1/2 transform -translate-x-1/2 z-0" />

                <div className="z-10 w-full max-w-md space-y-8 pb-32">

                    {/* HEADER (Start) */}
                    <div className="flex justify-center items-center gap-4">
                        <span className={`px-3 py-1 text-xs rounded-full font-bold transition-all ${status === 'active'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/50 shadow-[0_0_12px_rgba(34,197,94,0.4)]'
                                : 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50'
                            }`}>
                            {status === 'active' ? '● TRABAJANDO' : '⏸ PAUSADO'}
                        </span>

                        {/* CONTROLS */}
                        {status === 'active' ? (
                            <button
                                onClick={() => handleToggleStatus('paused')}
                                className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white"
                                title="Pausar Rutina"
                            >
                                ⏸
                            </button>
                        ) : (
                            <button
                                onClick={() => handleToggleStatus('active')}
                                className="p-1 hover:bg-gray-800 rounded text-green-400 hover:text-green-300"
                                title="Reanudar Trabajo"
                            >
                                ▶
                            </button>
                        )}
                    </div>

                    {/* STEPS */}
                    {steps.map((step) => (
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

                    {/* PHASE 6: EXECUTION HISTORY (Trust Layer) */}
                    {executions.length > 0 && (
                        <div className="mt-12 pt-12 border-t border-gray-900">
                            <ExecutionHistoryList executions={executions} />
                        </div>
                    )}

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
