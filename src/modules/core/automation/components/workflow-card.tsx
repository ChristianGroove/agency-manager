import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    Play,
    Copy,
    Activity,
    MessageCircle,
    Globe,
    Facebook,
    Instagram,
    MoreVertical,
    Trash2
} from 'lucide-react';
import { getChannelDetails } from '@/modules/core/channels/actions';
import { ChannelSelector } from './channel-selector';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

interface WorkflowCardProps {
    workflow: any;
    onToggle: (id: string, active: boolean) => void;
    onDelete: (id: string) => void;
    onDuplicate: (id: string) => void;
    onEdit: (id: string) => void;
    isTemplate?: boolean;
    onUseTemplate?: (template: any) => void;
    onChannelChange?: (channelId: string | null) => void;
}

export function WorkflowCard({
    workflow,
    onToggle,
    onDelete,
    onDuplicate,
    onEdit,
    isTemplate,
    onUseTemplate,
    onChannelChange
}: WorkflowCardProps) {
    if (!workflow) return null;

    // Determine channel ID (support legacy structure)
    // Priority: trigger_config.channels (Array) > trigger_config.channel (Legacy) > workflow.channel_id (DB)
    const config = workflow.trigger_config || {};
    const effectiveValue = config.channels || config.channel || workflow.channel_id || 'all';

    // Helper for display
    const isMulti = Array.isArray(effectiveValue) && effectiveValue.length > 1;

    const [channelInfo, setChannelInfo] = useState<{ name: string, iconType: string } | null>(null);

    useEffect(() => {
        let isMounted = true;
        // If single value and not 'all', fetch details for display
        const singleId = Array.isArray(effectiveValue) ? effectiveValue[0] : effectiveValue;

        if (singleId && typeof singleId === 'string' && singleId !== 'all') {
            getChannelDetails(singleId).then(info => {
                if (isMounted && info) {
                    setChannelInfo({ name: info.name, iconType: info.iconType });
                }
            }).catch(() => {
                if (isMounted) setChannelInfo(null);
            });
        } else {
            setChannelInfo(null);
        }
        return () => { isMounted = false; };
    }, [JSON.stringify(effectiveValue)]);

    const getIconByType = (type: string) => {
        if (type === 'whatsapp') return <MessageCircle className="h-3 w-3 mr-1 text-green-500" />;
        if (type === 'instagram') return <Instagram className="h-3 w-3 mr-1 text-[#E4405F]" />;
        if (type === 'messenger') return <Facebook className="h-3 w-3 mr-1 text-[#1877F2]" />;
        return <Globe className="h-3 w-3 mr-1 text-blue-500" />;
    };

    return (
        <div className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200">
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex gap-3">
                    <div className={`mt-1 p-2 rounded-lg ${isTemplate ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : (workflow.is_active ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400')}`}>
                        {isTemplate ? <Copy size={18} /> : <Activity size={18} />}
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 leading-tight mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {workflow.name}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 max-w-[200px]">
                            {workflow.description || 'Sin descripción'}
                        </p>
                    </div>
                </div>

                {!isTemplate && (
                    <div onClick={(e) => e.stopPropagation()} className="relative z-10">
                        <Switch
                            checked={workflow.is_active}
                            onCheckedChange={(checked) => onToggle(workflow.id, checked)}
                            className="data-[state=checked]:bg-green-500"
                        />
                    </div>
                )}
            </div>

            {/* Stats / Info */}
            {!isTemplate ? (
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                        <Play size={12} />
                        <span>{workflow.runs_count || 0} ejecuciones</span>
                    </div>
                </div>
            ) : (
                <div className="h-4 mb-4"></div>
            )}


            <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-800/50 mt-2">
                <div className="flex gap-2">
                    {/* Channel Badge with Selector */}
                    {!isTemplate && onChannelChange && (
                        <div onClick={(e) => e.stopPropagation()} className="relative z-10">
                            <ChannelSelector
                                value={effectiveValue}
                                multiple={true} // Enable Multi-select
                                onChange={(val) => onChannelChange(val as any)}
                                renderTrigger={(selectedOption: any) => (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 px-1.5 -ml-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-[10px] font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400"
                                    >
                                        {isMulti ? (
                                            <>
                                                <div className="flex -space-x-1 mr-1">
                                                    <div className="w-3 h-3 rounded-full bg-slate-200 border border-white dark:border-slate-900"></div>
                                                    <div className="w-3 h-3 rounded-full bg-slate-300 border border-white dark:border-slate-900"></div>
                                                </div>
                                                Varios canales
                                            </>
                                        ) : (
                                            selectedOption ? (
                                                <>
                                                    {selectedOption.icon ? selectedOption.icon : getIconByType('other')}
                                                    {selectedOption.label}
                                                </>
                                            ) : (
                                                channelInfo ? (
                                                    <>
                                                        {getIconByType(channelInfo.iconType)}
                                                        {channelInfo.name}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Globe className="h-3 w-3 mr-1" />
                                                        Todos los canales
                                                    </>
                                                )
                                            )
                                        )}
                                    </Button>
                                )}
                            />
                        </div>
                    )}
                </div>

                {/* Actions Menu */}
                <div className="flex items-center gap-1 relative z-10" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" onClick={() => onEdit(workflow.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 h-8 px-2">
                        Editar
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onDuplicate(workflow.id)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => {
                                    if (confirm('¿Seguro que deseas eliminar este workflow?')) onDelete(workflow.id);
                                }}
                                className="text-red-600 focus:text-red-600"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>


            {/* Click to Edit Area (Hidden Overlay) */}
            <div className="absolute inset-x-0 top-0 bottom-16 cursor-pointer" onClick={() => onEdit(workflow.id)}></div>
        </div>
    );
}
