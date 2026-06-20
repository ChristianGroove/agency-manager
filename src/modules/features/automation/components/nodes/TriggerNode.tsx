import React, { memo, useEffect, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Zap, MessageCircle } from 'lucide-react';
import { getChannel, getChannelDetails } from '@/modules/features/channels/actions';
import { cn } from '@/modules/infrastructure/utils/utils';

interface NodeData extends Record<string, unknown> {
    label?: string;
    channel?: string;
    channels?: string[];
}

const TriggerNode = ({ data, selected }: { data: NodeData, selected: boolean }) => {
    const [channelName, setChannelName] = useState<string | null>(null);

    useEffect(() => {
        // Handle Multi-channel display
        if (data.channels && Array.isArray(data.channels) && data.channels.length > 0) {
            Promise.all(data.channels.map(id => getChannelDetails(id))).then(results => {
                const names = results.filter(r => !!r).map(r => r?.name || 'Unknown');

                if (names.length === 1) {
                    setChannelName(names[0]);
                } else if (names.length <= 3) {
                    setChannelName(names.join(', '));
                } else {
                    setChannelName(`${names[0]} +${names.length - 1}`);
                }
            })
            return;
        }

        // Legacy Single Channel
        if (data.channel && typeof data.channel === 'string') {
            if (data.channel === 'all') {
                setChannelName('Todos los canales');
            } else if (data.channel === 'whatsapp') {
                setChannelName('WhatsApp (Default)');
            } else {
                getChannel(data.channel).then(c => {
                    if (c) setChannelName(c.connection_name);
                }).catch(() => setChannelName('Canal Desconocido'));
            }
        } else {
            setChannelName(null);
        }
    }, [data.channel, JSON.stringify(data.channels)]);

    return (
        <div className={cn(
            "min-w-[200px] max-w-[280px] rounded-xl border-2 shadow-lg transition-all bg-white dark:bg-zinc-900",
            selected ? "border-green-500 shadow-xl scale-105 ring-1 ring-green-500" : "border-zinc-200 dark:border-zinc-800"
        )}>
            {/* Premium Header */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                <div className="p-1 bg-white/20 rounded">
                    <Zap className="h-3.5 w-3.5 fill-white text-white" />
                </div>
                <span className="text-xs font-semibold tracking-wide">
                    {(data.label || 'INICIO').toUpperCase()}
                </span>
            </div>

            {/* Content */}
            <div className="p-3">
                <div className="text-xs text-zinc-600 dark:text-zinc-300 font-medium bg-zinc-50 dark:bg-zinc-950/50 p-2 rounded border border-zinc-100 dark:border-zinc-800/50 flex items-center gap-2">
                    <MessageCircle size={14} className="text-green-500" />
                    <span className="truncate">
                        {channelName || 'Cualquier Mensaje Entrante'}
                    </span>
                </div>
            </div>

            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-3 !h-3 !bg-green-500 !border-2 !border-white transition-all hover:scale-125"
            />
        </div>
    );
};

export default memo(TriggerNode);
