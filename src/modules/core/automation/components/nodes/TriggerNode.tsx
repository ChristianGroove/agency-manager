import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Zap } from 'lucide-react';

interface NodeData extends Record<string, unknown> {
    label?: string;
}

const TriggerNode = ({ data, selected }: { data: NodeData, selected: boolean }) => {
    return (
        <div className={`px-4 py-3 shadow-lg rounded-full bg-slate-900 border-2 transition-all min-w-[200px] ${selected ? 'border-green-400 shadow-green-500/20' : 'border-slate-800'}`}>

            <div className="flex items-center gap-3 justify-center">
                <div className={`p-1.5 rounded-full bg-green-500 text-white shrink-0`}>
                    <Zap size={16} fill="currentColor" />
                </div>
                <div>
                    <div className="text-sm font-bold text-white">
                        {data.label || 'Inicio'}
                    </div>
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-green-500 border-2 border-slate-900" />
        </div>
    );
};

export default memo(TriggerNode);
