
import React from 'react';
import {
    BaseEdge,
    EdgeLabelRenderer,
    EdgeProps,
    getBezierPath,
    useReactFlow,
} from '@xyflow/react';
import { X } from 'lucide-react';

export default function DeletableEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
}: EdgeProps) {
    const { setEdges } = useReactFlow();
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const onEdgeClick = (evt: React.MouseEvent) => {
        evt.stopPropagation();
        setEdges((edges) => edges.filter((edge) => edge.id !== id));
    };

    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        fontSize: 12,
                        // everything inside EdgeLabelRenderer has no pointer events by default
                        // if you have an interactive element, set pointer-events: all
                        pointerEvents: 'all',
                    }}
                    className="nodrag nopan group"
                >
                    <button
                        className="w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-sm transition-transform hover:scale-110 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        onClick={onEdgeClick}
                        aria-label="Delete Edge"
                        title="Eliminar conexión"
                    >
                        <X size={12} strokeWidth={3} />
                    </button>
                    {/* Invisible hover area to make it easier to trigger */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 -z-10 group-hover:block" />
                </div>
            </EdgeLabelRenderer>
        </>
    );
}
