
"use client"

import React from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface ConfirmationCardProps {
    action: {
        type: string;
        payload: any;
    };
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmationCard({ action, onConfirm, onCancel }: ConfirmationCardProps) {
    // Pretty print payload
    const payloadItems = Object.entries(action.payload).map(([key, value]) => (
        <div key={key} className="flex justify-between text-xs py-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
            <span className="text-gray-500 font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
            <span className="text-gray-800 dark:text-gray-200 font- mono truncate max-w-[150px]">{String(value)}</span>
        </div>
    ));

    return (
        <div className="mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                        Confirm Action
                    </span>
                </div>
            </div>

            {/* Body */}
            <div className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    Pixy suggests running <strong>{action.type}</strong>:
                </p>
                <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 mb-4">
                    {payloadItems.length > 0 ? payloadItems : <span className="text-xs text-gray-400 italic">No parameters</span>}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={onCancel}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    >
                        <XCircle className="w-4 h-4" />
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all hover:shadow-md"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                    </button>
                </div>
            </div>
        </div>
    );
}
