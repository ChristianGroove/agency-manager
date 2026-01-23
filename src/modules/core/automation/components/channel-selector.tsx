'use client';

import React, { useEffect, useState } from 'react';
import { Check, ChevronsUpDown, MessageCircle, Instagram, Globe, Facebook } from 'lucide-react';
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

    // Helper: Flatten channels into selectable options (Parent + Sub-assets)
    const getOptions = () => {
        const options: Array<{ id: string, label: string, icon: React.ReactNode, subLabel?: string }> = [];

        channels.forEach(c => {
            // 1. Add Parent/Standard Channel
            if (c.provider_key !== 'meta_business') {
                options.push({
                    id: c.id,
                    label: c.connection_name,
                    icon: getIcon(c.provider_key),
                    subLabel: c.metadata?.display_phone_number || c.metadata?.phone_number
                });
            }

            // 2. Add Meta Assets (Pages/Instagram/WhatsApp)
            if (c.provider_key === 'meta_business' && c.metadata?.selected_assets) {
                c.metadata.selected_assets.forEach((asset: any) => {
                    const assetId = asset.id;
                    const compositeId = `${c.id}:${assetId}`;
                    let label = asset.name;
                    let icon = <Facebook className="mr-2 h-4 w-4 text-[#1877F2]" />; // Default to FB
                    let subLabel = 'Facebook Messenger';

                    // Determine type based on 'type' field or fallback
                    if (asset.type === 'whatsapp') {
                        label = `WhatsApp: ${asset.name}`;
                        icon = <MessageCircle className="mr-2 h-4 w-4 text-[#25D366]" />;
                        subLabel = asset.display_phone_number || 'WhatsApp Business';
                    } else if (asset.type === 'instagram' || asset.has_ig === true) {
                        // Naming convention: If it's a Page with IG, we might list it as Instagram if the user intended that.
                        // However, based on the audit, 'page' type usually means Messenger.
                        // Ideally we'd have a separate entry for IG if the JSON allowed.
                        // For now, if type is explicit instagram OR (fallback) it has IG and we want to allow selecting it as IG?
                        // Let's stick to the 'type' field for strictness, but if users see 'page' and want IG, that's a data mapping issue.
                        // The user said "Everyone looks like Facebook" - solving the 'whatsapp' type is the big win here.

                        if (asset.type === 'instagram') {
                            label = `Instagram: ${asset.name}`;
                            icon = <Instagram className="mr-2 h-4 w-4 text-[#E4405F]" />;
                            subLabel = 'Instagram Direct';
                        } else {
                            // It is a Page (Messenger)
                            label = `Messenger: ${asset.name}`;
                            // icon remains FB
                        }
                    } else {
                        // Default Page
                        label = `Messenger: ${asset.name}`;
                    }

                    options.push({
                        id: compositeId,
                        label: label,
                        icon: icon,
                        subLabel: subLabel
                    });
                });
            }

            // Fallback for Meta if no assets selected but connected
            if (c.provider_key === 'meta_business' && (!c.metadata?.selected_assets || c.metadata.selected_assets.length === 0)) {
                options.push({
                    id: c.id,
                    label: c.connection_name,
                    icon: <Globe className="mr-2 h-4 w-4 text-blue-500" />,
                    subLabel: 'Meta Business (No assets)'
                });
            }
        });
        return options;
    };

    const options = getOptions();

    // Find selected option
    const selectedOption = multiple
        ? options.filter(o => Array.isArray(value) && value.includes(o.id))
        : options.find(o => o.id === value);

    // Fallback display if ID matches but specific asset logic is fuzzy
    const displaySelected = selectedOption || (value && value !== 'all' ? { label: 'Canal Desconocido', icon: <Globe className="h-4 w-4" /> } : null);

    function getIcon(provider: string) {
        if (provider.includes('whatsapp') || provider.includes('evolution')) return <MessageCircle className="mr-2 h-4 w-4 text-[#25D366]" />;
        if (provider.includes('instagram')) return <Instagram className="mr-2 h-4 w-4 text-[#E4405F]" />;
        return <Globe className="mr-2 h-4 w-4 text-slate-500" />;
    }

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
                        className={cn("w-full justify-between h-auto min-h-11 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800", className)}
                    >
                        {multiple ? (
                            Array.isArray(value) && value.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                    {(selectedOption as any[]).map((o: any) => (
                                        <div key={o.id} className="flex items-center bg-white dark:bg-slate-800 border px-2 py-0.5 rounded-full text-xs">
                                            {o.icon}
                                            {o.label}
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
                            ) : displaySelected && !Array.isArray(displaySelected) ? (
                                <span className="flex items-center">
                                    {displaySelected.icon}
                                    {displaySelected.label}
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
                            {options.map((option, idx) => (
                                <CommandItem
                                    key={`${option.id}-${idx}`} // Use index fallback for duplicate IDs (Meta assets)
                                    value={option.label}
                                    onSelect={() => handleSelect(option.id)}
                                    className="cursor-pointer"
                                >
                                    <div className={cn(
                                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                        multiple
                                            ? ((Array.isArray(value) && value.includes(option.id)) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")
                                            : "border-none"
                                    )}>
                                        {multiple ? <Check className={cn("h-4 w-4")} /> : <Check className={cn("h-4 w-4", value === option.id ? "opacity-100" : "opacity-0")} />}
                                    </div>

                                    {option.icon}
                                    <div className="flex flex-col">
                                        <span>{option.label}</span>
                                        {option.subLabel && <span className="text-[10px] text-muted-foreground">{option.subLabel}</span>}
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
