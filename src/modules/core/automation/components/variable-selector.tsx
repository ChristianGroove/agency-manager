
import React from 'react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Braces } from 'lucide-react';

interface VariableSelectorProps {
    onSelect: (variable: string) => void;
    className?: string;
    children?: React.ReactNode;
}

const VARIABLES = [
    { label: 'Nombre del Contacto', value: '{{contact.name}}' },
    { label: 'Teléfono del Contacto', value: '{{contact.phone}}' },
    { label: 'Email del Contacto', value: '{{contact.email}}' },
    { label: 'ID del Contacto', value: '{{contact.id}}' },
    { label: 'Nombre del Lead (CRM)', value: '{{lead.name}}' },
    { label: 'Email del Lead (CRM)', value: '{{lead.email}}' },
    { label: 'Teléfono del Lead (CRM)', value: '{{lead.phone}}' },
    { label: 'Mensaje: Pantalla / Remitente', value: '{{message.sender}}' },
    { label: 'Mensaje: Contenido', value: '{{message.content}}' },
    { label: 'Nombre de la Empresa / Org', value: '{{organization.name}}' },
    { label: 'Meta Ad: ID de Anuncio', value: '{{lead.ad_id}}' },
    { label: 'Meta Ad: Campaña', value: '{{lead.ad_campaign}}' },
    { label: 'Meta Ad: Fuente', value: '{{lead.ad_source}}' },
    { label: 'Meta Ad: URL de Referencia', value: '{{lead.ad_url}}' },
    { label: 'Variable Personalizada', value: '{{custom_variable}}' },
];

export const VariableSelector: React.FC<VariableSelectorProps> = ({ onSelect, className, children }) => {
    const [open, setOpen] = React.useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {children ? (
                    <span className="inline-flex cursor-pointer">{children}</span>
                ) : (
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 text-slate-400 hover:text-purple-600 ${className}`}
                        title="Insertar Variable"
                    >
                        <Braces size={16} />
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent className="p-0 w-64" align="end">
                <Command>
                    <CommandInput placeholder="Buscar variable..." />
                    <CommandList>
                        <CommandEmpty>No se encontraron variables.</CommandEmpty>
                        <CommandGroup heading="Variables Disponibles">
                            {VARIABLES.map((v) => (
                                <CommandItem
                                    key={v.value}
                                    onSelect={() => {
                                        onSelect(v.value);
                                        setOpen(false);
                                    }}
                                    className="flex flex-col items-start gap-0.5 cursor-pointer"
                                >
                                    <span className="font-medium">{v.label}</span>
                                    <span className="text-xs text-muted-foreground font-mono">{v.value}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};
