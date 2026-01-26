import { useState, useMemo } from "react"
import { Lead } from "@/types"

export interface LeadFilters {
    searchText: string
    stages: string[]
    dateFrom: string | null
    dateTo: string | null
}

export function useLeadFilters(leads: Lead[]) {
    const [filters, setFilters] = useState<LeadFilters>({
        searchText: "",
        stages: [],
        dateFrom: null,
        dateTo: null,
    })

    const filteredLeads = useMemo(() => {
        let result = [...leads]

        // Text search (nombre, empresa, email)
        if (filters.searchText) {
            const search = filters.searchText.toLowerCase()
            result = result.filter(lead =>
                (lead.name || '').toLowerCase().includes(search) ||
                (lead.company_name || '').toLowerCase().includes(search) ||
                (lead.email || '').toLowerCase().includes(search)
            )
        }

        // Stage filter
        if (filters.stages.length > 0) {
            result = result.filter(lead => filters.stages.includes(lead.status))
        }

        // Date range filter
        if (filters.dateFrom) {
            const fromDate = new Date(filters.dateFrom)
            result = result.filter(lead => new Date(lead.created_at) >= fromDate)
        }

        if (filters.dateTo) {
            const toDate = new Date(filters.dateTo)
            toDate.setHours(23, 59, 59, 999) // Include entire day
            result = result.filter(lead => new Date(lead.created_at) <= toDate)
        }

        return result
    }, [leads, filters])

    const updateFilter = (key: keyof LeadFilters, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    const resetFilters = () => {
        setFilters({
            searchText: "",
            stages: [],
            dateFrom: null,
            dateTo: null,
        })
    }

    const activeFilterCount = useMemo(() => {
        let count = 0
        if (filters.searchText) count++
        if (filters.stages.length > 0) count++
        if (filters.dateFrom || filters.dateTo) count++
        return count
    }, [filters])

    return {
        filters,
        filteredLeads,
        updateFilter,
        resetFilters,
        activeFilterCount,
    }
}
