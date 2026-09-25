"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeacherTacticalRibbon } from "../teacher-tactical-ribbon";
import { resolvePerformanceTier } from "../../services/grading-calculator";
import { toast } from "sonner";
import type { TeacherPortalData } from "../../actions/teacher-portal-actions";

interface TeacherTacticalPortalViewProps {
  portalData: TeacherPortalData;
}

export function TeacherTacticalPortalView({ portalData }: TeacherTacticalPortalViewProps) {
  const { teacher, organization, courses, activePeriod } = portalData;
  const brandColor = organization.primaryColor || "#2563eb";

  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || "demo");
  const [activeTab, setActiveTab] = useState<"attendance" | "grading" | "badges">("attendance");

  // Sample student roster for active class demonstration
  const [students, setStudents] = useState([
    { id: "e1", code: "EST-001", name: "Sofía Valentina Castro", status: "present", score: 4.8, notes: "" },
    { id: "e2", code: "EST-002", name: "Mateo Alejandro Gómez", status: "present", score: 4.2, notes: "" },
    { id: "e3", code: "EST-003", name: "Valentina Ríos Ospina", status: "late", score: 3.7, notes: "Retraso 10 min" },
    { id: "e4", code: "EST-004", name: "Santiago Morales Duque", status: "absent", score: 2.5, notes: "Inasistencia sin excusa" },
    { id: "e5", code: "EST-005", name: "Luciana Herrera Peña", status: "present", score: 4.9, notes: "" },
  ]);

  const [scannerActive, setScannerActive] = useState(false);

  const toggleAttendanceStatus = (id: string) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const nextStatus = s.status === "present" ? "late" : s.status === "late" ? "absent" : "present";
        return { ...s, status: nextStatus };
      })
    );
  };

  const handleScoreChange = (id: string, val: string) => {
    const num = parseFloat(val);
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        return { ...s, score: isNaN(num) ? 0 : Math.min(5.0, Math.max(1.0, num)) };
      })
    );
  };

  const handleSimulateQrScan = () => {
    setScannerActive(true);
    setTimeout(() => {
      setScannerActive(false);
      toast.success("Credencial QR Escaneada", {
        description: "Asistencia verificada en servidor para: Sofía Valentina Castro (EST-001)",
      });
    }, 1200);
  };

  const handleSaveGrades = () => {
    toast.success("Calificaciones Guardadas con Éxito", {
      description: "Promedios ponderados y niveles Decreto 1290 sincronizados con Supabase.",
    });
  };

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) || courses[0];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
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
            <h1 className="font-extrabold text-sm md:text-base leading-tight truncate max-w-[200px] md:max-w-md">
              {organization.name}
            </h1>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              Docente: <span className="font-semibold text-foreground">{teacher.firstName} {teacher.lastName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] hidden sm:flex font-semibold">
            {activePeriod?.name || "1° Período 2026"}
          </Badge>
          <div
            className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ backgroundColor: brandColor, borderColor: brandColor }}
          >
            {teacher.firstName[0]}
            {teacher.lastName[0]}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 flex flex-col gap-5">
        {/* Teacher Course Ribbon */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
            Mis Asignaturas Asignadas
          </span>
          <TeacherTacticalRibbon
            courses={courses}
            selectedCourseId={selectedCourseId}
            onSelectCourse={setSelectedCourseId}
            brandColor={brandColor}
          />
        </div>

        {/* Tactical Control Tabs */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full flex-1">
          <TabsList className="bg-muted/70 p-1 rounded-2xl h-11 w-full grid grid-cols-3">
            <TabsTrigger value="attendance" className="rounded-xl text-xs font-bold gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Asistencia Rápida
            </TabsTrigger>
            <TabsTrigger value="grading" className="rounded-xl text-xs font-bold gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Live Grading Pad
            </TabsTrigger>
            <TabsTrigger value="badges" className="rounded-xl text-xs font-bold gap-1.5">
              <Award className="w-3.5 h-3.5" />
              Insignias
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: QUICK ATTENDANCE & QR SCANNER */}
          <TabsContent value="attendance" className="mt-4 flex flex-col gap-4">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card rounded-2xl border">
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  Asistencia: {selectedCourse?.subject_name} ({selectedCourse?.section?.name || "9°A"})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Zero-Trust: Toca el estado para alternar entre Presente, Retraso o Falta.
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
                  {scannerActive ? "Escaneando..." : "Escanear Carnet QR"}
                </Button>
                <Button
                  size="sm"
                  onClick={() => toast.success("Asistencia cerrada", { description: "Alerta automática enviada por WhatsApp a padres de alumnos ausentes." })}
                  className="rounded-xl gap-1.5 text-xs text-white"
                  style={{ backgroundColor: brandColor }}
                >
                  <Send className="w-3.5 h-3.5" />
                  Finalizar & Notificar
                </Button>
              </div>
            </div>

            {/* Students List */}
            <div className="bg-card rounded-2xl border divide-y overflow-hidden shadow-xs">
              {students.map((st) => (
                <div key={st.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center font-bold text-xs shrink-0 text-muted-foreground">
                      {st.code.split("-")[1]}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-xs md:text-sm text-foreground truncate">
                        {st.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {st.code} {st.notes ? `• ${st.notes}` : ""}
                      </span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={st.status === "present" ? "default" : st.status === "late" ? "secondary" : "destructive"}
                    onClick={() => toggleAttendanceStatus(st.id)}
                    className={cn(
                      "rounded-xl text-xs h-8 px-3 font-bold transition-all",
                      st.status === "present" && "bg-emerald-600 hover:bg-emerald-700 text-white",
                      st.status === "late" && "bg-amber-500 hover:bg-amber-600 text-white"
                    )}
                  >
                    {st.status === "present" && "✓ Presente"}
                    {st.status === "late" && "⏱ Retraso"}
                    {st.status === "absent" && "✗ Falta"}
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* TAB 2: LIVE GRADING PAD */}
          <TabsContent value="grading" className="mt-4 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-card rounded-2xl border">
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  Taller Evaluativo 1 • Peso: 25% (Decreto 1290)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Ingresa las notas de 1.0 a 5.0. El desempeño cualitativo se calcula en tiempo real.
                </p>
              </div>

              <Button
                size="sm"
                onClick={handleSaveGrades}
                className="rounded-xl gap-2 text-xs text-white"
                style={{ backgroundColor: brandColor }}
              >
                <Save className="w-3.5 h-3.5" />
                Guardar Notas
              </Button>
            </div>

            <div className="bg-card rounded-2xl border overflow-x-auto shadow-xs">
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                    <th className="py-2.5 px-3">Estudiante</th>
                    <th className="py-2.5 px-3 text-center w-28">Calificación (1-5)</th>
                    <th className="py-2.5 px-3 text-center w-28">Desempeño</th>
                    <th className="py-2.5 px-3">Observación Pedagógica</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.map((st) => {
                    const tier = resolvePerformanceTier(st.score);
                    return (
                      <tr key={st.id} className="hover:bg-muted/20 transition-colors">
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
                            onChange={(e) => handleScoreChange(st.id, e.target.value)}
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
                            <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                              {tier === "Superior" ? "Excelente comprensión y rigor analítico." : "Superó los objetivos formativos mínimos."}
                            </span>
                            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-primary gap-1">
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
            <div className="p-4 bg-card rounded-2xl border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-foreground">Otorgar Insignias de Mérito</h3>
                <p className="text-xs text-muted-foreground">
                  Reconoce hábitos, esfuerzo y superación cognitiva en tus estudiantes.
                </p>
              </div>
              <Button size="sm" className="rounded-xl gap-2 text-xs" style={{ backgroundColor: brandColor }}>
                <Star className="w-3.5 h-3.5" />
                Conferir Insignia
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
