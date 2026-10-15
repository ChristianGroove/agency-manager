"use client"
import type { ComponentProps } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/modules/infrastructure/utils/utils"
import { getPaginationRange, TABLE_PAGE_SIZES } from "./table-pagination"

export interface DataTablePaginationProps {
  totalCount: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  itemLabel?: string
  disabled?: boolean
  className?: string
  appearance?: "portal" | "embedded"
}
/** Shared glass treatment for offset pagination and existing cursor controls. */
export function DataTablePaginationFrame({ appearance = "portal", className, ...props }:
  ComponentProps<"nav"> & { appearance?: "portal" | "embedded" }) {
  return <nav aria-label="Paginación de la tabla" className={cn("flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 text-xs text-muted-foreground", appearance === "portal" ? "glass-card rounded-2xl bg-card shadow-sm" : "border-t border-border/60 bg-muted/20", className)} {...props} />
}

/** Controlled pagination for local arrays and server queries. Never slices data. */
export function DataTablePagination({ totalCount, page, pageSize, onPageChange, onPageSizeChange,
  itemLabel = "registros", disabled = false, className, appearance = "portal" }: DataTablePaginationProps) {
  const { safePage, totalPages, startRecord, endRecord } = getPaginationRange(totalCount, page, pageSize)
  return (
    <DataTablePaginationFrame appearance={appearance} className={className}>
      <span role="status" aria-live="polite">
        Mostrando <strong className="text-foreground font-semibold">{startRecord}</strong> - <strong className="text-foreground font-semibold">{endRecord}</strong> de{" "}
        <strong className="text-foreground font-semibold">{totalCount}</strong> {itemLabel}
      </span>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px]">Por pág:</span>
          <Select value={String(pageSize)} disabled={disabled} onValueChange={(value) => onPageSizeChange(Number(value))}>
            <SelectTrigger aria-label="Registros por página" className="h-8 w-[72px] text-xs font-semibold rounded-xl bg-background"><SelectValue /></SelectTrigger>
            <SelectContent align="end" className="rounded-xl">
              {TABLE_PAGE_SIZES.map((size) => <SelectItem key={size} value={String(size)} className="text-xs">{size}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0 rounded-xl cursor-pointer" disabled={disabled || safePage <= 1} onClick={() => onPageChange(safePage - 1)} aria-label="Página anterior"><ChevronLeft className="w-3.5 h-3.5" /></Button>
          <span className="px-2 text-[11px] font-mono font-medium text-foreground" aria-label={"Página " + safePage + " de " + totalPages}>{safePage} / {totalPages}</span>
          <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0 rounded-xl cursor-pointer" disabled={disabled || safePage >= totalPages} onClick={() => onPageChange(safePage + 1)} aria-label="Página siguiente"><ChevronRight className="w-3.5 h-3.5" /></Button>
        </div>
      </div>
    </DataTablePaginationFrame>
  )
}
