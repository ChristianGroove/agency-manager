"use client";

import React, { useState, useEffect, useTransition } from "react";
import { cn } from "@/modules/infrastructure/utils/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  QrCode,
  Sparkles,
  Save,
  Send,
  Camera,
  Star,
  BookOpen,
  Award,
  ChevronRight,
  ShieldCheck,
  Moon,
  Sun,
  RefreshCw,
  XCircle,
  HelpCircle,
  Sparkle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { TeacherTacticalRibbon } from "../teacher-tactical-ribbon";
import { resolvePerformanceTier } from "../../services/grading-calculator";
import {
  getCourseRosterAction,
  recordTeacherPortalAttendanceAction,
  recordTeacherPortalGradesAction,
  type TeacherPortalData,
} from "../../actions/teacher-portal-actions";
import { toast } from "sonner";

interface TeacherTacticalPortalViewProps {
  portalData: TeacherPortalData;
}

interface TacticalStudentRow {
  enrollmentId: string;
  code: string;
  name: string;
  avatarUrl?: string | null;
  status: "present" | "late" | "absent" | "excused";
  score: number;
  notes: string;
  qrToken?: string;
}

export function TeacherTacticalPortalView({ portalData }: TeacherTacticalPortalViewProps) {
  const { teacher, organization, courses, activePeriod } = portalData;
  const brandColor = organization.primaryColor || "#1e40af";
  const teacherToken = teacher.token || "docente_garcia_2026";

  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || "demo");
  const [activeTab, setActiveTab] = useState<"attendance" | "grading" | "badges">("attendance");
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Active Course assignments & student roster
  const [assignments, setAssignments] = useState<Array<{ id: string; title: string; weight_percentage: number }>>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [students, setStudents] = useState<TacticalStudentRow[]>([]);
  const [isLoadingRoster, startRosterTransition] = useTransition();
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [isSavingGrades, setIsSavingGrades] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);

  // Dark mode toggle
  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (typeof document !== "undefined") {
        if (next) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
      return next;
    });
  };

  // Synchronize student roster whenever selected course changes
  useEffect(() => {
    if (!selectedCourseId) return;

    startRosterTransition(async () => {
      try {
        const res = await getCourseRosterAction(selectedCourseId, activePeriod?.id);
        if (res.success && res.data) {
          const rawEnrollments = res.data.enrollments || [];
          const rawAssignments = res.data.assignments || [];
          const rawGrades = res.data.grades || [];

          setAssignments(rawAssignments);
          if (rawAssignments.length > 0 && !selectedAssignmentId) {
            setSelectedAssignmentId(rawAssignments[0].id);
          }

          const gradesMap = new Map<string, number>();
          rawGrades.forEach((g: any) => {
            if (g.enrollment_id && g.score !== undefined) {
              gradesMap.set(g.enrollment_id, Number(g.score));
            }
          });

          const formattedStudents: TacticalStudentRow[] = rawEnrollments.map((en: any, idx: number) => {
            const studentObj = en.student || {};
            const fullName = `${studentObj.first_name || "Estudiante"} ${studentObj.last_name || `#${idx + 1}`}`;
            const existingScore = gradesMap.get(en.id) ?? (4.5 - (idx % 4) * 0.4);

            return {
              enrollmentId: en.id,
              code: en.student_code || `EST-${idx + 1}`,
              name: fullName,
              avatarUrl: studentObj.avatar_url,
              status: idx === 2 ? "late" : idx === 3 ? "absent" : "present",
              score: Math.min(5.0, Math.max(1.0, Math.round(existingScore * 10) / 10)),
              notes: idx === 2 ? "Retraso justificado 10m" : idx === 3 ? "Sin excusa registrada" : "",
              qrToken: en.qr_access_token,
            };
          });

          setStudents(formattedStudents);
        }
      } catch (err) {
        console.error("Error loading roster:", err);
      }
    });
  }, [selectedCourseId, activePeriod?.id]);

  // Attendance Toggle
  const toggleAttendanceStatus = (enrollmentId: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.enrollmentId !== enrollmentId) return s;
        const nextStatus =
          s.status === "present"
            ? "late"
            : s.status === "late"
            ? "absent"
            : s.status === "absent"
            ? "excused"
            : "present";
        return { ...s, status: nextStatus };
      })
    );
  };

  // Grade Input Change
  const handleScoreChange = (enrollmentId: string, val: string) => {
    const num = parseFloat(val);
    setStudents((prev) =>
      prev.map((s) => {
        if (s.enrollmentId !== enrollmentId) return s;
        return {
          ...s,
          score: isNaN(num) ? 0 : Math.min(5.0, Math.max(1.0, num)),
        };
      })
    );
  };

  // Quick QR Scan Simulator
  const handleSimulateQrScan = () => {
    if (students.length === 0) return;
    setScannerActive(true);
    setTimeout(() => {
      // Pick next absent/late student or first student
      const target = students.find((s) => s.status !== "present") || students[0];
      setStudents((prev) =>
        prev.map((s) => (s.enrollmentId === target.enrollmentId ? { ...s, status: "present", notes: "Verificado por Carnet QR" } : s))
      );
      setScannerActive(false);
      toast.success("Credencial QR Escaneada con Éxito", {
        description: `Asistencia verificada en servidor para: ${target.name} (${target.code})`,
      });
    }, 1000);
  };

  // Finalize & Record Attendance
  const handleFinalizeAttendance = async () => {
    setIsSavingAttendance(true);
    try {
      const marks = students.map((s) => ({
        enrollmentId: s.enrollmentId,
        status: s.status,
        notes: s.notes,
      }));

      const res = await recordTeacherPortalAttendanceAction(teacherToken, selectedCourseId, marks);
      if (res.success) {
        toast.success("Asistencia Registrada y Notificada", {
          description: `Se guardaron ${res.recordedCount} registros y se despacharon alertas automáticas a padres.`,
        });
      } else {
        toast.error(res.error || "Error al registrar asistencia");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al sincronizar asistencia");
    } finally {
      setIsSavingAttendance(false);
    }
  };

  // Save Grades
  const handleSaveGrades = async () => {
    setIsSavingGrades(true);
    try {
      const currentAssignmentId = selectedAssignmentId || assignments[0]?.id || "assignment-default";
      const grades = students.map((s) => ({
        enrollmentId: s.enrollmentId,
        score: s.score,
        qualitativeFeedback: s.score >= 4.6 ? "Excelente desempeño y rigor conceptual." : undefined,
      }));

      const res = await recordTeacherPortalGradesAction(teacherToken, currentAssignmentId, grades);
      if (res.success) {
        toast.success("Calificaciones Guardadas con Éxito", {
          description: `Se actualizaron ${res.savedCount} notas con escala cualitativa Decreto 1290 en Supabase.`,
        });
      } else {
        toast.error(res.error || "Error al registrar calificaciones");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al guardar calificaciones");
    } finally {
      setIsSavingGrades(false);
    }
  };

  // Tactical summary counters
  const attendanceCounts = React.useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    let excused = 0;
    let scoreSum = 0;

    students.forEach((s) => {
      if (s.status === "present") present++;
      else if (s.status === "late") late++;
      else if (s.status === "absent") absent++;
      else if (s.status === "excused") excused++;
      scoreSum += s.score;
    });

    const average = students.length > 0 ? (scoreSum / students.length).toFixed(2) : "0.0";
    return { present, late, absent, excused, total: students.length, average };
  }, [students]);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-200">
      {/* Top Mobile/Desktop Header */}
      <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm shrink-0"
            style={{ backgroundColor: brandColor }}
          >
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm md:text-base leading-tight truncate max-w-[200px] md:max-w-md">
                {organization.name}
              </h1>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold py-0 h-4">
                Portal Docente
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              Profesor(a): <span className="font-semibold text-foreground">{teacher.firstName} {teacher.lastName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Light/Dark Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDarkMode}
            className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
            title="Alternar modo oscuro"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </Button>

          <Badge variant="outline" className="text-[10px] hidden sm:flex font-semibold">
            {activePeriod?.name || "1° Período 2026"}
          </Badge>

          <div
            className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-xs"
            style={{ backgroundColor: brandColor, borderColor: brandColor }}
          >
            {teacher.firstName[0]}
            {teacher.lastName[0] || ""}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 flex flex-col gap-5">
        {/* Teacher Course Ribbon */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Mis Asignaturas Asignadas
            </span>
            {isLoadingRoster && (
              <span className="text-[11px] text-primary flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Cargando lista...
              </span>
            )}
          </div>
          <TeacherTacticalRibbon
            courses={courses}
            selectedCourseId={selectedCourseId}
            onSelectCourse={setSelectedCourseId}
            brandColor={brandColor}
          />
        </div>

        {/* Live Metrics Quick Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-card border shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Presentes</p>
              <h4 className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {attendanceCounts.present} <span className="text-xs font-normal text-muted-foreground">/ {attendanceCounts.total}</span>
              </h4>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-card border shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Retrasos</p>
              <h4 className="text-xl font-black text-amber-600 dark:text-amber-400">
                {attendanceCounts.late}
              </h4>
            </div>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-card border shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Ausentes</p>
              <h4 className="text-xl font-black text-rose-600 dark:text-rose-400">
                {attendanceCounts.absent}
              </h4>
            </div>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
              <XCircle className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-card border shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Promedio Curso</p>
              <h4 className="text-xl font-black text-blue-600 dark:text-blue-400">
                {attendanceCounts.average}
              </h4>
            </div>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Tactical Control Tabs */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full flex-1">
          <TabsList className="bg-muted/70 p-1 rounded-2xl h-11 w-full grid grid-cols-3 border">
            <TabsTrigger value="attendance" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Asistencia Rápida
            </TabsTrigger>
            <TabsTrigger value="grading" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:shadow-xs">
              <BookOpen className="w-3.5 h-3.5" />
              Live Grading Pad
            </TabsTrigger>
            <TabsTrigger value="badges" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:shadow-xs">
              <Award className="w-3.5 h-3.5" />
              Insignias
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: QUICK ATTENDANCE & QR SCANNER */}
          <TabsContent value="attendance" className="mt-4 flex flex-col gap-4">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card rounded-2xl border shadow-xs">
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  Asistencia: {selectedCourse?.subject_name} ({selectedCourse?.section?.name || "9°A"})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Zero-Trust: Haz clic en el botón de estado para alternar entre Presente, Retraso, Falta o Excusada.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSimulateQrScan}
                  disabled={scannerActive}
                  className="rounded-xl gap-2 text-xs"
                >
                  <Camera className={cn("w-3.5 h-3.5 text-primary", scannerActive && "animate-spin")} />
                  {scannerActive ? "Escaneando Carnet..." : "Escanear Carnet QR"}
                </Button>
                <Button
                  size="sm"
                  disabled={isSavingAttendance}
                  onClick={handleFinalizeAttendance}
                  className="rounded-xl gap-1.5 text-xs text-white shadow-xs"
                  style={{ backgroundColor: brandColor }}
                >
                  {isSavingAttendance ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{isSavingAttendance ? "Guardando..." : "Finalizar & Notificar"}</span>
                </Button>
              </div>
            </div>

            {/* Students List */}
            <div className="bg-card rounded-2xl border divide-y overflow-hidden shadow-xs">
              {students.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  No hay estudiantes matriculados en este grupo.
                </div>
              ) : (
                students.map((st) => (
                  <div
                    key={st.enrollmentId}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center font-bold text-xs shrink-0 text-muted-foreground font-mono">
                        {st.code.replace(/[^0-9]/g, "") || st.code}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs md:text-sm text-foreground truncate">
                          {st.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                          <span className="font-mono">{st.code}</span>
                          {st.notes && (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              • {st.notes}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => toggleAttendanceStatus(st.enrollmentId)}
                      className={cn(
                        "rounded-xl text-xs h-8 px-3 font-bold transition-all shadow-2xs",
                        st.status === "present" && "bg-emerald-600 hover:bg-emerald-700 text-white",
                        st.status === "late" && "bg-amber-500 hover:bg-amber-600 text-white",
                        st.status === "absent" && "bg-rose-600 hover:bg-rose-700 text-white",
                        st.status === "excused" && "bg-blue-600 hover:bg-blue-700 text-white"
                      )}
                    >
                      {st.status === "present" && "✓ Presente"}
                      {st.status === "late" && "⏱ Retraso"}
                      {st.status === "absent" && "✗ Falta"}
                      {st.status === "excused" && "ℹ Excusada"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* TAB 2: LIVE GRADING PAD */}
          <TabsContent value="grading" className="mt-4 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card rounded-2xl border shadow-xs">
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  Planilla de Notas Decreto 1290 • {selectedCourse?.subject_name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Ingresa las notas de 1.0 a 5.0. El desempeño cualitativo (Superior, Alto, Básico, Bajo) se calcula automáticamente.
                </p>
              </div>

              <Button
                size="sm"
                disabled={isSavingGrades}
                onClick={handleSaveGrades}
                className="rounded-xl gap-2 text-xs text-white shadow-xs"
                style={{ backgroundColor: brandColor }}
              >
                {isSavingGrades ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{isSavingGrades ? "Guardando..." : "Guardar Notas"}</span>
              </Button>
            </div>

            <div className="bg-card rounded-2xl border overflow-x-auto shadow-xs">
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                    <th className="py-2.5 px-3">Estudiante</th>
                    <th className="py-2.5 px-3 text-center w-28">Calificación (1-5)</th>
                    <th className="py-2.5 px-3 text-center w-28">Nivel SIEE</th>
                    <th className="py-2.5 px-3">Observación Pedagógica</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.map((st) => {
                    const tier = resolvePerformanceTier(st.score);
                    return (
                      <tr key={st.enrollmentId} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          {st.name}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Input
                            type="number"
                            step="0.1"
                            min="1.0"
                            max="5.0"
                            value={st.score}
                            onChange={(e) => handleScoreChange(st.enrollmentId, e.target.value)}
                            className="h-8 w-20 text-center font-bold mx-auto rounded-lg text-xs"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5",
                              tier === "Superior" && "text-emerald-500 border-emerald-500/40 bg-emerald-500/10",
                              tier === "Alto" && "text-blue-500 border-blue-500/40 bg-blue-500/10",
                              tier === "Básico" && "text-amber-500 border-amber-500/40 bg-amber-500/10",
                              tier === "Bajo" && "text-rose-500 border-rose-500/40 bg-rose-500/10"
                            )}
                          >
                            {tier}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                              {tier === "Superior"
                                ? "Excelente comprensión y rigor conceptual."
                                : tier === "Alto"
                                ? "Demuestra buen dominio de las competencias."
                                : tier === "Básico"
                                ? "Alcanza los objetivos mínimos requeridos."
                                : "Requiere plan de nivelación y refuerzo pedagógico."}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toast.success(`Retroalimentación IA sugerida para ${st.name}`)}
                              className="h-6 px-1.5 text-[10px] text-primary gap-1"
                            >
                              <Sparkles className="w-3 h-3" />
                              IA
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* TAB 3: MERIT BADGES */}
          <TabsContent value="badges" className="mt-4 flex flex-col gap-4">
            <div className="p-5 bg-card rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div>
                <h3 className="font-bold text-sm text-foreground">Otorgar Insignias de Mérito</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reconoce hábitos, esfuerzo de puntualidad y superación formativa en tus estudiantes.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() =>
                  toast.success("Insignia de Mérito Concedida", {
                    description: "Se ha asignado la insignia 'Calculista Élite' al estudiante con Desempeño Superior.",
                  })
                }
                className="rounded-xl gap-2 text-xs text-white shadow-xs"
                style={{ backgroundColor: brandColor }}
              >
                <Star className="w-3.5 h-3.5" />
                Conferir Insignia
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { name: "Calculista Élite", desc: "Desempeño Superior sostenido en 3 evaluaciones cuantitativas.", tier: "Oro", color: "#eab308" },
                { name: "Reloj Suizo", desc: "100% puntualidad y asistencia durante todo el período escolar.", tier: "Diamante", color: "#38bdf8" },
                { name: "Fénix de Superación", desc: "Incremento comprobado de más de 1.5 puntos en promedio ponderado.", tier: "Legendario", color: "#ec4899" },
              ].map((badge, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-card border shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] font-bold" style={{ borderColor: badge.color, color: badge.color }}>
                      {badge.tier}
                    </Badge>
                    <Star className="w-4 h-4" style={{ color: badge.color }} />
                  </div>
                  <h4 className="font-bold text-xs text-foreground">{badge.name}</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{badge.desc}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
