
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Bell, User } from 'lucide-react';

const NotificationNode = ({ data, selected }: NodeProps) => {
    return (
        <div className={`shadow-lg rounded-xl border-2 bg-white dark:bg-slate-900 min-w-[280px] transition-all duration-200 ${selected ? 'border-sky-500 ring-4 ring-sky-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-sky-400'}`}>
            <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-slate-400" />

            <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center shadow-sm">
                        <Bell className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                            {data.label as string || 'Notification'}
                        </h3>
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-sky-600 dark:text-sky-400 mt-0.5">
                            Sistema
                        </p>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5 text-xs text-slate-600 dark:text-slate-300 space-y-1.5 border border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 opacity-70" />
                        <span className="font-medium truncate">
                            To: {data.userId ? 'Specific User' : 'Admin'}
                        </span>
                    </div>
                    <div className="pl-5.5 text-slate-500 italic truncate">
                        "{data.title as string || 'No Title'}"
                    </div>
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-slate-400" />
        </div>
    );
};

export default memo(NotificationNode);
