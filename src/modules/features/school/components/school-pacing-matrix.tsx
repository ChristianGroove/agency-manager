"use client";

import React, { useState } from "react";
import { cn } from "@/modules/infrastructure/utils/utils";
import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  HelpCircle,
  FileCheck2,
  TrendingUp,
  BookOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SchoolCourse, SchoolAssignment } from "../types/school.types";

interface PacingCourseRow {
  course: SchoolCourse;
  weeklyStatus: Record<number, "completed" | "in_progress" | "delayed" | "planned" | "empty">;
  assignmentsByWeek: Record<number, SchoolAssignment[]>;
  averageProgress: number;
}

interface SchoolPacingMatrixProps {
  periodName: string;
  totalWeeks?: number;
  rows: PacingCourseRow[];
  brandColor?: string;
  className?: string;
}

const STATUS_ICONS = {
  completed: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  in_progress: <Clock className="w-4 h-4 text-blue-500 animate-pulse" />,
  delayed: <AlertCircle className="w-4 h-4 text-rose-500" />,
  planned: <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />,
  empty: <div className="w-1.5 h-1.5 rounded-full bg-border" />,
};

const STATUS_TOOLTIPS = {
  completed: "Estándar evaluado y notas cargadas",
  in_progress: "Actividad en desarrollo durante esta semana",
  delayed: "Actividad atrasada respecto al cronograma",
  planned: "Programado en el plan de estudios",
  empty: "Sin entregable programado",
};

export function SchoolPacingMatrix({
  periodName,
  totalWeeks = 10,
  rows,
  brandColor = "#2563eb",
  className,
}: SchoolPacingMatrixProps) {
  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);

  return (
    <div className={cn("w-full bg-card rounded-2xl border p-5 shadow-sm overflow-hidden", className)}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-foreground">
              Matriz de Ritmo Curricular (Pacing)
            </h3>
            <Badge variant="secondary" className="font-semibold text-xs">
              {periodName}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitoreo en tiempo real del cumplimiento de planes de estudio y entregas docentes por semana.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Al Día
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            En Curso
          </span>
          <span className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            Atrasado
          </span>
        </div>
      </div>

      {/* Grid Container */}
      <div className="w-full overflow-x-auto pt-3">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="py-2.5 px-3 font-semibold min-w-[200px]">Asignatura / Docente</th>
              <th className="py-2.5 px-3 font-semibold text-center w-16">Avance</th>
              {weeks.map((w) => (
                <th key={w} className="py-2.5 px-2 font-semibold text-center w-12">
                  S{w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y text-xs">
            {rows.map((row) => {
              const teacherName = row.course.lead_teacher
                ? `${row.course.lead_teacher.first_name} ${row.course.lead_teacher.last_name}`
                : "Docente Titular";

              return (
                <tr key={row.course.id} className="hover:bg-muted/30 transition-colors">
                  {/* Course & Teacher */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-foreground truncate max-w-[170px]">
                          {row.course.subject_name}
                        </span>
                        <span className="text-[11px] text-muted-foreground truncate">
                          {row.course.section?.name} • {teacherName}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Progress Badge */}
                  <td className="py-3 px-3 text-center">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-bold px-1.5",
                        row.averageProgress >= 80
                          ? "text-emerald-500 border-emerald-500/30"
                          : row.averageProgress >= 50
                          ? "text-blue-500 border-blue-500/30"
                          : "text-amber-500 border-amber-500/30"
                      )}
                    >
                      {row.averageProgress}%
                    </Badge>
                  </td>

                  {/* Weekly Columns */}
                  <TooltipProvider key={row.course.id} delayDuration={150}>
                    {weeks.map((w) => {
                      const status = row.weeklyStatus[w] || "empty";
                      const assignments = row.assignmentsByWeek[w] || [];
                      const hasAssignments = assignments.length > 0;

                      return (
                        <td key={w} className="py-3 px-2 text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="w-full flex items-center justify-center cursor-pointer py-1">
                                {STATUS_ICONS[status]}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs max-w-[200px]">
                              <p className="font-bold">Semana {w}</p>
                              <p className="text-muted-foreground">{STATUS_TOOLTIPS[status]}</p>
                              {hasAssignments && (
                                <div className="mt-1 pt-1 border-t border-border/50 text-[10px]">
                                  {assignments.map((a) => (
                                    <div key={a.id} className="truncate">
                                      • {a.title} ({a.weight_percentage}%)
                                    </div>
                                  ))}
                                </div>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      );
                    })}
                  </TooltipProvider>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
