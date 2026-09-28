"use client";

import React, { useState, useEffect, useMemo } from "react";
import { SectionHeader } from "@/components/layout/section-header";
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
  ChevronDown,
  TrendingUp,
  FileSpreadsheet,
  CalendarDays,
  Scale,
  ShieldAlert,
  Accessibility,
  ArrowRight,
  HeartHandshake,
  Share2,
  Globe,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { TeacherTacticalRibbon } from "./teacher-tactical-ribbon";
import { SchoolPacingMatrix } from "./school-pacing-matrix";
import { SchoolBadgeCard } from "./school-badge-card";
import { SchoolCredentialsGeneratorModal } from "./school-credentials-generator-modal";
import { SchoolGradesSheetView } from "./school-grades-sheet-view";
import { SchoolSchedulesGridView } from "./school-schedules-grid-view";
import { SchoolConvivenciaObserverView } from "./school-convivencia-observer-view";
import { SchoolBulletinsCredentialsView } from "./school-bulletins-credentials-view";
import { SchoolTuitionTreasuryView } from "./school-tuition-treasury-view";
import { SchoolDirectoryView } from "./school-directory-view";
import { SchoolPortalsDistributionView } from "./school-portals-distribution-view";
import type {
  SchoolCourse,
  SchoolBadge,
  SchoolStudentWithDetails,
  SchoolStaffMember,
  SchoolGuardian,
  SchoolSection,
} from "../types/school.types";

interface SchoolDashboardViewProps {
  organizationName?: string;
  brandColor?: string;
  courses?: SchoolCourse[];
  badges?: SchoolBadge[];
  initialTab?: string;
  directoryStudents?: SchoolStudentWithDetails[];
  directoryStaff?: SchoolStaffMember[];
  directoryGuardians?: SchoolGuardian[];
  directorySections?: SchoolSection[];
}

