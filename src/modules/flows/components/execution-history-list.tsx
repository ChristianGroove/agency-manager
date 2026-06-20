import React from 'react';
import { ExecutionResult } from '../types';

interface ExecutionHistoryListProps {
    executions: ExecutionResult[];
}

/**
 * PHASE 6: USER TRUST
 * Displays a human-readable list of what Pixy has done.
 * Rules:
 * - No JSON
 * - No IDs
 * - No Status Codes
 * - Narrative focus ("I did X")
 */
export function ExecutionHistoryList({ executions }: ExecutionHistoryListProps) {
    if (executions.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <p>Aún no he ejecutado ninguna tarea para esta rutina.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                Actividad Reciente
            </h3>

            <div className="space-y-3">
                {executions.map((exec, idx) => (
                    <div key={idx} className="flex gap-3 items-start p-3 bg-gray-900 rounded-lg border border-gray-800">
                        {/* Status Indicator */}
                        <div className={`mt-1.5 w-2 h-2 rounded-full ${exec.success ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />

                        <div className="flex-1">
                            <p className="text-gray-200 text-sm leading-relaxed">
                                {exec.narrativeLog}
                            </p>
                            <span className="text-xs text-gray-500 mt-1 block">
                                Hace un momento
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
