"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Search, ListFilter, CalendarRange, X, ChevronDown } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { PipelineStage } from "../pipeline-actions"
import { cn } from "@/lib/utils"
import { DateRange } from "react-day-picker"

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
    const [showFilters, setShowFilters] = useState(false)
    const [datePickerOpen, setDatePickerOpen] = useState(false)

    const toggleStage = (stageKey: string) => {
        if (selectedStages.includes(stageKey)) {
            onStagesChange(selectedStages.filter(s => s !== stageKey))
        } else {
            onStagesChange([...selectedStages, stageKey])
        }
    }

    const dateRange: DateRange | undefined = (dateFrom || dateTo) ? {
        from: dateFrom ? new Date(dateFrom) : undefined,
        to: dateTo ? new Date(dateTo) : undefined
    } : undefined

    const handleDateRangeChange = (range: DateRange | undefined) => {
        onDateFromChange(range?.from ? range.from.toISOString() : null)
        onDateToChange(range?.to ? range.to.toISOString() : null)
    }

    const formatDateRange = () => {
        if (!dateFrom && !dateTo) return null
        if (dateFrom && dateTo) {
            return `${format(new Date(dateFrom), "dd MMM", { locale: es })} - ${format(new Date(dateTo), "dd MMM", { locale: es })}`
        }
        if (dateFrom) return `Desde ${format(new Date(dateFrom), "dd MMM", { locale: es })}`
        if (dateTo) return `Hasta ${format(new Date(dateTo), "dd MMM", { locale: es })}`
        return null
    }

    const clearDateRange = () => {
        onDateFromChange(null)
        onDateToChange(null)
    }

    return (
        <div className="flex items-center gap-2 w-full">
            {/* Unified Search Bar with Filters */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm p-1 flex items-center gap-1 flex-1 transition-all hover:shadow-md">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[180px] flex items-center px-3 gap-2">
                    <Search className="h-4 w-4 text-gray-400 shrink-0" />
                    <input
                        placeholder="Buscar leads..."
                        className="bg-transparent border-0 focus:ring-0 text-sm w-full outline-none text-gray-700 dark:text-gray-200 placeholder:text-gray-400 h-8"
                        value={searchText}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>

                {/* Divider */}
                <div className="h-5 w-px bg-gray-200 dark:bg-zinc-700" />

                {/* Stage Filter Dropdown */}
                <Popover>
                    <PopoverTrigger asChild>
                        <button
                            className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                                selectedStages.length > 0
                                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                                    : "text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800"
                            )}
                        >
                            <ListFilter className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Etapas</span>
                            {selectedStages.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-indigo-200/50 dark:bg-indigo-800/50">
                                    {selectedStages.length}
                                </span>
                            )}
                            <ChevronDown className="h-3 w-3 opacity-50" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="start">
                        <div className="space-y-1">
                            {stages.map((stage) => (
                                <button
                                    key={stage.id}
                                    onClick={() => toggleStage(stage.status_key)}
                                    className={cn(
                                        "flex items-center gap-2 w-full p-2 rounded-lg text-sm transition-colors text-left",
                                        selectedStages.includes(stage.status_key)
                                            ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                                            : "hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-300"
                                    )}
                                >
                                    <div className={cn(
                                        "w-2.5 h-2.5 rounded-full transition-transform",
                                        stage.color,
                                        selectedStages.includes(stage.status_key) && "scale-125"
                                    )} />
                                    <span className="flex-1">{stage.name}</span>
                                    {selectedStages.includes(stage.status_key) && (
                                        <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center">
                                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                        {selectedStages.length > 0 && (
                            <button
                                onClick={() => onStagesChange([])}
                                className="w-full mt-2 pt-2 border-t text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                Limpiar selección
                            </button>
                        )}
                    </PopoverContent>
                </Popover>

                {/* Divider */}
                <div className="h-5 w-px bg-gray-200 dark:bg-zinc-700" />

                {/* Date Range Picker */}
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                        <button
                            className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                                dateRange
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                    : "text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800"
                            )}
                        >
                            <CalendarRange className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">{formatDateRange() || "Fechas"}</span>
                            <ChevronDown className="h-3 w-3 opacity-50" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <div className="p-3 border-b">
                            <p className="font-medium text-sm">Rango de fechas</p>
                            <p className="text-xs text-muted-foreground">Selecciona fecha inicio y fin</p>
                        </div>
                        <Calendar
                            mode="range"
                            selected={dateRange}
                            onSelect={handleDateRangeChange}
                            locale={es}
                            numberOfMonths={2}
                            className="p-3"
                            classNames={{
                                months: "flex flex-col sm:flex-row gap-4",
                                month: "space-y-4",
                                caption: "flex justify-center pt-1 relative items-center",
                                caption_label: "text-sm font-medium",
                                nav: "flex items-center gap-1",
                                nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-input hover:bg-accent hover:text-accent-foreground",
                                table: "w-full border-collapse space-y-1",
                                head_row: "flex",
                                head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                                row: "flex w-full mt-2",
                                cell: "h-9 w-9 text-center text-sm relative p-0 focus-within:relative focus-within:z-20",
                                day: "h-9 w-9 p-0 font-normal inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground aria-selected:opacity-100",
                                day_range_start: "day-range-start rounded-l-md bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                                day_range_end: "day-range-end rounded-r-md bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                                day_range_middle: "bg-accent text-accent-foreground",
                                day_today: "bg-accent text-accent-foreground font-bold",
                                day_outside: "text-muted-foreground opacity-50",
                                day_disabled: "text-muted-foreground opacity-50",
                                day_hidden: "invisible",
                            }}
                        />
                        {dateRange && (
                            <div className="p-3 border-t flex justify-between items-center">
                                <button
                                    onClick={clearDateRange}
                                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
                                >
                                    Limpiar
                                </button>
                                <Button size="sm" onClick={() => setDatePickerOpen(false)}>
                                    Aplicar
                                </Button>
                            </div>
                        )}
                    </PopoverContent>
                </Popover>
            </div>

            {/* Results Counter */}
            {filteredCount !== totalLeads && (
                <Badge variant="secondary" className="shrink-0 h-7 text-xs">
                    {filteredCount} de {totalLeads}
                </Badge>
            )}

            {/* Clear All Filters */}
            {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={onReset} className="shrink-0 h-8 px-2 text-xs">
                    <X className="h-3.5 w-3.5 mr-1" />
                    Limpiar
                </Button>
            )}
        </div>
    )
}
