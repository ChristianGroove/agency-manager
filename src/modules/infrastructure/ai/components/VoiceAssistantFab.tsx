
"use client"

import React, { useState } from 'react';

// MOCK COMPONENT FOR PHASE 5 UI
export function VoiceAssistantFab() {
    const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');

    const handleClick = () => {
        if (status === 'idle') {
            setStatus('listening');
            // Mock interaction
            setTimeout(() => setStatus('processing'), 2000);
            setTimeout(() => setStatus('speaking'), 3000);
            setTimeout(() => setStatus('idle'), 5000);
        } else {
            setStatus('idle');
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <button
                onClick={handleClick}
                className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 transform hover:scale-105
            ${status === 'idle' ? 'bg-primary text-white' : ''}
            ${status === 'listening' ? 'bg-red-500 animate-pulse' : ''}
            ${status === 'processing' ? 'bg-yellow-500 animate-spin' : ''}
            ${status === 'speaking' ? 'bg-green-500 animate-bounce' : ''}
        `}
            >
                {status === 'idle' && <span>🎙️</span>}
                {status === 'listening' && <span>👂</span>}
                {status === 'processing' && <span>🧠</span>}
                {status === 'speaking' && <span>🗣️</span>}
            </button>

            {/* Mock Spectrum */}
            {status !== 'idle' && (
                <div className="absolute bottom-16 right-0 bg-white p-2 rounded shadow text-xs">
                    Status: {status.toUpperCase()}
                </div>
            )}
        </div>
    );
}
