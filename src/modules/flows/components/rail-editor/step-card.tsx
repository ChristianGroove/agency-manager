import React from 'react';
import { FlowStep, StepType } from '../../types';
import {
    Clock,
    Zap,
    Send,
    GitBranch,
    CheckCircle2
} from 'lucide-react';

interface StepCardProps {
    step: FlowStep;
    isSelected: boolean;
    onClick: () => void;
}

// Visual mapping for Step Types
const TYPE_CONFIG: Record<StepType, { icon: any, color: string, label: string }> = {
    trigger: { icon: Zap, color: 'text-yellow-400', label: 'MOMENTO' },
    wait: { icon: Clock, color: 'text-blue-400', label: 'ESPERAR' },
    action: { icon: Send, color: 'text-purple-400', label: 'TAREA' },
    rule: { icon: GitBranch, color: 'text-orange-400', label: 'REGLA' }
};

export function StepCard({ step, isSelected, onClick }: StepCardProps) {
    const config = TYPE_CONFIG[step.type];
    const Icon = config.icon;

    return (
        <div
            onClick={onClick}
            className={`
        relative group cursor-pointer transition-all duration-200
        bg-gray-900 border rounded-xl p-4
        hover:shadow-lg hover:-translate-y-0.5
        ${isSelected
                    ? 'border-blue-500 ring-1 ring-blue-500/50 shadow-blue-900/20'
                    : 'border-gray-800 hover:border-gray-600'
                }
      `}
        >
            {/* Connector Dot (Visual anchor to the rail) */}
            <div className="absolute top-1/2 -left-12 w-4 h-4 bg-gray-800 rounded-full border-2 border-gray-600 group-hover:border-blue-400 transition-colors transform -translate-y-1/2 z-20" />
            {/* Connector Arm */}
            <div className="absolute top-1/2 -left-12 w-12 h-0.5 bg-gray-800 group-hover:bg-gray-700 transform -translate-y-1/2 z-10" />

            <div className="flex items-start gap-4">
                {/* Icon Box */}
                <div className={`p-2 rounded-lg bg-gray-950 ${config.color}`}>
                    <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div>
                    <span className={`text-[10px] font-bold tracking-wider ${config.color} opacity-80 uppercase`}>
                        {config.label}
                    </span>
                    <h4 className="text-sm font-medium text-white lg:text-base">
                        {step.label}
                    </h4>
                    {step.description && (
                        <p className="text-xs text-gray-400 mt-1">{step.description}</p>
                    )}
                </div>

                {/* Edit Hint (On Hover) */}
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300">
                        Editar
                    </div>
                </div>
            </div>
        </div>
    );
}
