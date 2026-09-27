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
  FileSpreadsheet,
  CalendarDays,
  Scale,
  ShieldAlert,
  Accessibility,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeacherTacticalRibbon } from "./teacher-tactical-ribbon";
import { SchoolPacingMatrix } from "./school-pacing-matrix";
import { SchoolBadgeCard } from "./school-badge-card";
import { SchoolCredentialsGeneratorModal } from "./school-credentials-generator-modal";
import { SchoolGradesSheetView } from "./school-grades-sheet-view";
import { SchoolSchedulesGridView } from "./school-schedules-grid-view";
import { SchoolConvivenciaObserverView } from "./school-convivencia-observer-view";
import { SchoolBulletinsCredentialsView } from "./school-bulletins-credentials-view";
import { SchoolTuitionTreasuryView } from "./school-tuition-treasury-view";
import type { SchoolCourse, SchoolBadge } from "../types/school.types";

interface SchoolDashboardViewProps {
  organizationName?: string;
  brandColor?: string;
  courses?: SchoolCourse[];
  badges?: SchoolBadge[];
  initialTab?: string;
}

export function SchoolDashboardView({
  organizationName = "Colegio Campestre Británico",
  brandColor = "#2563eb",
  courses = [],
  badges = [],
  initialTab = "dashboard",
}: SchoolDashboardViewProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || "demo-c1");

  // Fallback Courses if empty for immediate live experience
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

  // Fallback Badges
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

  // Pacing Rows for 10-week Sprint Matrix
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
              Año Lectivo 2026 • 1° Período Académico (Decreto 1290 / Ley 115 / Ley 1620 / Decreto 1421)
            </p>
          </div>
        </div>

        {/* Global Action Hub Buttons */}
        <div className="flex items-center gap-2.5">
          <SchoolCredentialsGeneratorModal
            schoolName={organizationName}
            academicYear="2026"
            students={[]}
          />
          <Button
            onClick={() => setActiveTab("grades")}
            className="gap-2 rounded-xl shadow-sm text-xs font-bold"
            style={{ backgroundColor: brandColor }}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Planilla de Notas</span>
          </Button>
        </div>
      </div>

      {/* Master 7-Pillar Sub-router Navigation Hub */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto pb-1">
          <TabsList className="bg-muted/60 p-1.5 rounded-2xl h-auto flex gap-1.5 min-w-max border">
            {/* 1. Dashboard */}
            <TabsTrigger value="dashboard" className="rounded-xl text-xs font-bold gap-2 py-2 px-3.5 data-[state=active]:shadow-sm">
              <TrendingUp className="w-3.5 h-3.5" />
              1. Dashboard SIEE
            </TabsTrigger>

            {/* 2. Curriculum & Pacing */}
            <TabsTrigger value="curriculum" className="rounded-xl text-xs font-bold gap-2 py-2 px-3.5 data-[state=active]:shadow-sm">
              <Calendar className="w-3.5 h-3.5" />
              2. Plan de Estudios & Ritmo
            </TabsTrigger>

            {/* 3. Grades Sheet */}
            <TabsTrigger value="grades" className="rounded-xl text-xs font-bold gap-2 py-2 px-3.5 data-[state=active]:shadow-sm">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              3. Planilla Notas (Dec. 1290)
            </TabsTrigger>

            {/* 4. Weekly Schedules */}
            <TabsTrigger value="schedules" className="rounded-xl text-xs font-bold gap-2 py-2 px-3.5 data-[state=active]:shadow-sm">
              <CalendarDays className="w-3.5 h-3.5" />
              4. Horarios Escolares
            </TabsTrigger>

            {/* 5. Observer & Convivencia */}
            <TabsTrigger value="convivencia" className="rounded-xl text-xs font-bold gap-2 py-2 px-3.5 data-[state=active]:shadow-sm">
              <Scale className="w-3.5 h-3.5" />
              5. Observador & Convivencia
            </TabsTrigger>

            {/* 6. Bulletins & Credentials */}
            <TabsTrigger value="bulletins" className="rounded-xl text-xs font-bold gap-2 py-2 px-3.5 data-[state=active]:shadow-sm">
              <FileText className="w-3.5 h-3.5" />
              6. Boletines & Carnets CR80
            </TabsTrigger>

            {/* 7. Tuition Treasury */}
            <TabsTrigger value="treasury" className="rounded-xl text-xs font-bold gap-2 py-2 px-3.5 data-[state=active]:shadow-sm">
              <CreditCard className="w-3.5 h-3.5" />
              7. Tesorería Escolar
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ============================================================== */}
        {/* VIEW 1: DASHBOARD / TELEMETRÍA SIEE */}
        {/* ============================================================== */}
        <TabsContent value="dashboard" className="mt-4 flex flex-col gap-6">
          {/* KPI Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                Portal Docente Táctico • Asignaturas en Curso
              </span>
              <span
                onClick={() => setActiveTab("curriculum")}
                className="text-xs text-primary font-medium cursor-pointer hover:underline flex items-center gap-1"
              >
                Ver Plan de Estudios <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <TeacherTacticalRibbon
              courses={displayCourses}
              selectedCourseId={selectedCourseId}
              onSelectCourse={setSelectedCourseId}
              brandColor={brandColor}
            />
          </div>

          {/* Quick Pillar Jump Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card
              onClick={() => setActiveTab("grades")}
              className="rounded-2xl border shadow-sm p-5 hover:border-primary/50 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-bold text-sm text-foreground mt-3">Planilla Decreto 1290</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Registro masivo de calificaciones, autoevaluación y actas de nivelación periódica.
              </p>
            </Card>

            <Card
              onClick={() => setActiveTab("convivencia")}
              className="rounded-2xl border shadow-sm p-5 hover:border-primary/50 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <Scale className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-bold text-sm text-foreground mt-3">Observador & Convivencia</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Expediente Ley 115, comités Ley 1620 y adaptaciones curriculares PIAR Decreto 1421.
              </p>
            </Card>

            <Card
              onClick={() => setActiveTab("bulletins")}
              className="rounded-2xl border shadow-sm p-5 hover:border-primary/50 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-bold text-sm text-foreground mt-3">Boletines & Carnets CR80</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Generador de PDF marca blanca con verificación QR y carnets en lote PVC.
              </p>
            </Card>
          </div>
        </TabsContent>

        {/* ============================================================== */}
        {/* VIEW 2: PLAN DE ESTUDIOS & RITMO */}
        {/* ============================================================== */}
        <TabsContent value="curriculum" className="mt-4 flex flex-col gap-6">
          <SchoolPacingMatrix
            periodName="1° Período (10 Semanas)"
            rows={pacingRows}
            brandColor={brandColor}
          />

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

        {/* ============================================================== */}
        {/* VIEW 3: PLANILLA DE CALIFICACIONES DECRETO 1290 */}
        {/* ============================================================== */}
        <TabsContent value="grades" className="mt-4">
          <SchoolGradesSheetView
            courses={displayCourses}
            selectedCourseId={selectedCourseId}
            onSelectCourse={setSelectedCourseId}
            brandColor={brandColor}
          />
        </TabsContent>

        {/* ============================================================== */}
        {/* VIEW 4: HORARIOS ESCOLARES SEMANALES */}
        {/* ============================================================== */}
        <TabsContent value="schedules" className="mt-4">
          <SchoolSchedulesGridView
            courses={displayCourses}
            brandColor={brandColor}
          />
        </TabsContent>

        {/* ============================================================== */}
        {/* VIEW 5: OBSERVADOR, CONVIVENCIA & PIAR */}
        {/* ============================================================== */}
        <TabsContent value="convivencia" className="mt-4">
          <SchoolConvivenciaObserverView
            brandColor={brandColor}
          />
        </TabsContent>

        {/* ============================================================== */}
        {/* VIEW 6: BOLETINES & CARNETIZACIÓN */}
        {/* ============================================================== */}
        <TabsContent value="bulletins" className="mt-4">
          <SchoolBulletinsCredentialsView
            organizationName={organizationName}
            brandColor={brandColor}
          />
        </TabsContent>

        {/* ============================================================== */}
        {/* VIEW 7: TESORERÍA ESCOLAR & WOMPI */}
        {/* ============================================================== */}
        <TabsContent value="treasury" className="mt-4">
          <SchoolTuitionTreasuryView
            brandColor={brandColor}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
