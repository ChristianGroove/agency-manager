"use client"

import React, { useState, useRef, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"
import {
  Download,
  Printer,
  X,
  TrendingUp,
  FileText,
  Loader2,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/modules/infrastructure/utils/utils"
import type { TaskItem } from "../../types"
import { getTaskWeeklyPacing } from "../../types"
import { getCollaboratorAvatar } from "../../utils/avatar-presets"
import { toast } from "sonner"

export interface TaskPacingPdfModalProps {
  isOpen: boolean
  onClose: () => void
  tasks: TaskItem[]
  currentDate: Date
  selectedStaff?: {
    id: string
    first_name: string
    last_name: string
    photo_url?: string | null
    email?: string | null
    role?: string
  } | null
  scopeLabel: string
  filterPreset: string
  metrics: {
    averageActiveProgress: number
    total: number
    activeCount: number
    completedCount: number
    onTrackCount: number
    atRiskCount: number
    delayedCount: number
    totalEstimatedHours?: number
    totalActualHours?: number
    hoursBurnRate?: number
    hoursDelta?: number
  }
  tenantBranding?: {
    name?: string
    logoUrl?: string | null
    isotypeUrl?: string | null
    primaryColor?: string
  }
  brandColor?: string
}

export function TaskPacingPdfModal({
  isOpen,
  onClose,
  tasks,
  currentDate,
  selectedStaff,
  scopeLabel,
  filterPreset,
  metrics,
  tenantBranding,
  brandColor = "#8ec045",
}: TaskPacingPdfModalProps) {
  const [isExporting, setIsExporting] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  const monthName = format(currentDate, "MMMM yyyy", { locale: es })
  const effectiveBrandColor = tenantBranding?.primaryColor || brandColor || "#8ec045"

  const totalEstimated = useMemo(() => {
    if (metrics.totalEstimatedHours !== undefined) return metrics.totalEstimatedHours
    return Math.round(tasks.reduce((sum, t) => sum + (Number(t.estimated_hours) || 0), 0) * 10) / 10
  }, [metrics.totalEstimatedHours, tasks])

  const totalActual = useMemo(() => {
    if (metrics.totalActualHours !== undefined) return metrics.totalActualHours
    return Math.round(tasks.reduce((sum, t) => sum + (Number(t.actual_hours) || 0), 0) * 10) / 10
  }, [metrics.totalActualHours, tasks])

  const burnRate = totalEstimated > 0 ? Math.round((totalActual / totalEstimated) * 100) : (totalActual > 0 ? 100 : 0)

  const filterLabel =
    filterPreset === "active"
      ? "Activas"
      : filterPreset === "completed"
      ? "Completas"
      : "Todas"

  // Download PDF file using html-to-image + jsPDF in PORTRAIT (vertical) orientation
  const handleDownloadPdf = async () => {
    if (!reportRef.current) return
    setIsExporting(true)
    try {
      const { toPng } = await import("html-to-image")
      const { jsPDF } = await import("jspdf")

      const dataUrl = await toPng(reportRef.current, {
        quality: 0.98,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#ffffff",
        style: {
          boxShadow: "none",
          borderRadius: "0px",
          margin: "0px",
        },
      })

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      const imgProps = pdf.getImageProperties(dataUrl)
      const pdfWidth = pdf.internal.pageSize.getWidth() // Exactly 210 mm (A4 Portrait)
      const pageHeight = pdf.internal.pageSize.getHeight() // Exactly 297 mm (A4 Portrait)
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width

      let heightLeft = pdfHeight
      let position = 0

      // First page
      pdf.addImage(dataUrl, "PNG", 0, position, pdfWidth, pdfHeight, undefined, "FAST")
      heightLeft -= pageHeight

      // Subsequent pages if the document exceeds 1 page
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight
        pdf.addPage()
        pdf.addImage(dataUrl, "PNG", 0, position, pdfWidth, pdfHeight, undefined, "FAST")
        heightLeft -= pageHeight
      }

      const entityName = selectedStaff
        ? `${selectedStaff.first_name}_${selectedStaff.last_name}`
        : "Equipo_Global"
      const monthSlug = format(currentDate, "yyyy-MM")
      pdf.save(`Ritmo_Semanal_${entityName}_${monthSlug}.pdf`)

      toast.success("PDF vertical generado y descargado con éxito", {
        description: `Documento A4 vertical adaptado con los ${tasks.length} tickets del reporte.`,
      })
    } catch (err) {
      console.error("Error al generar PDF:", err)
      toast.error("Hubo un error al exportar el PDF.")
    } finally {
      setIsExporting(false)
    }
  }

  // Native vector printing via browser engine
  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[92vh] flex flex-col p-0 gap-0 rounded-3xl overflow-hidden bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 shadow-2xl z-50">
        {/* Top Actions Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-foreground">
                Vista Previa del Reporte PDF
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Revisa el documento antes de descargarlo o imprimirlo
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    className="h-9 px-3.5 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer bg-white dark:bg-zinc-800 border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                    aria-label="Imprimir o Guardar como PDF del sistema"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="rounded-xl text-xs">
                  Imprimir o Guardar como PDF
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="h-9 px-4 rounded-xl text-xs font-bold gap-1.5 cursor-pointer shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generando...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar PDF</span>
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Preview Viewport */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 bg-zinc-200/60 dark:bg-zinc-950/80 flex justify-center">
          {/* Printable Document Container (A4 Portrait Paper Sheet) */}
          <div
            ref={reportRef}
            id="printable-pacing-report"
            className="w-[800px] min-w-[800px] max-w-[800px] bg-white text-zinc-900 p-8 rounded-2xl shadow-xl border border-zinc-200/80 space-y-5 mx-auto print:shadow-none print:border-none print:p-0 print:m-0 print:w-full"
          >
            {/* 1. HERO SECTION (Light & Clean Executive Design) */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-50 via-white to-zinc-50 border border-zinc-200/90 text-zinc-900 p-5 shadow-2xs">
              {/* Subtle primary accent bar on top */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5 opacity-90"
                style={{ backgroundColor: effectiveBrandColor }}
              />

              <div className="relative z-10 flex items-center justify-between gap-4 pt-1">
                <div className="flex items-center gap-3.5 min-w-0">
                  {selectedStaff ? (
                    /* Collaborator Hero Avatar */
                    <div className="relative shrink-0">
                      <Avatar className="w-14 h-14 rounded-2xl ring-2 ring-primary/20 shadow-md border-2 border-white">
                        <AvatarImage
                          src={getCollaboratorAvatar(
                            selectedStaff.photo_url,
                            selectedStaff.first_name
                          )}
                          className="object-cover"
                        />
                        <AvatarFallback className="text-lg font-bold bg-primary text-primary-foreground">
                          {selectedStaff.first_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                    </div>
                  ) : (
                    /* Global Team Hero with Tenant ADN de Marca Isotype */
                    <div className="w-14 h-14 rounded-2xl bg-white p-2 ring-1 ring-zinc-200/90 shadow-md border border-zinc-100 flex items-center justify-center shrink-0">
                      <img
                        src={tenantBranding?.isotypeUrl || "/pixy-isotipo.png"}
                        alt={tenantBranding?.name || "Isotipo"}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          ;(e.currentTarget as HTMLImageElement).src = "/pixy-isotipo.png"
                        }}
                      />
                    </div>
                  )}

                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-primary/10 text-primary border border-primary/25 text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider">
                        {selectedStaff ? "Colaborador Asignado" : "Equipo Global"}
                      </Badge>
                      <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
                        {monthName}
                      </span>
                    </div>

                    <h2 className="text-xl font-black text-zinc-900 tracking-tight truncate">
                      {selectedStaff
                        ? `${selectedStaff.first_name} ${selectedStaff.last_name}`
                        : tenantBranding?.name || "Pixy Spaces"}
                    </h2>

                    <p className="text-xs text-zinc-600 font-medium truncate flex items-center gap-1.5">
                      {selectedStaff ? (
                        <>
                          <span className="text-zinc-700 font-semibold">{selectedStaff.role || "Especialista"}</span>
                          {selectedStaff.email && (
                            <>
                              <span className="text-zinc-400">·</span>
                              <span className="text-zinc-500">{selectedStaff.email}</span>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="text-zinc-700 font-semibold">Ritmo de Sprints & Entregables</span>
                          <span className="text-zinc-400">·</span>
                          <span className="text-zinc-500">{scopeLabel}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Right Avance Widget in Hero (Light Executive Tile) */}
                <div className="flex items-center gap-3 bg-white border border-zinc-200/90 rounded-xl px-3.5 py-2.5 shadow-2xs shrink-0">
                  <div className="text-right space-y-0.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block">
                      {selectedStaff ? `Avance ${selectedStaff.first_name}` : "Avance Activo"}
                    </span>
                    <span className="text-xl font-black font-mono text-zinc-900 block leading-none">
                      {metrics.averageActiveProgress}%
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. DASHBOARD INSIGHTS (Condensados y Productivos) */}
            <div className="grid grid-cols-5 gap-2">
              {/* Avance Activo */}
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-2.5 space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block truncate">
                  Avance Activo
                </span>
                <span className="text-lg font-black font-mono text-zinc-900 block leading-none">
                  {metrics.averageActiveProgress}%
                </span>
                <p className="text-[10px] text-zinc-500 truncate">
                  Sobre {metrics.activeCount} en curso
                </p>
              </div>

              {/* Total Periodo */}
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-2.5 space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block truncate">
                  Total Periodo
                </span>
                <span className="text-lg font-black font-mono text-zinc-900 block leading-none">
                  {metrics.total}
                </span>
                <p className="text-[10px] text-zinc-500 truncate">
                  {metrics.completedCount} listas · {metrics.activeCount} activas
                </p>
              </div>

              {/* A Tiempo */}
              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-2.5 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 inline-block" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 block truncate">
                    A Tiempo
                  </span>
                </div>
                <span className="text-lg font-black font-mono text-emerald-700 block leading-none">
                  {metrics.onTrackCount}
                </span>
                <p className="text-[10px] text-emerald-600/90 truncate">
                  En ritmo de entrega
                </p>
              </div>

              {/* Atención / Riesgo */}
              <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-2.5 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 inline-block" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-rose-700 block truncate">
                    Riesgo / Atraso
                  </span>
                </div>
                <span className="text-lg font-black font-mono text-rose-700 block leading-none">
                  {metrics.atRiskCount + metrics.delayedCount}
                </span>
                <p className="text-[10px] text-rose-600/90 truncate">
                  {metrics.atRiskCount} riesgo · {metrics.delayedCount} retraso
                </p>
              </div>

              {/* Horas del Periodo */}
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-2.5 space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 block truncate">
                  Horas del Periodo
                </span>
                <span className="text-lg font-black font-mono text-zinc-900 block leading-none">
                  {totalActual}h
                </span>
                <p className="text-[10px] text-zinc-500 truncate">
                  / {totalEstimated}h ({burnRate}%)
                </p>
              </div>
            </div>

            {/* 3. TABLA DE TICKETS (Perfectamente adaptada lateralmente con table-fixed) */}
            <div className="rounded-2xl border border-zinc-200/90 overflow-hidden bg-white shadow-2xs">
              <table className="w-full table-fixed text-left text-xs border-collapse">
                <thead className="bg-zinc-100/90 text-zinc-600 text-[10px] font-bold uppercase tracking-wider border-b border-zinc-200">
                  <tr>
                    <th className="px-2 py-2.5 w-[75px]">Ticket</th>
                    <th className="px-2 py-2.5 w-[215px]">Requerimiento</th>
                    <th className="px-2 py-2.5 w-[95px]">Asignado</th>
                    <th className="px-1 py-2.5 text-center w-[48px]">Sem 1</th>
                    <th className="px-1 py-2.5 text-center w-[48px]">Sem 2</th>
                    <th className="px-1 py-2.5 text-center w-[48px]">Sem 3</th>
                    <th className="px-1 py-2.5 text-center w-[48px]">Sem 4</th>
                    <th className="px-2 py-2.5 text-right w-[65px]">Horas</th>
                    <th className="px-2 py-2.5 text-right w-[75px]">Avance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-800">
                  {tasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-10 text-center text-zinc-400 text-xs italic"
                      >
                        No hay tareas que coincidan con la filtración seleccionada.
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task) => {
                      const pacing = getTaskWeeklyPacing(task, currentDate)
                      const staffName = task.assigned_staff
                        ? `${task.assigned_staff.first_name} ${task.assigned_staff.last_name ? task.assigned_staff.last_name[0] + "." : ""}`
                        : "Sin asignar"

                      return (
                        <tr
                          key={task.id}
                          className="hover:bg-zinc-50/50 transition-colors"
                        >
                          {/* Ticket Code */}
                          <td className="px-2.5 py-2 font-mono font-bold text-zinc-900 whitespace-nowrap">
                            <span className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200/80 text-[10px]">
                              {task.ticket_code}
                            </span>
                          </td>

                          {/* Requerimiento (Title ONLY, NO descriptions) */}
                          <td className="px-2.5 py-2 font-medium text-zinc-900">
                            <span className="line-clamp-1 text-[11px]">
                              {task.title}
                            </span>
                          </td>

                          {/* Assignee */}
                          <td className="px-2.5 py-2 text-zinc-600 text-[11px] truncate">
                            <span className="truncate block">
                              {staffName}
                            </span>
                          </td>

                          {/* Weeks 1 to 4 */}
                          {pacing.map((w) => {
                            const isCompleted = w.status === "completed"
                            const isOnTrack = w.status === "on_track"
                            const isAtRisk = w.status === "at_risk"
                            const isDelayed = w.status === "delayed"

                            return (
                              <td
                                key={w.week}
                                className="px-1 py-2 text-center whitespace-nowrap"
                              >
                                <span
                                  className={cn(
                                    "text-[9px] font-bold px-1.5 py-0.5 rounded inline-block",
                                    isCompleted
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                      : isOnTrack
                                      ? "bg-sky-100 text-sky-800 border border-sky-200"
                                      : isAtRisk
                                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                                      : isDelayed
                                      ? "bg-rose-100 text-rose-800 border border-rose-200"
                                      : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                                  )}
                                >
                                  {isCompleted
                                    ? "Listo"
                                    : isOnTrack
                                    ? "En Ritmo"
                                    : isAtRisk
                                    ? "Riesgo"
                                    : isDelayed
                                    ? "Retraso"
                                    : "Plan"}
                                </span>
                              </td>
                            )
                          })}

                          {/* Horas */}
                          <td className="px-2 py-2 text-right font-mono font-medium text-zinc-700 whitespace-nowrap text-[10px]">
                            {Number(task.actual_hours) || 0}h{Number(task.estimated_hours) > 0 ? `/${task.estimated_hours}h` : ""}
                          </td>

                          {/* Progress % */}
                          <td className="px-2.5 py-2 text-right font-mono font-bold text-zinc-900 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <div className="w-7 h-1.5 bg-zinc-100 rounded-full overflow-hidden shrink-0">
                                <div
                                  className={cn(
                                    "h-full rounded-full",
                                    task.progress_percentage === 100
                                      ? "bg-emerald-500"
                                      : task.progress_percentage >= 50
                                      ? "bg-primary"
                                      : "bg-amber-500"
                                  )}
                                  style={{ width: `${task.progress_percentage}%` }}
                                />
                              </div>
                              <span className="text-[10px] w-7 text-right">
                                {task.progress_percentage}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
                <tfoot className="bg-zinc-50/90 border-t border-zinc-200 text-[10px] font-semibold text-zinc-700">
                  <tr>
                    <td colSpan={7} className="px-2.5 py-2 text-right uppercase tracking-wider text-zinc-500">
                      Total Horas Consolidadas
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-zinc-900 font-bold">
                      {totalActual}h / {totalEstimated}h
                    </td>
                    <td className="px-2.5 py-2 text-right font-mono text-zinc-500">
                      {burnRate}% burn
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 4. DOCUMENT FOOTER */}
            <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-3 border-t border-zinc-100">
              <div className="flex items-center gap-2">
                <span>
                  Generado el {format(new Date(), "dd/MM/yyyy HH:mm")}
                </span>
                <span>·</span>
                <span className="font-semibold text-zinc-600">
                  {tenantBranding?.name || "Pixy Spaces"}
                </span>
                <span>·</span>
                <span>Filtro: {filterLabel}</span>
              </div>
              <span className="font-mono">
                {tasks.length} ticket{tasks.length === 1 ? "" : "s"} visualizados
              </span>
            </div>
          </div>
        </div>

        {/* Global Print Styles to isolate the printable document in A4 portrait */}
        <style jsx global>{`
          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body * {
              visibility: hidden !important;
            }
            #printable-pacing-report,
            #printable-pacing-report * {
              visibility: visible !important;
            }
            #printable-pacing-report {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              min-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
              background: white !important;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  )
}
