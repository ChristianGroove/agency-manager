
"use client"

import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
    status: 'idle' | 'listening' | 'thinking' | 'speaking';
}

export function Visualizer({ status }: VisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        let time = 0;

        const draw = () => {
            time += 0.05;
            const width = canvas.width;
            const height = canvas.height;
            const centerY = height / 2;

            ctx.clearRect(0, 0, width, height);
            ctx.lineWidth = 2;

            // Color based on status
            if (status === 'listening') ctx.strokeStyle = '#ef4444'; // Red
            else if (status === 'speaking') ctx.strokeStyle = '#22c55e'; // Green
            else if (status === 'thinking') ctx.strokeStyle = '#eab308'; // Yellow
            else ctx.strokeStyle = '#94a3b8'; // Idle Gray

            ctx.beginPath();

            // Draw Wave
            for (let x = 0; x < width; x++) {
                let amplitude = 0;

                if (status === 'listening') amplitude = 20 * Math.sin(time * 2);
                else if (status === 'speaking') amplitude = 30 * Math.sin(time * 3);
                else if (status === 'thinking') amplitude = 5;
                else amplitude = 1;

                // Combine sine waves for organic look
                const y = centerY +
                    Math.sin(x * 0.05 + time) * amplitude * Math.sin(time) * 0.5 +
                    Math.sin(x * 0.02 - time) * amplitude * 0.5;

                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }

            ctx.stroke();
            animationId = requestAnimationFrame(draw);
        };

        draw();

        return () => cancelAnimationFrame(animationId);
    }, [status]);

    return (
        <canvas
            ref={canvasRef}
            width={300}
            height={60}
            className="w-full h-[60px]"
        />
    );
}
