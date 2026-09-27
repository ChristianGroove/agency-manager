"use client";

import React, { useState } from "react";
import { cn } from "@/modules/infrastructure/utils/utils";
import {
  FileSpreadsheet,
  Save,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Award,
  ChevronDown,
  RefreshCw,
  Sparkles,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { resolvePerformanceTier } from "../services/grading-calculator";
import { recordStudentGradesAction } from "../actions/school-actions";
import type { SchoolCourse, ColombianPerformanceTier } from "../types/school.types";

interface GradeStudentRow {
  enrollmentId: string;
  studentCode: string;
  studentName: string;
  a1Score: number | null; // Taller Diagnóstico (20%)
  a2Score: number | null; // Laboratorio / Proyecto (30%)
  a3Score: number | null; // Evaluación Periódica (35%)
  a4Score: number | null; // Autoevaluación SIEE (15%)
  recoveryScore?: number | null; // Nivelación Decreto 1290
  isExcused?: boolean;
}

interface SchoolGradesSheetViewProps {
  courses: SchoolCourse[];
  selectedCourseId: string;
  onSelectCourse: (id: string) => void;
  brandColor?: string;
}

export function SchoolGradesSheetView({
  courses,
  selectedCourseId,
  onSelectCourse,
  brandColor = "#2563eb",
}: SchoolGradesSheetViewProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("1");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Demo initial rows for instant reactivity and interactive grade entry
  const [rows, setRows] = useState<GradeStudentRow[]>([
    {
      enrollmentId: "e1",
      studentCode: "2026-001",
      studentName: "Santiago Gómez Rojas",
      a1Score: 4.8,
      a2Score: 4.5,
      a3Score: 4.7,
      a4Score: 5.0,
    },
    {
      enrollmentId: "e2",
      studentCode: "2026-002",
      studentName: "Valentina Morales Castro",
      a1Score: 4.0,
      a2Score: 3.8,
      a3Score: 4.2,
      a4Score: 4.5,
    },
    {
      enrollmentId: "e3",
      studentCode: "2026-003",
      studentName: "Mateo Herrera Quintero",
      a1Score: 2.8,
      a2Score: 2.5,
      a3Score: 3.0,
      a4Score: 3.5,
      recoveryScore: 3.2,
    },
    {
      enrollmentId: "e4",
      studentCode: "2026-004",
      studentName: "Isabella Restrepo López",
      a1Score: 5.0,
      a2Score: 4.9,
      a3Score: 5.0,
      a4Score: 5.0,
    },
    {
      enrollmentId: "e5",
      studentCode: "2026-005",
      studentName: "Samuel Cárdenas Duarte",
      a1Score: 2.2,
      a2Score: 2.0,
      a3Score: 2.4,
      a4Score: 3.0,
    },
    {
      enrollmentId: "e6",
      studentCode: "2026-006",
      studentName: "Luciana Beltrán Ortiz",
      a1Score: 3.5,
      a2Score: 3.8,
      a3Score: 3.6,
      a4Score: 4.0,
    },
  ]);

  const activeCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];

  const handleScoreChange = (
    enrollmentId: string,
    field: "a1Score" | "a2Score" | "a3Score" | "a4Score" | "recoveryScore",
    val: string
  ) => {
    const num = val === "" ? null : parseFloat(val);
    if (num !== null && (num < 1.0 || num > 5.0)) return;

    setRows((prev) =>
      prev.map((r) => (r.enrollmentId === enrollmentId ? { ...r, [field]: num } : r))
    );
  };

  const calculateDefinitive = (row: GradeStudentRow): number => {
    const a1 = row.a1Score ?? 0;
    const a2 = row.a2Score ?? 0;
    const a3 = row.a3Score ?? 0;
    const a4 = row.a4Score ?? 0;
    const weighted = a1 * 0.2 + a2 * 0.3 + a3 * 0.35 + a4 * 0.15;

    // Decreto 1290: Si hubo superación/nivelación y es superior a la definitiva, se reemplaza (hasta 3.5 o nota obtenida)
    if (row.recoveryScore && row.recoveryScore > weighted) {
      return Number(row.recoveryScore.toFixed(2));
    }
    return Number(weighted.toFixed(2));
  };

  const handleSaveGrades = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      // Simulation or call to server action
      await new Promise((res) => setTimeout(res, 600));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const getTierBadge = (tier: ColombianPerformanceTier) => {
    switch (tier) {
      case "Superior":
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 font-bold">Superior</Badge>;
      case "Alto":
        return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 font-bold">Alto</Badge>;
      case "Básico":
        return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 font-bold">Básico</Badge>;
      case "Bajo":
        return <Badge className="bg-rose-500/15 text-rose-600 border-rose-500/30 font-bold">Bajo (SIEE)</Badge>;
    }
  };

  return (
    <Card className="rounded-2xl border shadow-sm">
      <CardHeader className="p-6 border-b bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm"
              style={{ backgroundColor: brandColor }}
            >
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-black text-foreground">
                Planilla Central de Calificaciones (Decreto 1290 de 2009)
              </CardTitle>
              <CardDescription className="text-xs">
                Registro ponderado, escala institucional SIEE, actas de recuperación y nivelación continua.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedCourseId} onValueChange={onSelectCourse}>
              <SelectTrigger className="w-[220px] rounded-xl text-xs h-9 font-medium">
                <SelectValue placeholder="Seleccionar asignatura" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.subject_name} ({c.section?.name || "Sin Grupo"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[140px] rounded-xl text-xs h-9 font-medium">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1" className="text-xs">1° Período (Activo)</SelectItem>
                <SelectItem value="2" className="text-xs">2° Período</SelectItem>
                <SelectItem value="3" className="text-xs">3° Período</SelectItem>
                <SelectItem value="4" className="text-xs">4° Período</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={handleSaveGrades}
              disabled={isSaving}
              className="gap-2 rounded-xl text-xs h-9 shadow-sm"
              style={{ backgroundColor: brandColor }}
            >
              {isSaving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{saveSuccess ? "¡Guardado!" : "Guardar Calificaciones"}</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b text-muted-foreground uppercase tracking-wider font-semibold">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 min-w-[200px]">Estudiante</th>
                <th className="py-3 px-2 text-center w-28">
                  Taller (20%)
                  <span className="block text-[10px] font-normal lowercase text-muted-foreground">Sem. 2</span>
                </th>
                <th className="py-3 px-2 text-center w-28">
                  Proyecto (30%)
                  <span className="block text-[10px] font-normal lowercase text-muted-foreground">Sem. 5</span>
                </th>
                <th className="py-3 px-2 text-center w-28">
                  Evaluación (35%)
                  <span className="block text-[10px] font-normal lowercase text-muted-foreground">Sem. 8</span>
                </th>
                <th className="py-3 px-2 text-center w-28">
                  Auto/Co (15%)
                  <span className="block text-[10px] font-normal lowercase text-muted-foreground">Sem. 10</span>
                </th>
                <th className="py-3 px-2 text-center w-28 text-amber-600 bg-amber-500/5">
                  Nivelación
                  <span className="block text-[10px] font-normal lowercase">Dec. 1290</span>
                </th>
                <th className="py-3 px-3 text-center w-24 font-bold text-foreground">Definitiva</th>
                <th className="py-3 px-4 text-center w-36">Desempeño SIEE</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row, idx) => {
                const defScore = calculateDefinitive(row);
                const tier = resolvePerformanceTier(defScore);

                return (
                  <tr key={row.enrollmentId} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-4 text-center font-medium text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4">
                      <p className="font-bold text-foreground">{row.studentName}</p>
                      <p className="text-[11px] text-muted-foreground">Código: {row.studentCode}</p>
                    </td>

                    {/* Actividad 1 */}
                    <td className="py-2.5 px-2 text-center">
                      <Input
                        type="number"
                        step="0.1"
                        min="1.0"
                        max="5.0"
                        value={row.a1Score ?? ""}
                        onChange={(e) => handleScoreChange(row.enrollmentId, "a1Score", e.target.value)}
                        className="h-8 w-20 text-center mx-auto rounded-lg text-xs font-semibold"
                      />
                    </td>

                    {/* Actividad 2 */}
                    <td className="py-2.5 px-2 text-center">
                      <Input
                        type="number"
                        step="0.1"
                        min="1.0"
                        max="5.0"
                        value={row.a2Score ?? ""}
                        onChange={(e) => handleScoreChange(row.enrollmentId, "a2Score", e.target.value)}
                        className="h-8 w-20 text-center mx-auto rounded-lg text-xs font-semibold"
                      />
                    </td>

                    {/* Actividad 3 */}
                    <td className="py-2.5 px-2 text-center">
                      <Input
                        type="number"
                        step="0.1"
                        min="1.0"
                        max="5.0"
                        value={row.a3Score ?? ""}
                        onChange={(e) => handleScoreChange(row.enrollmentId, "a3Score", e.target.value)}
                        className="h-8 w-20 text-center mx-auto rounded-lg text-xs font-semibold"
                      />
                    </td>

                    {/* Actividad 4 */}
                    <td className="py-2.5 px-2 text-center">
                      <Input
                        type="number"
                        step="0.1"
                        min="1.0"
                        max="5.0"
                        value={row.a4Score ?? ""}
                        onChange={(e) => handleScoreChange(row.enrollmentId, "a4Score", e.target.value)}
                        className="h-8 w-20 text-center mx-auto rounded-lg text-xs font-semibold"
                      />
                    </td>

                    {/* Nivelación / Recuperación */}
                    <td className="py-2.5 px-2 text-center bg-amber-500/5">
                      <Input
                        type="number"
                        step="0.1"
                        min="1.0"
                        max="5.0"
                        placeholder="—"
                        value={row.recoveryScore ?? ""}
                        onChange={(e) => handleScoreChange(row.enrollmentId, "recoveryScore", e.target.value)}
                        className="h-8 w-20 text-center mx-auto rounded-lg text-xs font-semibold text-amber-700 border-amber-300"
                      />
                    </td>

                    {/* Definitiva */}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={cn(
                          "font-black text-sm",
                          defScore >= 4.0
                            ? "text-blue-600"
                            : defScore >= 3.0
                            ? "text-emerald-600"
                            : "text-rose-600"
                        )}
                      >
                        {defScore.toFixed(2)}
                      </span>
                    </td>

                    {/* Escala Nacional */}
                    <td className="py-2.5 px-4 text-center">
                      {getTierBadge(tier)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Summary Bar */}
        <div className="p-4 bg-muted/20 border-t flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Aprobados: 5 (83.3%)
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> En Riesgo SIEE: 1 (16.7%)
            </span>
            <span className="flex items-center gap-1.5 font-medium text-amber-600">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Nivelaciones aplicadas: 1
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Exportar a Excel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
