import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Split } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ABTestNodeProps extends NodeProps {
    data: {
        label?: string;
        paths?: Array<{ id: string; label: string; percentage: number }>;
    }
}

const ABTestNode = ({ data, selected }: ABTestNodeProps) => {
    const paths = data.paths || [
        { id: 'a', label: 'Path A', percentage: 50 },
        { id: 'b', label: 'Path B', percentage: 50 }
    ];

    return (
        <Card className={`w-[280px] shadow-md border-2 transition-all ${selected ? 'border-orange-500 ring-4 ring-orange-500/20' : 'border-slate-200 dark:border-slate-700'}`}>
            <Handle type="target" position={Position.Top} className="!bg-slate-500 !w-3 !h-3" />

            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 p-3 border-b border-orange-100 dark:border-orange-900/50">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-orange-700 dark:text-orange-300">
                    <div className="p-1.5 bg-orange-100 dark:bg-orange-900 rounded-md">
                        <Split size={14} className="text-orange-600 dark:text-orange-400" />
                    </div>
                    {data.label || 'A/B Split'}
                </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
                <div className="flex flex-col">
                    {paths.map((path, index) => (
                        <div
                            key={path.id}
                            className={`relative flex items-center justify-between p-3 ${index !== paths.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}
                        >
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400">
                                    {path.percentage}%
                                </Badge>
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                    {path.label}
                                </span>
                            </div>

                            {/* Dynamic Source Handle for each path */}
                            <Handle
                                type="source"
                                position={Position.Right}
                                id={path.id} // Important: This ID must match the path ID logic in engine
                                className="!bg-orange-500 !w-3 !h-3 !right-[-8px]"
                                style={{ top: '50%', transform: 'translateY(-50%)' }}
                            />
                        </div>
                    ))}
                </div>
            </CardContent>

            {/* Helper text */}
            <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 text-[10px] text-slate-400 text-center border-t">
                Determinístico por Lead ID
            </div>
        </Card>
    );
};

export default memo(ABTestNode);
