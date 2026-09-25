"use client";

import React, { useState } from "react";
import { cn } from "@/modules/infrastructure/utils/utils";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Users,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  QrCode,
  FileText,
  Award,
  BookOpen,
  Plus,
  Send,
  Sparkles,
  Printer,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeacherTacticalRibbon } from "./teacher-tactical-ribbon";
import { SchoolPacingMatrix } from "./school-pacing-matrix";
import { SchoolBadgeCard } from "./school-badge-card";
import { SchoolCredentialsGeneratorModal } from "./school-credentials-generator-modal";
import type { SchoolCourse, SchoolBadge } from "../types/school.types";

interface SchoolDashboardViewProps {
  organizationName?: string;
  brandColor?: string;
  courses?: SchoolCourse[];
  badges?: SchoolBadge[];
}

export function SchoolDashboardView({
  organizationName = "Colegio Campestre Británico",
  brandColor = "#2563eb",
  courses = [],
  badges = [],
}: SchoolDashboardViewProps) {
  const [activeTab, setActiveTab] = useState("pacing");
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || "demo-c1");

  // Mock Fallback Courses if empty for immediate demo rendering
  const displayCourses: SchoolCourse[] = courses.length > 0 ? courses : [
    {
      id: "demo-c1",
      organization_id: "org-1",
      section_id: "sec-9a",
      area_id: "area-math",
      subject_name: "Álgebra y Trigonometría",
      lead_teacher_id: "t-1",
      weekly_hours: 5,
      area_weight_percentage: 60,
      color: brandColor,
      section: {
        id: "sec-9a",
        organization_id: "org-1",
        grade_id: "g-9",
        name: "9°A",
        max_capacity: 35,
      },
      lead_teacher: {
        id: "t-1",
        first_name: "Alberto",
        last_name: "García",
        email: "alberto.garcia@colegio.edu.co",
      },
    },
    {
      id: "demo-c2",
      organization_id: "org-1",
      section_id: "sec-9a",
      area_id: "area-sci",
      subject_name: "Física Mecánica",
      lead_teacher_id: "t-2",
      weekly_hours: 4,
      area_weight_percentage: 100,
      color: "#059669",
      section: {
        id: "sec-9a",
        organization_id: "org-1",
        grade_id: "g-9",
        name: "9°A",
        max_capacity: 35,
      },
      lead_teacher: {
        id: "t-2",
        first_name: "Claudia",
        last_name: "Mendoza",
        email: "claudia.mendoza@colegio.edu.co",
      },
    },
    {
      id: "demo-c3",
      organization_id: "org-1",
      section_id: "sec-10b",
      area_id: "area-eng",
      subject_name: "English Literature",
      lead_teacher_id: "t-3",
      weekly_hours: 6,
      area_weight_percentage: 100,
      color: "#7c3aed",
      section: {
        id: "sec-10b",
        organization_id: "org-1",
        grade_id: "g-10",
        name: "10°B",
        max_capacity: 32,
      },
      lead_teacher: {
        id: "t-3",
        first_name: "Sarah",
        last_name: "Jenkins",
        email: "sarah.j@colegio.edu.co",
      },
    },
  ];

  // Mock Fallback Badges if empty
  const displayBadges: SchoolBadge[] = badges.length > 0 ? badges : [
    {
      id: "b-1",
      organization_id: "org-1",
      name: "Calculista Élite",
      description: "Desempeño Superior sostenido en 3 evaluaciones cuantitativas consecutivas.",
      category: "academic",
      tier: "gold",
      beam_color: "#eab308",
      is_active: true,
    },
    {
      id: "b-2",
      organization_id: "org-1",
      name: "Reloj Suizo",
      description: "100% de asistencia y puntualidad perfecta durante todo el período escolar.",
      category: "habits",
      tier: "diamond",
      beam_color: "#38bdf8",
      is_active: true,
    },
    {
      id: "b-3",
      organization_id: "org-1",
      name: "Fénix de Superación",
      description: "Incremento comprobado de más de 1.5 puntos en promedio ponderado.",
      category: "academic",
      tier: "legendary",
      beam_color: "#ec4899",
      is_active: true,
    },
    {
      id: "b-4",
      organization_id: "org-1",
      name: "Líder Colaborativo",
      description: "Reconocido por pares y docentes por apoyo solidario en proyectos de equipo.",
      category: "leadership",
      tier: "silver",
      beam_color: "#94a3b8",
      is_active: true,
    },
  ];

  // Mock Pacing Rows
  const pacingRows = displayCourses.map((c, idx) => ({
    course: c,
    weeklyStatus: {
      1: "completed" as const,
      2: "completed" as const,
      3: "completed" as const,
      4: "completed" as const,
      5: idx === 1 ? ("delayed" as const) : ("completed" as const),
      6: "in_progress" as const,
      7: "planned" as const,
      8: "planned" as const,
      9: "planned" as const,
      10: "planned" as const,
    },
    assignmentsByWeek: {
      1: [{ id: "a1", course_id: c.id, period_id: "p1", title: "Taller Diagnóstico", weight_percentage: 10, due_date: "", grading_type: "numeric" as const, created_by_teacher_id: "", organization_id: "" }],
      3: [{ id: "a2", course_id: c.id, period_id: "p1", title: "Laboratorio Práctico", weight_percentage: 20, due_date: "", grading_type: "numeric" as const, created_by_teacher_id: "", organization_id: "" }],
      5: [{ id: "a3", course_id: c.id, period_id: "p1", title: "Evaluación Sumativa 1", weight_percentage: 25, due_date: "", grading_type: "numeric" as const, created_by_teacher_id: "", organization_id: "" }],
    },
    averageProgress: idx === 1 ? 50 : 65,
  }));

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-[1600px] mx-auto w-full">
      {/* Top Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card p-6 rounded-3xl border shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white shadow-md"
            style={{ backgroundColor: brandColor }}
          >
            <GraduationCap className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-foreground">
                {organizationName}
              </h1>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold">
                Pixy Edu AOS
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Año Lectivo 2026 • 1° Período Académico (Decreto 1290 / Ley 115)
            </p>
          </div>
        </div>

        {/* Action Hub Buttons */}
        <div className="flex items-center gap-2.5">
          <SchoolCredentialsGeneratorModal
            schoolName={organizationName}
            academicYear="2026"
            students={[]}
          />
          <Button className="gap-2 rounded-xl" style={{ backgroundColor: brandColor }}>
            <Plus className="w-4 h-4" />
            <span>Nueva Actividad</span>
          </Button>
        </div>
      </div>

      {/* KPI Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Students */}
        <Card className="rounded-2xl shadow-sm border">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Estudiantes</p>
              <h3 className="text-2xl font-black text-foreground mt-1">482</h3>
              <p className="text-[11px] text-emerald-500 font-medium mt-1">100% matriculados</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Faculty */}
        <Card className="rounded-2xl shadow-sm border">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Docentes</p>
              <h3 className="text-2xl font-black text-foreground mt-1">34</h3>
              <p className="text-[11px] text-muted-foreground mt-1">32 cursos activos</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Attendance Today */}
        <Card className="rounded-2xl shadow-sm border">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Asistencia Hoy</p>
              <h3 className="text-2xl font-black text-foreground mt-1">96.4%</h3>
              <p className="text-[11px] text-emerald-500 font-medium mt-1">Zero-Trust QR Gate</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Tuition Recaudo */}
        <Card className="rounded-2xl shadow-sm border">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Cobranza Pensión</p>
              <h3 className="text-2xl font-black text-foreground mt-1">88.5%</h3>
              <p className="text-[11px] text-muted-foreground mt-1">Wompi + WhatsApp HSM</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Early Warning Radar */}
        <Card className="rounded-2xl shadow-sm border">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Alerta Temprana</p>
              <h3 className="text-2xl font-black text-rose-500 mt-1">4</h3>
              <p className="text-[11px] text-rose-500 font-medium mt-1">Riesgo de rezago SIEE</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teacher Tactical Ribbon */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Cursos Asignados al Docente (Portal Táctico)
          </span>
          <span className="text-xs text-primary font-medium cursor-pointer hover:underline">
            Ver todas las asignaturas
          </span>
        </div>
        <TeacherTacticalRibbon
          courses={displayCourses}
          selectedCourseId={selectedCourseId}
          onSelectCourse={setSelectedCourseId}
          brandColor={brandColor}
        />
      </div>

      {/* Main Feature Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/60 p-1 rounded-2xl h-11">
          <TabsTrigger value="pacing" className="rounded-xl text-xs font-bold gap-2">
            <Calendar className="w-3.5 h-3.5" />
            Matriz de Ritmo Curricular
          </TabsTrigger>
          <TabsTrigger value="badges" className="rounded-xl text-xs font-bold gap-2">
            <Award className="w-3.5 h-3.5" />
            Insignias & Gamificación
          </TabsTrigger>
          <TabsTrigger value="bulletins" className="rounded-xl text-xs font-bold gap-2">
            <FileText className="w-3.5 h-3.5" />
            Boletines Decreto 1290
          </TabsTrigger>
          <TabsTrigger value="billing" className="rounded-xl text-xs font-bold gap-2">
            <CreditCard className="w-3.5 h-3.5" />
            Cobranza WhatsApp & Wompi
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Pacing Matrix */}
        <TabsContent value="pacing" className="mt-4">
          <SchoolPacingMatrix
            periodName="1° Período (10 Semanas)"
            rows={pacingRows}
            brandColor={brandColor}
          />
        </TabsContent>

        {/* Tab 2: Badges & Gamification */}
        <TabsContent value="badges" className="mt-4">
          <div className="flex flex-col gap-4 bg-card p-6 rounded-2xl border">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-foreground">
                  Catálogo de Insignias de Rendimiento y Mérito
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reconocimiento neuro-pedagógico para celebrar la excelencia, hábitos de puntualidad y superación.
                </p>
              </div>
              <Button size="sm" variant="outline" className="gap-2 rounded-xl">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Nueva Insignia</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-2">
              {displayBadges.map((badge) => (
                <SchoolBadgeCard key={badge.id} badge={badge} earnedCount={14} />
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Bulletins */}
        <TabsContent value="bulletins" className="mt-4">
          <Card className="rounded-2xl border">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold">
                    Generador de Boletines Ejecutivos en PDF Marca Blanca
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Cumplimiento Decreto 1290, escalas valorativas nacionales, gráficos de radar y verificación por QR anti-falsificación.
                  </CardDescription>
                </div>
                <Button className="gap-2 rounded-xl" style={{ backgroundColor: brandColor }}>
                  <Send className="w-4 h-4" />
                  <span>Despacho Masivo por WhatsApp (482 PDFs)</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="p-4 bg-muted/40 rounded-xl border border-dashed flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">
                      Boletín Oficial 1° Período • Grado 9°A (32 Estudiantes)
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Paz y salvo verificado: 30 habilitados para descarga directa. 2 en retención financiera.
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="rounded-lg">
                  Previsualizar Muestra
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Billing Hub */}
        <TabsContent value="billing" className="mt-4">
          <Card className="rounded-2xl border">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold">
                    Cobranza Conversacional Mensual de Pensiones
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Disparo de órdenes de pago mediante Meta WhatsApp Cloud API con pasarela Wompi integrada.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-emerald-500 border-emerald-500 font-bold">
                  Canal Meta Verificado
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <div className="p-4 bg-emerald-950/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm text-foreground">
                      Ciclo de Cobranza: Septiembre 2026
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      440 de 482 acudientes han cancelado puntualmente por PSE/Nequi.
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-2 rounded-lg text-xs">
                    <Send className="w-3.5 h-3.5 text-emerald-500" />
                    Reenviar Recordatorio a 42 en Mora
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
