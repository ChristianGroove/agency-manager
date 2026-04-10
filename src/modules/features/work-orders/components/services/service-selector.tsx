"use client"

import { useEffect, useState } from "react"
import { Check, ChevronsUpDown, Loader2, Sparkles, Zap, Shield, Wrench, Star } from "lucide-react"
import { cn } from "@/modules/infrastructure/utils/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { getCleaningServices } from "../../actions/service-actions"

interface Service {
    id: string
    name: string
    description?: string
    base_price: number
    estimated_duration_minutes: number
    price_unit: string
    metadata?: {
        category?: string
        duration_minutes?: number
    }
}

interface ServiceSelectorProps {
    value?: string
    onChange: (serviceId: string | undefined, service?: Service) => void
    placeholder?: string
}

const categoryIcons = {
    profunda: Sparkles,
    express: Zap,
    desinfeccion: Shield,
    mantenimiento: Wrench,
    especializada: Star,
}

export function ServiceSelector({ value, onChange, placeholder = "Seleccionar servicio..." }: ServiceSelectorProps) {
    const [open, setOpen] = useState(false)
    const [services, setServices] = useState<Service[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadServices = async () => {
            setLoading(true)
            const data = await getCleaningServices()
            setServices(data)
            setLoading(false)
        }
        loadServices()
    }, [])

    const selectedService = services.find(s => s.id === value)

    const formatPrice = (price: number, unit: string) => {
        const unitLabels: Record<string, string> = {
            per_service: '/servicio',
            per_hour: '/hora',
            per_sqm: '/m²',
            flat: 'fijo'
        }
        return `$${price.toLocaleString()}${unitLabels[unit] || ''}`
    }

    const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        if (hours === 0) return `${mins}min`
        if (mins === 0) return `${hours}h`
        return `${hours}h ${mins}min`
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-11"
                    disabled={loading}
                >
                    {loading ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-muted-foreground">Cargando...</span>
                        </div>
                    ) : selectedService ? (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            {selectedService.metadata?.category && categoryIcons[selectedService.metadata.category as keyof typeof categoryIcons] && (
                                <>
                                    {(() => {
                                        const Icon = categoryIcons[selectedService.metadata.category as keyof typeof categoryIcons]
                                        return <Icon className="h-4 w-4 shrink-0" />
                                    })()}
                                </>
                            )}
                            <span className="truncate">{selectedService.name}</span>
                            <span className="text-xs text-muted-foreground ml-auto shrink-0">
                                {formatPrice(selectedService.base_price, selectedService.price_unit)}
                            </span>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[450px] p-0">
                <Command>
                    <CommandInput placeholder="Buscar servicio..." />
                    <CommandEmpty>No se encontraron servicios.</CommandEmpty>
                    <CommandGroup className="max-h-[300px] overflow-auto">
                        {/* Clear option */}
                        <CommandItem
                            value=""
                            onSelect={() => {
                                onChange(undefined)
                                setOpen(false)
                            }}
                            className="text-muted-foreground italic"
                        >
                            <Check
                                className={cn(
                                    "mr-2 h-4 w-4",
                                    !value ? "opacity-100" : "opacity-0"
                                )}
                            />
                            Sin servicio
                        </CommandItem>

                        {services.map((service) => {
                            const IconComponent = service.metadata?.category && categoryIcons[service.metadata.category as keyof typeof categoryIcons]
                                ? categoryIcons[service.metadata.category as keyof typeof categoryIcons]
                                : Wrench

                            return (
                                <CommandItem
                                    key={service.id}
                                    value={`${service.name} ${service.description || ''}`}
                                    onSelect={() => {
                                        onChange(service.id, service)
                                        setOpen(false)
                                    }}
                                    className="cursor-pointer"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4", value === service.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <IconComponent className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">{service.name}</div>
                                            {service.description && (
                                                <div className="text-xs text-muted-foreground truncate">
                                                    {service.description}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-sm font-semibold text-green-600">
                                                {formatPrice(service.base_price, service.price_unit)}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDuration(service.metadata?.duration_minutes || service.estimated_duration_minutes)}
                                            </span>
                                        </div>
                                    </div>
                                </CommandItem>
                            )
                        })}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
