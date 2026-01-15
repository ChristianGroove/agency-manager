'use client';

import React, { useEffect, useState } from 'react';
import { Check, ChevronsUpDown, MessageCircle, Instagram, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { getChannels } from '@/modules/core/channels/actions';
import { Channel } from '@/modules/core/channels/types';

interface ChannelSelectorProps {
    value?: string | null;
    onChange: (value: string | null) => void;
    className?: string;
    renderTrigger?: (selectedChannel: Channel | undefined) => React.ReactNode;
}

export function ChannelSelector({ value, onChange, className, renderTrigger, multiple = false }: { value?: string | string[] | null, onChange: (value: string | string[] | null) => void, className?: string, renderTrigger?: (selected: any) => React.ReactNode, multiple?: boolean }) {
    const [open, setOpen] = useState(false);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        const fetchChannels = async () => {
            setLoading(true);
            try {
                // Fetch channels via Server Action
                const data = await getChannels();
                if (mounted) setChannels(data);
            } catch (error) {
                console.error("Failed to fetch channels", error);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        fetchChannels();
        return () => { mounted = false; };
    }, []);

    const selectedChannels = multiple
        ? channels.filter((c) => Array.isArray(value) && value.includes(c.id))
        : channels.find((c) => c.id === value);

    const getIcon = (provider: string) => {
        if (provider.includes('whatsapp') || provider.includes('evolution')) return <MessageCircle className="mr-2 h-4 w-4 text-[#25D366]" />;
        if (provider.includes('instagram')) return <Instagram className="mr-2 h-4 w-4 text-[#E4405F]" />;
        return <Globe className="mr-2 h-4 w-4 text-slate-500" />;
    };

    const handleSelect = (id: string) => {
        if (multiple) {
            const current = Array.isArray(value) ? value : [];
            const newValue = current.includes(id)
                ? current.filter(i => i !== id)
                : [...current, id];
            onChange(newValue);
        } else {
            onChange(id);
            setOpen(false);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {renderTrigger ? (
                    renderTrigger(selectedChannels)
                ) : (
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn("w-full justify-between h-auto min-h-11 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800", className)}
                    >
                        {multiple ? (
                            Array.isArray(value) && value.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                    {(selectedChannels as Channel[]).map(c => (
                                        <div key={c.id} className="flex items-center bg-white dark:bg-slate-800 border px-2 py-0.5 rounded-full text-xs">
                                            {getIcon(c.provider_key)}
                                            {c.connection_name}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-muted-foreground">Seleccionar canales...</span>
                            )
                        ) : (
                            value === 'all' || !value ? (
                                <span className="flex items-center text-slate-600 dark:text-slate-400">
                                    <Globe className="mr-2 h-4 w-4" />
                                    Todos los canales
                                </span>
                            ) : (selectedChannels as Channel) ? (
                                <span className="flex items-center">
                                    {getIcon((selectedChannels as Channel).provider_key)}
                                    {(selectedChannels as Channel).connection_name}
                                </span>
                            ) : (
                                <span className="text-muted-foreground">Seleccionar canal predeterminado...</span>
                            )
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 rounded-xl" align="start">
                <Command>
                    <CommandInput placeholder="Buscar canal..." />
                    <CommandList>
                        <CommandEmpty>No se encontraron canales.</CommandEmpty>
                        {!multiple && (
                            <CommandGroup heading="Opciones Globales">
                                <CommandItem
                                    value="all"
                                    onSelect={() => {
                                        onChange(null);
                                        setOpen(false);
                                    }}
                                    className="cursor-pointer"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            !value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <Globe className="mr-2 h-4 w-4 text-slate-500" />
                                    Todos los canales (Predeterminado)
                                </CommandItem>
                            </CommandGroup>
                        )}
                        <CommandGroup heading="Mis Canales">
                            {channels.map((channel) => (
                                <CommandItem
                                    key={channel.id}
                                    value={channel.connection_name}
                                    onSelect={() => handleSelect(channel.id)}
                                    className="cursor-pointer"
                                >
                                    <div className={cn(
                                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                        multiple
                                            ? ((Array.isArray(value) && value.includes(channel.id)) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")
                                            : "border-none"
                                    )}>
                                        {multiple ? <Check className={cn("h-4 w-4")} /> : <Check className={cn("h-4 w-4", value === channel.id ? "opacity-100" : "opacity-0")} />}
                                    </div>

                                    {getIcon(channel.provider_key)}
                                    <div className="flex flex-col">
                                        <span>{channel.connection_name}</span>
                                        <span className="text-[10px] text-muted-foreground">{channel.metadata?.phone_number || channel.provider_key}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
