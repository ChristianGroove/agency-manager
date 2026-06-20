'use client';

import * as React from 'react';
import { useEffect, useState, useMemo, memo, isValidElement, cloneElement } from 'react';
import { Check, ChevronsUpDown, MessageCircle, Instagram, Globe, Facebook, Loader2, Smartphone } from 'lucide-react';
import { cn } from '@/modules/infrastructure/utils/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { getChannels } from '@/modules/features/channels/actions';
import { Channel } from '@/modules/features/channels/types';
import { Badge } from '@/components/ui/badge';

interface ChannelOption {
    id: string;
    label: string;
    icon: React.ReactNode;
    subLabel?: string;
    type: 'whatsapp' | 'instagram' | 'messenger' | 'other';
    provider: string;
}

export const ChannelSelector = memo(function ChannelSelector({
    value,
    onChange,
    className,
    renderTrigger,
    multiple = false
}: {
    value?: string | string[] | null,
    onChange: (value: string | string[] | null) => void,
    className?: string,
    renderTrigger?: (selected: any) => React.ReactNode,
    multiple?: boolean
}) {
    const [open, setOpen] = useState(false);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        const fetchChannels = async () => {
            setLoading(true);
            try {
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

    // Memoized icon helper to prevent inline re-creation
    const getIcon = (provider: string) => {
        if (provider.includes('whatsapp') || provider.includes('evolution')) return <MessageCircle className="mr-2 h-4 w-4 text-[#25D366]" />;
        if (provider.includes('instagram')) return <Instagram className="mr-2 h-4 w-4 text-[#E4405F]" />;
        return <Globe className="mr-2 h-4 w-4 text-zinc-500" />;
    };

    // PERFORMANCE: Memoize options calculation to avoid heavy loops on every render
    const options = useMemo(() => {
        const results: ChannelOption[] = [];

        channels.forEach(c => {
            // 1. Standard Channels (Non-Meta Business)
            if (c.provider_key !== 'meta_business') {
                results.push({
                    id: c.id,
                    label: c.connection_name,
                    icon: getIcon(c.provider_key),
                    subLabel: c.metadata?.display_phone_number || c.metadata?.phone_number,
                    type: c.provider_key.includes('whatsapp') ? 'whatsapp' : (c.provider_key.includes('instagram') ? 'instagram' : 'other'),
                    provider: c.provider_key
                });
            }

            // 2. Meta Business Assets
            if (c.provider_key === 'meta_business' && c.metadata?.selected_assets) {
                c.metadata.selected_assets.forEach((asset: any) => {
                    const compositeId = `${c.id}:${asset.id}`;
                    let type: 'whatsapp' | 'instagram' | 'messenger' | 'other' = 'messenger';
                    let icon = <Facebook className="mr-2 h-4 w-4 text-[#1877F2]" />;
                    let subLabel = 'Facebook Messenger';

                    if (asset.type === 'whatsapp') {
                        type = 'whatsapp';
                        icon = <MessageCircle className="mr-2 h-4 w-4 text-[#25D366]" />;
                        subLabel = asset.display_phone_number || 'WhatsApp Business';
                    } else if (asset.type === 'instagram' || asset.has_ig === true) {
                        if (asset.type === 'instagram') {
                            type = 'instagram';
                            icon = <Instagram className="mr-2 h-4 w-4 text-[#E4405F]" />;
                            subLabel = 'Instagram Direct';
                        }
                    }

                    results.push({
                        id: compositeId,
                        label: asset.name,
                        icon,
                        subLabel,
                        type,
                        provider: 'meta'
                    });
                });
            }
        });
        return results;
    }, [channels]);

    // Memoize selected options
    const selectedOptions = useMemo(() => {
        if (multiple) {
            return options.filter(o => Array.isArray(value) && value.includes(o.id));
        }
        return options.find(o => o.id === value);
    }, [options, value, multiple]);

    // UI Groups for better UX
    const groups = useMemo(() => {
        return {
            whatsapp: options.filter(o => o.type === 'whatsapp'),
            messenger: options.filter(o => o.type === 'messenger'),
            instagram: options.filter(o => o.type === 'instagram'),
            other: options.filter(o => o.type === 'other')
        };
    }, [options]);

    const displaySelected = selectedOptions || (value && value !== 'all' ? { label: 'Canal Desconocido', icon: <Globe className="h-4 w-4" /> } : null);

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
                    renderTrigger(displaySelected)
                ) : (
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(
                            "w-full justify-between h-auto min-h-12 py-2 px-3 rounded-2xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 hover:border-primary/50 transition-all duration-200 shadow-sm",
                            className
                        )}
                        disabled={loading}
                    >
                        <div className="flex flex-col items-start gap-0.5 text-left">
                            {multiple ? (
                                Array.isArray(value) && value.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5 py-1">
                                        {(selectedOptions as ChannelOption[]).map((o) => (
                                            <Badge 
                                                key={o.id} 
                                                variant="secondary" 
                                                className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 h-6 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-none rounded-lg text-[10px] font-semibold"
                                            >
                                                {isValidElement(o.icon) ? cloneElement(o.icon as React.ReactElement<any>, { className: 'h-3 w-3' }) : o.icon}
                                                {o.label}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-zinc-400 text-sm font-medium">Seleccionar canales activos...</span>
                                )
                            ) : (
                                value === 'all' || !value ? (
                                    <span className="flex items-center text-zinc-600 dark:text-zinc-300 font-medium h-6">
                                        <Globe className="mr-2 h-4 w-4 text-primary/70" />
                                        Todos los canales
                                    </span>
                                ) : (displaySelected && !Array.isArray(displaySelected)) ? (
                                    <span className="flex items-center text-zinc-900 dark:text-white font-semibold h-6">
                                        {isValidElement(displaySelected.icon) ? cloneElement(displaySelected.icon as React.ReactElement<any>, { className: 'h-4 w-4 mr-2' }) : displaySelected.icon}
                                        {(displaySelected as ChannelOption).label}
                                    </span>
                                ) : (
                                    <span className="text-zinc-400 text-sm font-medium">Seleccionar canal...</span>
                                )
                            )}
                        </div>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin opacity-50" /> : <ChevronsUpDown className="h-4 w-4 opacity-30" />}
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-2 rounded-2xl shadow-xl border-zinc-200 dark:border-zinc-800 backdrop-blur-xl bg-white/95 dark:bg-zinc-950/95" align="start">
                <Command className="bg-transparent">
                    <CommandInput placeholder="Buscar canal o cuenta..." className="h-10 border-none focus:ring-0" />
                    <CommandList className="max-h-[300px] overflow-y-auto pr-1">
                        <CommandEmpty className="py-6 text-center text-sm text-zinc-500">No se encontraron canales.</CommandEmpty>
                        
                        {!multiple && (
                            <CommandGroup heading="Opciones Globales">
                                <CommandItem
                                    value="all"
                                    onSelect={() => {
                                        onChange(null);
                                        setOpen(false);
                                    }}
                                    className="rounded-xl flex items-center px-3 py-2.5 mb-1 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                >
                                    <div className="flex items-center flex-1">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 shrink-0">
                                            <Globe className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold">Todos los Canales</span>
                                            <span className="text-[10px] text-zinc-500">Escuchar mensajes de cualquier fuente</span>
                                        </div>
                                    </div>
                                    {(!value || value === 'all') && <Check className="h-4 w-4 text-primary shrink-0" />}
                                </CommandItem>
                            </CommandGroup>
                        )}

                        <CommandSeparator className="my-2" />

                        {/* Rendering Groups for better UX */}
                        {groups.whatsapp.length > 0 && (
                            <CommandGroup heading="WhatsApp Accounts">
                                {groups.whatsapp.map((option) => (
                                    <ChannelItem 
                                        key={option.id} 
                                        option={option} 
                                        isSelected={multiple ? (Array.isArray(value) && value.includes(option.id)) : value === option.id}
                                        onSelect={handleSelect}
                                        multiple={multiple}
                                    />
                                ))}
                            </CommandGroup>
                        )}

                        {groups.instagram.length > 0 && (
                            <CommandGroup heading="Instagram Business">
                                {groups.instagram.map((option) => (
                                    <ChannelItem 
                                        key={option.id} 
                                        option={option} 
                                        isSelected={multiple ? (Array.isArray(value) && value.includes(option.id)) : value === option.id}
                                        onSelect={handleSelect}
                                        multiple={multiple}
                                    />
                                ))}
                            </CommandGroup>
                        )}

                        {groups.messenger.length > 0 && (
                            <CommandGroup heading="Facebook Pages">
                                {groups.messenger.map((option) => (
                                    <ChannelItem 
                                        key={option.id} 
                                        option={option} 
                                        isSelected={multiple ? (Array.isArray(value) && value.includes(option.id)) : value === option.id}
                                        onSelect={handleSelect}
                                        multiple={multiple}
                                    />
                                ))}
                            </CommandGroup>
                        )}

                        {groups.other.length > 0 && (
                            <CommandGroup heading="Otros Canales">
                                {groups.other.map((option) => (
                                    <ChannelItem 
                                        key={option.id} 
                                        option={option} 
                                        isSelected={multiple ? (Array.isArray(value) && value.includes(option.id)) : value === option.id}
                                        onSelect={handleSelect}
                                        multiple={multiple}
                                    />
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
});

// Internal helper component to keep the main component clean
const ChannelItem = ({ option, isSelected, onSelect, multiple }: { option: ChannelOption, isSelected: boolean, onSelect: (id: string) => void, multiple: boolean }) => (
    <CommandItem
        value={option.label}
        onSelect={() => onSelect(option.id)}
        className="rounded-xl flex items-center px-3 py-2.5 mb-1 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
    >
        <div className="flex items-center flex-1 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mr-3 shrink-0">
                {isValidElement(option.icon) ? cloneElement(option.icon as React.ReactElement<any>, { className: 'h-4 w-4' }) : option.icon}
            </div>
            <div className="flex flex-col min-w-0">
                <span className={cn("text-sm truncate", isSelected ? "font-bold text-primary" : "font-medium")}>
                    {option.label}
                </span>
                {option.subLabel && <span className="text-[10px] text-zinc-500 truncate">{option.subLabel}</span>}
            </div>
        </div>
        
        {multiple ? (
            <div className={cn(
                "h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all duration-200",
                isSelected ? "bg-primary border-primary scale-110 shadow-sm" : "border-zinc-300 dark:border-zinc-700"
            )}>
                {isSelected && <Check className="h-3.5 w-3.5 text-white stroke-[3px]" />}
            </div>
        ) : (
            isSelected && <Check className="h-4 w-4 text-primary shrink-0" />
        )}
    </CommandItem>
);