export function SchoolDashboardView({
  organizationName = "Colegio Bilingüe San Mateo 2026",
  brandColor = "#1e40af",
  courses = [],
  badges = [],
  initialTab = "dashboard",
  directoryStudents = [],
  directoryStaff = [],
  directoryGuardians = [],
  directorySections = [],
}: SchoolDashboardViewProps) {
  const resolveTabState = (tab?: string) => {
    const raw = (tab || "dashboard").toLowerCase();
    if (raw === "docentes") {
      return { tab: "directory", subTab: "observer" as const, dirTab: "staff" as const };
    }
    if (raw === "acudientes") {
      return { tab: "directory", subTab: "observer" as const, dirTab: "guardians" as const };
    }
    if (
      raw === "directory" ||
      raw === "directorio" ||
      raw === "personas" ||
      raw === "estudiantes"
    ) {
      return { tab: "directory", subTab: "observer" as const, dirTab: "students" as const };
    }
    if (
      raw === "portals" ||
      raw === "portales" ||
      raw === "accesos" ||
      raw === "links" ||
      raw === "distribucion"
    ) {
      return { tab: "portals", subTab: "observer" as const, dirTab: "students" as const };
    }
    if (raw === "curriculum" || raw === "pacing" || raw === "ritmo" || raw === "plan") {
      return { tab: "curriculum", subTab: "observer" as const, dirTab: "students" as const };
    }
    if (raw === "grades" || raw === "calificaciones" || raw === "notas" || raw === "planilla") {
      return { tab: "grades", subTab: "observer" as const, dirTab: "students" as const };
    }
    if (raw === "schedules" || raw === "horarios" || raw === "horario") {
      return { tab: "schedules", subTab: "observer" as const, dirTab: "students" as const };
    }
    if (raw === "observer" || raw === "observador") {
      return { tab: "convivencia", subTab: "observer" as const, dirTab: "students" as const };
    }
    if (raw === "convivencia" || raw === "comite" || raw === "incidents") {
      return { tab: "convivencia", subTab: "convivencia" as const, dirTab: "students" as const };
    }
    if (raw === "piar" || raw === "inclusion") {
      return { tab: "convivencia", subTab: "piar" as const, dirTab: "students" as const };
    }
    if (raw === "bulletins" || raw === "boletines" || raw === "carnets" || raw === "carnet") {
      return { tab: "bulletins", subTab: "observer" as const, dirTab: "students" as const };
    }
    if (raw === "treasury" || raw === "tesoreria" || raw === "pensiones" || raw === "cobranza") {
      return { tab: "treasury", subTab: "observer" as const, dirTab: "students" as const };
    }
    return { tab: "dashboard", subTab: "observer" as const, dirTab: "students" as const };
  };

  const initialResolved = resolveTabState(initialTab);
  const [activeTab, setActiveTab] = useState(initialResolved.tab);
  const [convivenciaSubTab, setConvivenciaSubTab] = useState<"observer" | "convivencia" | "piar">(
    initialResolved.subTab
  );

  // Fallback Courses if empty for immediate live experience
  const displayCourses: SchoolCourse[] =
    courses.length > 0
      ? courses
      : [
          {
            id: "22222222-aaaa-bbbb-cccc-000000000001",
            organization_id: "a1111111-2222-3333-4444-555555555555",
            section_id: "e1111111-2222-3333-4444-555555555555",
            area_id: "11111111-aaaa-bbbb-cccc-000000000001",
            subject_name: "Álgebra y Trigonometría",
            lead_teacher_id: "f1111111-2222-3333-4444-555555555555",
            weekly_hours: 5,
            area_weight_percentage: 100,
            color: brandColor,
            section: {
              id: "e1111111-2222-3333-4444-555555555555",
              organization_id: "a1111111-2222-3333-4444-555555555555",
              grade_id: "d1111111-2222-3333-4444-555555555555",
              name: "9°A",
              max_capacity: 35,
            },
            lead_teacher: {
              id: "f1111111-2222-3333-4444-555555555555",
              first_name: "Alberto",
              last_name: "García",
              email: "alberto.garcia@sanmateo.edu.co",
            },
          },
          {
            id: "22222222-aaaa-bbbb-cccc-000000000002",
            organization_id: "a1111111-2222-3333-4444-555555555555",
            section_id: "e1111111-2222-3333-4444-555555555555",
            area_id: "11111111-aaaa-bbbb-cccc-000000000002",
            subject_name: "Lengua Castellana y Literatura",
            lead_teacher_id: "f2222222-2222-3333-4444-555555555555",
            weekly_hours: 4,
            area_weight_percentage: 100,
            color: "#059669",
            section: {
              id: "e1111111-2222-3333-4444-555555555555",
              organization_id: "a1111111-2222-3333-4444-555555555555",
              grade_id: "d1111111-2222-3333-4444-555555555555",
              name: "9°A",
              max_capacity: 35,
            },
            lead_teacher: {
              id: "f2222222-2222-3333-4444-555555555555",
              first_name: "Elena",
              last_name: "Rodríguez",
              email: "elena.rodriguez@sanmateo.edu.co",
            },
          },
        ];

  const [selectedCourseId, setSelectedCourseId] = useState(displayCourses[0]?.id || "demo-c1");

  // Fallback Sections if empty
  const displaySections: SchoolSection[] =
    directorySections.length > 0
      ? directorySections
      : [
          {
            id: "e1111111-2222-3333-4444-555555555555",
            organization_id: "a1111111-2222-3333-4444-555555555555",
            grade_id: "d1111111-2222-3333-4444-555555555555",
            name: "9°A",
            max_capacity: 35,
            classroom_location: "Edificio Los Robles - Aula 302",
            grade: {
              id: "d1111111-2222-3333-4444-555555555555",
              organization_id: "a1111111-2222-3333-4444-555555555555",
              name: "Noveno Grado",
              short_name: "9°",
              level: "secondary",
              order_index: 9,
            },
          },
          {
            id: "e2222222-2222-3333-4444-555555555555",
            organization_id: "a1111111-2222-3333-4444-555555555555",
            grade_id: "d2222222-2222-3333-4444-555555555555",
            name: "10°B",
            max_capacity: 32,
            classroom_location: "Edificio Los Robles - Aula 401",
            grade: {
              id: "d2222222-2222-3333-4444-555555555555",
              organization_id: "a1111111-2222-3333-4444-555555555555",
              name: "Décimo Grado",
              short_name: "10°",
              level: "high_school",
              order_index: 10,
            },
          },
        ];

  // Fallback Badges if empty
  const fallbackBadges: SchoolBadge[] = [
    {
      id: "badge-1",
      organization_id: "a1111111-2222-3333-4444-555555555555",
      name: "Excelencia Matemática",
      description: "Dominio de razonamiento abstracto y resolución de problemas.",
      category: "academic",
      tier: "gold",
      beam_color: "#eab308",
      is_active: true,
    },
    {
      id: "badge-2",
      organization_id: "a1111111-2222-3333-4444-555555555555",
      name: "Puntualidad Impecable",
      description: "100% de asistencia y puntualidad durante el periodo académico.",
      category: "habits",
      tier: "diamond",
      beam_color: "#38bdf8",
      is_active: true,
    },
    {
      id: "badge-3",
      organization_id: "a1111111-2222-3333-4444-555555555555",
      name: "Liderazgo Ciudadano",
      description: "Aporte activo a la convivencia escolar y resolución constructiva de conflictos.",
      category: "leadership",
      tier: "legendary",
      beam_color: "#ec4899",
      is_active: true,
    },
  ];

  const displayBadges: SchoolBadge[] = badges.length > 0 ? badges : fallbackBadges;

  // Fallback Guardians
  const fallbackGuardians: SchoolGuardian[] = [
    {
      id: "g-1",
      organization_id: "a1111111-2222-3333-4444-555555555555",
      student_id: "33333333-aaaa-bbbb-cccc-000000000001",
      first_name: "Martha",
      last_name: "Castro Ríos",
      relationship: "mother",
      document_type: "CC",
      document_number: "52345678",
      phone: "+57 315 789 4561",
      email: "martha.castro@empresa.com",
      is_financial_responsible: true,
      is_primary_contact: true,
      is_emergency_contact: true,
      student: {
        id: "33333333-aaaa-bbbb-cccc-000000000001",
        first_name: "Sofía Valentina",
        last_name: "Castro",
      },
    },
    {
      id: "g-2",
      organization_id: "a1111111-2222-3333-4444-555555555555",
      student_id: "33333333-aaaa-bbbb-cccc-000000000002",
      first_name: "Carlos",
      last_name: "Gómez Montoya",
      relationship: "father",
      document_type: "CC",
      document_number: "79456123",
      phone: "+57 310 456 1234",
      email: "carlos.gomez@empresa.com",
      is_financial_responsible: true,
      is_primary_contact: true,
      is_emergency_contact: true,
      student: {
        id: "33333333-aaaa-bbbb-cccc-000000000002",
        first_name: "Mateo Alejandro",
        last_name: "Gómez",
      },
    },
    {
      id: "g-3",
      organization_id: "a1111111-2222-3333-4444-555555555555",
      student_id: "33333333-aaaa-bbbb-cccc-000000000003",
      first_name: "Clara",
      last_name: "Ospina Velásquez",
      relationship: "mother",
      document_type: "CC",
      document_number: "41987654",
      phone: "+57 320 987 6543",
      email: "clara.ospina@gmail.com",
      is_financial_responsible: true,
      is_primary_contact: true,
      is_emergency_contact: true,
      student: {
        id: "33333333-aaaa-bbbb-cccc-000000000003",
        first_name: "Valentina",
        last_name: "Ríos Ospina",
      },
    },
  ];

  // Fallback Students if empty
  const fallbackStudents: SchoolStudentWithDetails[] = [
    {
      id: "44444444-aaaa-bbbb-cccc-000000000001",
      organization_id: "a1111111-2222-3333-4444-555555555555",
      student_id: "33333333-aaaa-bbbb-cccc-000000000001",
      student_code: "EST-2026-001",
      status: "active",
      qr_access_token: "estudiante_sofia_2026",
      first_name: "Sofía Valentina",
      last_name: "Castro",
      email: "est-2026-001@sanmateo.edu.co",
      phone: "+57 315 789 4561",
      blood_type: "O+",
      eps: "Sura",
      emergency_phone: "+57 315 789 4561",
      section_id: "e1111111-2222-3333-4444-555555555555",
      section_name: "9°A",
      grade_name: "Noveno Grado",
      academic_year_name: "2026",
      guardians: [fallbackGuardians[0]],
      primary_guardian: fallbackGuardians[0],
      financial_guardian: fallbackGuardians[0],
    },
    {
      id: "44444444-aaaa-bbbb-cccc-000000000002",
      organization_id: "a1111111-2222-3333-4444-555555555555",
      student_id: "33333333-aaaa-bbbb-cccc-000000000002",
      student_code: "EST-2026-002",
      status: "active",
      qr_access_token: "estudiante_mateo_2026",
      first_name: "Mateo Alejandro",
      last_name: "Gómez",
      email: "est-2026-002@sanmateo.edu.co",
      phone: "+57 310 456 1234",
      blood_type: "A+",
      eps: "Sanitas",
      emergency_phone: "+57 310 456 1234",
      section_id: "e1111111-2222-3333-4444-555555555555",
      section_name: "9°A",
      grade_name: "Noveno Grado",
      academic_year_name: "2026",
      guardians: [fallbackGuardians[1]],
      primary_guardian: fallbackGuardians[1],
      financial_guardian: fallbackGuardians[1],
    },
    {
      id: "44444444-aaaa-bbbb-cccc-000000000003",
      organization_id: "a1111111-2222-3333-4444-555555555555",
      student_id: "33333333-aaaa-bbbb-cccc-000000000003",
      student_code: "EST-2026-003",
      status: "active",
      qr_access_token: "estudiante_valentina_2026",
      first_name: "Valentina",
      last_name: "Ríos Ospina",
      email: "est-2026-003@sanmateo.edu.co",
      phone: "+57 320 987 6543",
      blood_type: "B+",
      eps: "Compensar",
      emergency_phone: "+57 320 987 6543",
      section_id: "e1111111-2222-3333-4444-555555555555",
      section_name: "9°A",
      grade_name: "Noveno Grado",
      academic_year_name: "2026",
      guardians: [fallbackGuardians[2]],
      primary_guardian: fallbackGuardians[2],
      financial_guardian: fallbackGuardians[2],
    },
  ];

  // Fallback Staff if empty
  const fallbackStaff: SchoolStaffMember[] = [
    {
      id: "f1111111-2222-3333-4444-555555555555",
      organization_id: "a1111111-2222-3333-4444-555555555555",
      first_name: "Alberto",
      last_name: "García",
      email: "alberto.garcia@sanmateo.edu.co",
      phone: "+57 301 234 5678",
      role: "teacher",
      access_token: "docente_garcia_2026",
      is_active: true,
      assigned_courses_count: 1,
      assigned_courses: [displayCourses[0]],
      weekly_hours: 5,
    },
    {
      id: "f2222222-2222-3333-4444-555555555555",
      organization_id: "a1111111-2222-3333-4444-555555555555",
      first_name: "Elena",
      last_name: "Rodríguez",
      email: "elena.rodriguez@sanmateo.edu.co",
      phone: "+57 302 345 6789",
      role: "teacher",
      access_token: "docente_rodriguez_2026",
      is_active: true,
      assigned_courses_count: 1,
      assigned_courses: [displayCourses[1]],
      weekly_hours: 4,
    },
  ];

  // Lifted reactive states for complete CRUD parity
  const [guardians, setGuardians] = useState<SchoolGuardian[]>(
    directoryGuardians.length > 0 ? directoryGuardians : fallbackGuardians
  );
  const [students, setStudents] = useState<SchoolStudentWithDetails[]>(
    directoryStudents.length > 0 ? directoryStudents : fallbackStudents
  );
  const [staff, setStaff] = useState<SchoolStaffMember[]>(
    directoryStaff.length > 0 ? directoryStaff : fallbackStaff
  );

  // Synchronize when parent server component revalidates
  useEffect(() => {
    if (directoryGuardians.length > 0) setGuardians(directoryGuardians);
  }, [directoryGuardians]);

  useEffect(() => {
    if (directoryStudents.length > 0) setStudents(directoryStudents);
  }, [directoryStudents]);

  useEffect(() => {
    if (directoryStaff.length > 0) setStaff(directoryStaff);
  }, [directoryStaff]);

  // Programmatic create triggers from dashboard or portals view
  const [externalTriggerCreate, setExternalTriggerCreate] = useState<
    "student" | "staff" | "guardian" | null
  >(null);

  const handleOpenCreateStudent = () => {
    setExternalTriggerCreate("student");
    setActiveTab("directory");
  };

  const handleOpenCreateStaff = () => {
    setExternalTriggerCreate("staff");
    setActiveTab("directory");
  };

  const handleOpenCreateGuardian = () => {
    setExternalTriggerCreate("guardian");
    setActiveTab("directory");
  };

  // Real Credential Students mapped for Generator Modal from reactive state
  const credentialStudents = useMemo(
    () =>
      students.map((st) => ({
        enrollmentId: st.id,
        studentCode: st.student_code,
        firstName: st.first_name,
        lastName: st.last_name,
        gradeName: st.grade_name,
        sectionName: st.section_name,
        academicYear: st.academic_year_name,
        qrAccessToken: st.qr_access_token,
        bloodTypeRh: st.blood_type || "O+",
        healthProviderEps: st.eps || "Sura",
        emergencyContactPhone: st.emergency_phone || st.phone || "+57 300 000 0000",
        schoolName: organizationName,
        schoolColor: brandColor,
      })),
    [students, organizationName, brandColor]
  );

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
      1: [
        {
          id: "a1",
          course_id: c.id,
          period_id: "p1",
          title: "Taller Diagnóstico",
          weight_percentage: 10,
          due_date: "",
          grading_type: "numeric" as const,
          created_by_teacher_id: "",
          organization_id: "",
        },
      ],
      3: [
        {
          id: "a2",
          course_id: c.id,
          period_id: "p1",
          title: "Laboratorio Práctico",
          weight_percentage: 20,
          due_date: "",
          grading_type: "numeric" as const,
          created_by_teacher_id: "",
          organization_id: "",
        },
      ],
      5: [
        {
          id: "a3",
          course_id: c.id,
          period_id: "p1",
          title: "Evaluación Sumativa 1",
          weight_percentage: 25,
          due_date: "",
          grading_type: "numeric" as const,
          created_by_teacher_id: "",
          organization_id: "",
        },
      ],
    },
    averageProgress: idx === 1 ? 50 : 65,
  }));

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-[1600px] mx-auto w-full">
      {/* Standard Platform SectionHeader matching Tasks module */}
      <SectionHeader
        title={organizationName}
        titleClassName="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold tracking-tight"
        subtitle="Campus Digital AOS • SIEE Decreto 1290 • Ley 115 • Carnets QR y Portales Cero-Login"
        icon={GraduationCap}
        action={
          <div className="flex items-center gap-2">
            <SchoolCredentialsGeneratorModal
              schoolName={organizationName}
              academicYear="2026"
              students={credentialStudents}
            />

            {/* Unified + Nuevo Dropdown Menu matching Tasks design system */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="h-8 text-xs font-bold rounded-lg shadow-sm gap-1.5 px-3 text-white cursor-pointer"
                  style={{ backgroundColor: brandColor }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-1.5 rounded-xl shadow-xl border bg-card">
                <DropdownMenuItem
                  onClick={handleOpenCreateStudent}
                  className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-muted/60"
                >
                  <div className="w-7 h-7 rounded-md bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs text-foreground">Alta Estudiante</span>
                    <span className="text-[10px] text-muted-foreground">Matrícula, Carnet QR y Acudiente</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleOpenCreateStaff}
                  className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-muted/60"
                >
                  <div className="w-7 h-7 rounded-md bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs text-foreground">Alta Docente / Personal</span>
                    <span className="text-[10px] text-muted-foreground">Asignación académica y portal</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleOpenCreateGuardian}
                  className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-muted/60"
                >
                  <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs text-foreground">Registrar Acudiente</span>
                    <span className="text-[10px] text-muted-foreground">Responsable Ley 115 / DIAN</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Master 9-Pillar Sub-router Navigation Hub */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="flex items-center gap-1.5 bg-zinc-100/70 dark:bg-white/5 p-1.5 rounded-xl border border-zinc-200/60 dark:border-white/10 overflow-x-auto no-scrollbar shadow-xs">
          <Button
            variant={activeTab === "dashboard" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("dashboard")}
            className="h-8 text-xs font-semibold gap-1.5 rounded-lg shrink-0 cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Dashboard SIEE
          </Button>
          <Button
            variant={activeTab === "directory" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("directory")}
            className="h-8 text-xs font-semibold gap-1.5 rounded-lg shrink-0 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-primary" />
            Directorio Personas ({students.length + staff.length})
          </Button>
          <Button
            variant={activeTab === "portals" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("portals")}
            className="h-8 text-xs font-semibold gap-1.5 rounded-lg shrink-0 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            Portales Cero-Login
          </Button>
          <Button
            variant={activeTab === "curriculum" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("curriculum")}
            className="h-8 text-xs font-semibold gap-1.5 rounded-lg shrink-0 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            Plan de Estudios & Ritmo
          </Button>
          <Button
            variant={activeTab === "grades" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("grades")}
            className="h-8 text-xs font-semibold gap-1.5 rounded-lg shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Planilla Notas (Dec. 1290)
          </Button>
          <Button
            variant={activeTab === "schedules" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("schedules")}
            className="h-8 text-xs font-semibold gap-1.5 rounded-lg shrink-0 cursor-pointer"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Horarios Escolares
          </Button>
          <Button
            variant={activeTab === "convivencia" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("convivencia")}
            className="h-8 text-xs font-semibold gap-1.5 rounded-lg shrink-0 cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5" />
            Observador & Convivencia
          </Button>
          <Button
            variant={activeTab === "bulletins" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("bulletins")}
            className="h-8 text-xs font-semibold gap-1.5 rounded-lg shrink-0 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            Boletines & Carnets CR80
          </Button>
          <Button
            variant={activeTab === "treasury" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("treasury")}
            className="h-8 text-xs font-semibold gap-1.5 rounded-lg shrink-0 cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            Tesorería Escolar
          </Button>
        </div>

        {/* ============================================================== */}
        {/* VIEW 1: DASHBOARD / TELEMETRÍA SIEE */}
        {/* ============================================================== */}
        <TabsContent value="dashboard" className="mt-4 flex flex-col gap-6">
          {/* KPI Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card
              onClick={() => setActiveTab("directory")}
              className="rounded-2xl shadow-xs border cursor-pointer hover:border-primary/40 transition-colors"
            >
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Estudiantes
                  </p>
                  <h3 className="text-2xl font-black text-foreground mt-1">
                    {students.length}
                  </h3>
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">
                    100% matriculados
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card
              onClick={() => setActiveTab("directory")}
              className="rounded-2xl shadow-xs border cursor-pointer hover:border-primary/40 transition-colors"
            >
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Docentes
                  </p>
                  <h3 className="text-2xl font-black text-foreground mt-1">
                    {staff.length}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {displayCourses.length} cursos activos
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card
              onClick={() => setActiveTab("portals")}
              className="rounded-2xl shadow-xs border cursor-pointer hover:border-primary/40 transition-colors"
            >
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Portales Listos
                  </p>
                  <h3 className="text-2xl font-black text-foreground mt-1">
                    {students.length + staff.length}
                  </h3>
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">
                    Zero-Trust QR Gate
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card
              onClick={() => setActiveTab("treasury")}
              className="rounded-2xl shadow-xs border cursor-pointer hover:border-primary/40 transition-colors"
            >
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Cobranza Pensión
                  </p>
                  <h3 className="text-2xl font-black text-foreground mt-1">
                    88.5%
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Wompi + WhatsApp HSM
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card
              onClick={() => setActiveTab("grades")}
              className="rounded-2xl shadow-xs border cursor-pointer hover:border-primary/40 transition-colors"
            >
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">
                    Alerta Temprana
                  </p>
                  <h3 className="text-2xl font-black text-rose-500 mt-1">
                    1
                  </h3>
                  <p className="text-[11px] text-rose-500 font-medium mt-1">
                    Riesgo de rezago SIEE
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
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

          {/* Quick Pillar Jump Cards - 6 Core Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Card
              onClick={() => setActiveTab("directory")}
              className="rounded-2xl border shadow-xs p-5 hover:border-primary/50 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-bold text-sm text-foreground mt-3">
                Directorio de Personas
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Alta, baja y fichas integrales para Estudiantes, Docentes y Acudientes Ley 115 / DIAN.
              </p>
            </Card>

            <Card
              onClick={() => setActiveTab("portals")}
              className="rounded-2xl border shadow-xs p-5 hover:border-primary/50 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <QrCode className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-bold text-sm text-foreground mt-3">
                Portales & Distribución
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Acceso directo Cero-Login, invitaciones automáticas por WhatsApp y regeneración de tokens.
              </p>
            </Card>

            <Card
              onClick={() => setActiveTab("grades")}
              className="rounded-2xl border shadow-xs p-5 hover:border-primary/50 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-bold text-sm text-foreground mt-3">
                Planilla Decreto 1290
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Registro masivo de calificaciones, autoevaluación y actas de nivelación periódica.
              </p>
            </Card>

            <Card
              onClick={() => setActiveTab("convivencia")}
              className="rounded-2xl border shadow-xs p-5 hover:border-primary/50 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <Scale className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-bold text-sm text-foreground mt-3">
                Observador & Convivencia
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Expediente Ley 115, comités Ley 1620 y adaptaciones curriculares PIAR Decreto 1421.
              </p>
            </Card>

            <Card
              onClick={() => setActiveTab("bulletins")}
              className="rounded-2xl border shadow-xs p-5 hover:border-primary/50 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-bold text-sm text-foreground mt-3">
                Boletines & Carnets CR80
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Generador de PDF marca blanca con verificación QR y carnets en lote PVC.
              </p>
            </Card>

            <Card
              onClick={() => setActiveTab("treasury")}
              className="rounded-2xl border shadow-xs p-5 hover:border-primary/50 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-bold text-sm text-foreground mt-3">
                Tesorería & Pasarela Wompi
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Facturación de pensiones, paz y salvos y despacho de comprobantes DIAN.
              </p>
            </Card>
          </div>
        </TabsContent>

        {/* ============================================================== */}
        {/* VIEW 2: DIRECTORIO DE PERSONAS (CRUD COMPLETO) */}
        {/* ============================================================== */}
        <TabsContent value="directory" className="mt-4">
          <SchoolDirectoryView
            initialStudents={students}
            initialStaff={staff}
            initialGuardians={guardians}
            sections={displaySections}
            courses={displayCourses}
            organizationName={organizationName}
            brandColor={brandColor}
            onStudentsChange={setStudents}
            onStaffChange={setStaff}
            onGuardiansChange={setGuardians}
            externalTriggerCreate={externalTriggerCreate}
            onClearExternalTrigger={() => setExternalTriggerCreate(null)}
            initialDirectoryTab={initialResolved.dirTab || "students"}
          />
        </TabsContent>

        {/* ============================================================== */}
        {/* VIEW 3: PORTALES & DISTRIBUCIÓN CERO-LOGIN */}
        {/* ============================================================== */}
        <TabsContent value="portals" className="mt-4">
          <SchoolPortalsDistributionView
            staff={staff}
            students={students}
            organizationName={organizationName}
            brandColor={brandColor}
            onStaffChange={setStaff}
            onStudentsChange={setStudents}
            onOpenCreateStaff={handleOpenCreateStaff}
            onOpenCreateStudent={handleOpenCreateStudent}
          />
        </TabsContent>

        {/* ============================================================== */}
        {/* VIEW 4: PLAN DE ESTUDIOS & RITMO */}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-2">
              {displayBadges.map((badge) => (
                <SchoolBadgeCard key={badge.id} badge={badge} earnedCount={14} />
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ============================================================== */}
        {/* VIEW 5: PLANILLA DE CALIFICACIONES DECRETO 1290 */}
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
        {/* VIEW 6: HORARIOS ESCOLARES SEMANALES */}
        {/* ============================================================== */}
        <TabsContent value="schedules" className="mt-4">
          <SchoolSchedulesGridView
            courses={displayCourses}
            brandColor={brandColor}
          />
        </TabsContent>

        {/* ============================================================== */}
        {/* VIEW 7: OBSERVADOR, CONVIVENCIA & PIAR */}
        {/* ============================================================== */}
        <TabsContent value="convivencia" className="mt-4">
          <SchoolConvivenciaObserverView
            brandColor={brandColor}
            initialSubTab={convivenciaSubTab}
          />
        </TabsContent>

        {/* ============================================================== */}
        {/* VIEW 8: BOLETINES & CARNETIZACIÓN */}
        {/* ============================================================== */}
        <TabsContent value="bulletins" className="mt-4">
          <SchoolBulletinsCredentialsView
            organizationName={organizationName}
            brandColor={brandColor}
          />
        </TabsContent>

        {/* ============================================================== */}
        {/* VIEW 9: TESORERÍA ESCOLAR & WOMPI */}
        {/* ============================================================== */}
        <TabsContent value="treasury" className="mt-4">
          <SchoolTuitionTreasuryView brandColor={brandColor} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
