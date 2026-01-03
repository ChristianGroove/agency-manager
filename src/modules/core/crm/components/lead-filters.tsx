"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Filter, X, Search, Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { PipelineStage } from "../pipeline-actions"
import { cn } from "@/lib/utils"

interface LeadFiltersProps {
    searchText: string
    onSearchChange: (value: string) => void
    selectedStages: string[]
    onStagesChange: (stages: string[]) => void
    dateFrom: string | null
    dateTo: string | null
    onDateFromChange: (date: string | null) => void
    onDateToChange: (date: string | null) => void
    onReset: () => void
    activeFilterCount: number
    stages: PipelineStage[]
    totalLeads: number
    filteredCount: number
}

export function LeadFilters({
    searchText,
    onSearchChange,
    selectedStages,
    onStagesChange,
    dateFrom,
    dateTo,
    onDateFromChange,
    onDateToChange,
    onReset,
    activeFilterCount,
    stages,
    totalLeads,
    filteredCount,
}: LeadFiltersProps) {
    const toggleStage = (stageKey: string) => {
        if (selectedStages.includes(stageKey)) {
            onStagesChange(selectedStages.filter(s => s !== stageKey))
        } else {
            onStagesChange([...selectedStages, stageKey])
        }
    }

    return (
        <Card className="p-4 space-y-4">
            {/* Search Bar */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre, empresa o email..."
                        value={searchText}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-9"
                    />
                </div>
                {activeFilterCount > 0 && (
                    <Button variant="outline" onClick={onReset}>
                        <X className="mr-2 h-4 w-4" />
                        Limpiar ({activeFilterCount})
                    </Button>
                )}
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-2 items-center">
                {/* Stage Filter */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Filter className="mr-2 h-4 w-4" />
                            Etapas
                            {selectedStages.length > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    {selectedStages.length}
                                </Badge>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64">
                        <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Filtrar por etapa</h4>
                            <div className="space-y-1">
                                {stages.map((stage) => (
                                    <label
                                        key={stage.id}
                                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedStages.includes(stage.status_key)}
                                            onChange={() => toggleStage(stage.status_key)}
                                            className="rounded"
                                        />
                                        <div className={cn("w-2 h-2 rounded-full", stage.color)} />
                                        <span className="text-sm">{stage.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Date From */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateFrom ? format(new Date(dateFrom), "PPP", { locale: es }) : "Desde"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={dateFrom ? new Date(dateFrom) : undefined}
                            onSelect={(date) => onDateFromChange(date ? date.toISOString() : null)}
                            locale={es}
                        />
                    </PopoverContent>
                </Popover>

                {/* Date To */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateTo ? format(new Date(dateTo), "PPP", { locale: es }) : "Hasta"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={dateTo ? new Date(dateTo) : undefined}
                            onSelect={(date) => onDateToChange(date ? date.toISOString() : null)}
                            locale={es}
                        />
                    </PopoverContent>
                </Popover>

                {/* Results Counter */}
                <div className="ml-auto text-sm text-muted-foreground">
                    Mostrando <span className="font-semibold text-foreground">{filteredCount}</span> de {totalLeads} leads
                </div>
            </div>

            {/* Active Filter Pills */}
            {(selectedStages.length > 0 || dateFrom || dateTo) && (
                <div className="flex flex-wrap gap-2">
                    {selectedStages.map((stageKey) => {
                        const stage = stages.find(s => s.status_key === stageKey)
                        if (!stage) return null
                        return (
                            <Badge key={stageKey} variant="secondary" className="gap-1">
                                <div className={cn("w-2 h-2 rounded-full", stage.color)} />
                                {stage.name}
                                <button
                                    onClick={() => toggleStage(stageKey)}
                                    className="ml-1 hover:text-red-600"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        )
                    })}
                    {dateFrom && (
                        <Badge variant="secondary" className="gap-1">
                            Desde: {format(new Date(dateFrom), "PP", { locale: es })}
                            <button
                                onClick={() => onDateFromChange(null)}
                                className="ml-1 hover:text-red-600"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}
                    {dateTo && (
                        <Badge variant="secondary" className="gap-1">
                            Hasta: {format(new Date(dateTo), "PP", { locale: es })}
                            <button
                                onClick={() => onDateToChange(null)}
                                className="ml-1 hover:text-red-600"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </Badge>
                    )}
                </div>
            )}
        </Card>
    )
}
