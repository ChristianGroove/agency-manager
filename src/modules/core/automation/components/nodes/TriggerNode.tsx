import React, { memo, useEffect, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Zap, MessageCircle, Globe } from 'lucide-react';
import { getChannel, getChannelDetails } from '@/modules/core/channels/actions';

interface NodeData extends Record<string, unknown> {
    label?: string;
    channel?: string;
}

const TriggerNode = ({ data, selected }: { data: NodeData, selected: boolean }) => {
    const [channelName, setChannelName] = useState<string | null>(null);

    useEffect(() => {
        // Handle Multi-channel display
        if (data.channels && Array.isArray(data.channels) && data.channels.length > 0) {
            if (data.channels.length > 1) {
                setChannelName(`${data.channels.length} canales`);
                return;
            }
            // If single valid channel in array, fall through to single check
            const singleId = data.channels[0];
            getChannelDetails(singleId).then(info => {
                setChannelName(info ? info.name : 'Canal Desconocido');
            });
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
        <div className={`px-4 py-3 shadow-lg rounded-full bg-slate-900 border-2 transition-all min-w-[200px] ${selected ? 'border-green-400 shadow-green-500/20' : 'border-slate-800'}`}>

            <div className="flex items-center gap-3 justify-center">
                <div className={`p-1.5 rounded-full bg-green-500 text-white shrink-0`}>
                    <Zap size={16} fill="currentColor" />
                </div>
                <div>
                    <div className="text-sm font-bold text-white">
                        {data.label || 'Inicio'}
                    </div>
                    {channelName && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                            <MessageCircle size={10} />
                            {channelName}
                        </div>
                    )}
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-green-500 border-2 border-slate-900" />
        </div>
    );
};

export default memo(TriggerNode);
