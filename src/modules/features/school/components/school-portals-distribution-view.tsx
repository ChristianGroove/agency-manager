"use client";

import React, { useState, useMemo } from "react";
import QRCode from "react-qr-code";
import {
  Globe,
  GraduationCap,
  BookOpen,
  Copy,
  ExternalLink,
  MessageSquare,
  RotateCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Share2,
  Sparkles,
  ShieldCheck,
  Send,
  Users,
  Download,
  Plus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/modules/infrastructure/utils/utils";
import type {
  SchoolStaffMember,
  SchoolStudentWithDetails,
} from "../types/school.types";
import {
  regenerateStaffAccessTokenAction,
  regenerateStudentQrTokenAction,
} from "../actions/school-directory-actions";

interface SchoolPortalsDistributionViewProps {
  staff: SchoolStaffMember[];
  students: SchoolStudentWithDetails[];
  organizationName?: string;
  brandColor?: string;
  onStaffChange?: (staff: SchoolStaffMember[]) => void;
  onStudentsChange?: (students: SchoolStudentWithDetails[]) => void;
  onOpenCreateStaff?: () => void;
  onOpenCreateStudent?: () => void;
}

export function SchoolPortalsDistributionView({
  staff: initialStaff,
  students: initialStudents,
  organizationName = "Colegio Bilingüe San Mateo 2026",
  brandColor = "#1e40af",
  onStaffChange,
  onStudentsChange,
  onOpenCreateStaff,
  onOpenCreateStudent,
}: SchoolPortalsDistributionViewProps) {
  const [activePortalTab, setActivePortalTab] = useState<"teachers" | "students">("teachers");
  const [searchQuery, setSearchQuery] = useState("");

  const [staff, setStaff] = useState<SchoolStaffMember[]>(initialStaff);
  const [students, setStudents] = useState<SchoolStudentWithDetails[]>(initialStudents);

  // Synchronize local state with props
  React.useEffect(() => {
    setStaff(initialStaff);
  }, [initialStaff]);

  React.useEffect(() => {
    setStudents(initialStudents);
  }, [initialStudents]);

  const getOrigin = () => {
    return typeof window !== "undefined" ? window.location.origin : "http://localhost:3005";
  };

  const getTeacherPortalUrl = (token: string) => `${getOrigin()}/portal/teacher/${token}`;
  const getStudentPortalUrl = (token: string) => `${getOrigin()}/portal/student/${token}`;

  const copyToClipboard = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Enlace copiado al portapapeles", {
      description: title,
    });
  };

  const openPortal = (url: string) => {
    window.open(url, "_blank");
  };

  const shareViaWhatsApp = (phone: string | undefined, message: string) => {
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, "") : "";
    const encoded = encodeURIComponent(message);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith("57") ? cleanPhone : `57${cleanPhone}`}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank");
  };

  const copyWhatsAppMessage = (message: string, recipient: string) => {
    navigator.clipboard.writeText(message);
    toast.success("Mensaje para WhatsApp copiado", {
      description: `Listo para pegar y enviar a ${recipient}`,
    });
  };

  const handleRegenerateTeacherToken = async (member: SchoolStaffMember) => {
    try {
      const res = await regenerateStaffAccessTokenAction(member.id);
      if (res.success && res.data) {
        toast.success("Nuevo token generado para docente", {
          description: `${member.first_name} ${member.last_name}`,
        });
        const updated = staff.map((s) =>
          s.id === member.id ? { ...s, access_token: res.data! } : s
        );
        setStaff(updated);
        onStaffChange?.(updated);
      } else {
        toast.error(res.error || "Error al regenerar token");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al regenerar token");
    }
  };

  const handleRegenerateStudentToken = async (student: SchoolStudentWithDetails) => {
    try {
      const res = await regenerateStudentQrTokenAction(student.id);
      if (res.success && res.data) {
        toast.success("Nuevo token QR generado para estudiante", {
          description: `${student.first_name} ${student.last_name}`,
        });
        const updated = students.map((s) =>
          s.id === student.id ? { ...s, qr_access_token: res.data! } : s
        );
        setStudents(updated);
        onStudentsChange?.(updated);
      } else {
        toast.error(res.error || "Error al regenerar token");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al regenerar token");
    }
  };

  // Filtered lists
  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return staff.filter((st) => {
      return (
        !q ||
        st.first_name.toLowerCase().includes(q) ||
        st.last_name.toLowerCase().includes(q) ||
        (st.email && st.email.toLowerCase().includes(q)) ||
        (st.assigned_courses &&
          st.assigned_courses.some((c) => c.subject_name.toLowerCase().includes(q)))
      );
    });
  }, [staff, searchQuery]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return students.filter((s) => {
      return (
        !q ||
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q) ||
        s.student_code.toLowerCase().includes(q) ||
        s.section_name.toLowerCase().includes(q)
      );
    });
  }, [students, searchQuery]);

  const copyAllTeacherLinks = () => {
    const text = staff
      .map(
        (s) =>
          `${s.first_name} ${s.last_name}: ${getTeacherPortalUrl(s.access_token || "")}`
      )
      .join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Enlaces de todos los docentes copiados");
  };

  const copyAllStudentLinks = () => {
    const text = students
      .map(
        (s) =>
          `${s.student_code} - ${s.first_name} ${s.last_name}: ${getStudentPortalUrl(
            s.qr_access_token
          )}`
      )
      .join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Enlaces de todos los estudiantes copiados");
  };

  return (
    <div className="space-y-6">
      {/* Informative Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-md relative overflow-hidden border border-white/10">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Arquitectura Cero-Login Segura Pixy Edu
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">
            Distribución de Accesos & Portales Institucionales
          </h2>
          <p className="text-xs md:text-sm text-blue-100/80 leading-relaxed">
            Docentes, estudiantes y familias no necesitan recordar contraseñas ni lidiar con correos de recuperación. Cada usuario cuenta con un enlace criptográfico único que carga directamente su espacio táctico o carnet QR institucional.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button
              size="sm"
              onClick={copyAllTeacherLinks}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              Copiar Enlaces de Todos los Docentes
            </Button>
            <Button
              size="sm"
              onClick={copyAllStudentLinks}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-bold gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              Copiar Enlaces de Estudiantes
            </Button>

            {onOpenCreateStaff && (
              <Button
                size="sm"
                onClick={onOpenCreateStaff}
                className="bg-white/95 hover:bg-white text-zinc-900 text-xs font-bold gap-1.5 shadow-sm rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" />
                Alta de Docente
              </Button>
            )}

            {onOpenCreateStudent && (
              <Button
                size="sm"
                onClick={onOpenCreateStudent}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold gap-1.5 shadow-sm rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" />
                Matricular Estudiante
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Tabs
          value={activePortalTab}
          onValueChange={(val: any) => setActivePortalTab(val)}
          className="w-full sm:w-auto"
        >
          <TabsList className="bg-muted/70 p-1 rounded-xl h-10 grid grid-cols-2 w-full sm:w-[420px] border">
            <TabsTrigger
              value="teachers"
              className="rounded-lg text-xs font-bold gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Portales Docentes ({staff.length})
            </TabsTrigger>
            <TabsTrigger
              value="students"
              className="rounded-lg text-xs font-bold gap-1.5"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Portales Estudiantes ({students.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activePortalTab === "teachers"
                  ? "Buscar docente o materia..."
                  : "Buscar estudiante o código..."
              }
              className="pl-8 h-10 text-xs rounded-xl"
            />
          </div>

          {activePortalTab === "teachers" && onOpenCreateStaff && (
            <Button
              onClick={onOpenCreateStaff}
              className="h-10 text-xs font-bold gap-1.5 rounded-xl shrink-0 text-white shadow-xs"
              style={{ backgroundColor: brandColor }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Alta Docente</span>
            </Button>
          )}

          {activePortalTab === "students" && onOpenCreateStudent && (
            <Button
              onClick={onOpenCreateStudent}
              className="h-10 text-xs font-bold gap-1.5 rounded-xl shrink-0 text-white shadow-xs"
              style={{ backgroundColor: brandColor }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Matricular Estudiante</span>
            </Button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* VIEW A: PORTALES DOCENTES TÁCTICOS */}
      {/* ============================================================== */}
      {activePortalTab === "teachers" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.length === 0 ? (
            <div className="col-span-full p-12 text-center text-muted-foreground bg-card rounded-2xl border space-y-3">
              <p className="text-sm">No se encontraron docentes con el término de búsqueda o no hay docentes registrados.</p>
              {onOpenCreateStaff && (
                <Button
                  onClick={onOpenCreateStaff}
                  size="sm"
                  className="gap-2 rounded-xl text-xs font-bold text-white shadow-xs"
                  style={{ backgroundColor: brandColor }}
                >
                  <Plus className="w-4 h-4" /> Registrar Nuevo Docente
                </Button>
              )}
            </div>
          ) : (
            filteredStaff.map((member) => {
              const portalUrl = getTeacherPortalUrl(member.access_token || "");
              const whatsAppMessage = `👋 Estimado(a) profesor(a) *${member.first_name} ${member.last_name}*, te compartimos tu enlace de acceso directo al Portal Docente Táctico de *${organizationName}*: ${portalUrl} . Recuerda que no requieres contraseña; desde este portal registras asistencia diaria y calificaciones Decreto 1290.`;

              return (
                <Card
                  key={member.id}
                  className="rounded-2xl border shadow-xs bg-card hover:border-primary/40 transition-all flex flex-col justify-between"
                >
                  <CardContent className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-11 h-11 rounded-xl border shadow-xs">
                          <AvatarImage src={member.photo_url || ""} />
                          <AvatarFallback
                            className="font-bold text-white text-xs rounded-xl"
                            style={{ backgroundColor: brandColor }}
                          >
                            {member.first_name[0]}
                            {member.last_name[0] || ""}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-bold text-sm text-foreground leading-tight">
                            {member.first_name} {member.last_name}
                          </h4>
                          <span className="text-[11px] text-muted-foreground truncate block max-w-[180px]">
                            {member.email}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] font-bold uppercase",
                          member.is_active
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                            : "bg-zinc-500/10 text-zinc-500"
                        )}
                      >
                        {member.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>

                    {/* Courses assigned */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Carga Académica ({member.assigned_courses?.length || 0} asignaturas)
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                        {member.assigned_courses && member.assigned_courses.length > 0 ? (
                          member.assigned_courses.map((c) => (
                            <Badge
                              key={c.id}
                              variant="secondary"
                              className="text-[10px] font-medium"
                            >
                              {c.subject_name} ({c.section?.name || "Grupo"})
                            </Badge>
                          ))
                        ) : (
                          <span className="text-[11px] text-muted-foreground/60 italic">
                            Sin materias asignadas
                          </span>
                        )}
                      </div>
                    </div>

                    {/* URL Snippet */}
                    <div className="p-2.5 rounded-xl bg-muted/40 border space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                        <span>Enlace Cero-Login:</span>
                        <span className="font-mono text-primary font-bold">
                          /{member.access_token?.slice(0, 16)}...
                        </span>
                      </div>
                      <div className="text-[11px] font-mono truncate text-foreground/80 bg-background/80 p-1.5 rounded-md border">
                        {portalUrl}
                      </div>
                    </div>

                    {/* Action Hub */}
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            copyToClipboard(portalUrl, `Portal Docente de ${member.first_name}`)
                          }
                          className="h-8 text-xs font-bold gap-1 rounded-xl"
                        >
                          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                          Copiar URL
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => openPortal(portalUrl)}
                          className="h-8 text-xs font-bold gap-1 rounded-xl text-white shadow-xs"
                          style={{ backgroundColor: brandColor }}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Abrir Portal
                        </Button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            shareViaWhatsApp(member.phone || undefined, whatsAppMessage)
                          }
                          className="h-8 flex-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-500/30 gap-1.5 rounded-xl"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Enviar por WhatsApp
                        </Button>

                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  copyWhatsAppMessage(
                                    whatsAppMessage,
                                    `${member.first_name} ${member.last_name}`
                                  )
                                }
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-xl"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copiar texto del mensaje</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRegenerateTeacherToken(member)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-xl"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Regenerar Token Seguro</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW B: PORTALES ESTUDIANTILES & FAMILIARES */}
      {/* ============================================================== */}
      {activePortalTab === "students" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.length === 0 ? (
            <div className="col-span-full p-12 text-center text-muted-foreground bg-card rounded-2xl border space-y-3">
              <p className="text-sm">No se encontraron estudiantes con el término de búsqueda o no hay estudiantes matriculados.</p>
              {onOpenCreateStudent && (
                <Button
                  onClick={onOpenCreateStudent}
                  size="sm"
                  className="gap-2 rounded-xl text-xs font-bold text-white shadow-xs"
                  style={{ backgroundColor: brandColor }}
                >
                  <Plus className="w-4 h-4" /> Matricular Nuevo Estudiante
                </Button>
              )}
            </div>
          ) : (
            filteredStudents.map((st) => {
              const portalUrl = getStudentPortalUrl(st.qr_access_token);
              const whatsAppMessage = `👋 Cordial saludo, familia de *${st.first_name} ${st.last_name}* (Código: *${st.student_code}*). Les compartimos el enlace oficial del Portal Estudiantil y Familiar de *${organizationName}*: ${portalUrl} . Desde este espacio seguro pueden ver carnet QR de acceso, seguimiento de notas Decreto 1290 y pasarela de pensión.`;

              return (
                <Card
                  key={st.id}
                  className="rounded-2xl border shadow-xs bg-card hover:border-primary/40 transition-all flex flex-col justify-between"
                >
                  <CardContent className="p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-11 h-11 rounded-xl border shadow-xs">
                          <AvatarImage src={st.avatar_url || ""} />
                          <AvatarFallback
                            className="font-bold text-white text-xs rounded-xl"
                            style={{ backgroundColor: brandColor }}
                          >
                            {st.first_name[0]}
                            {st.last_name[0] || ""}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-bold text-sm text-foreground leading-tight">
                            {st.first_name} {st.last_name}
                          </h4>
                          <span className="text-[11px] text-muted-foreground block">
                            {st.section_name} • {st.grade_name}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className="font-mono text-[9px] px-1.5 py-0.5 border-primary/30 text-primary bg-primary/5"
                      >
                        {st.student_code}
                      </Badge>
                    </div>

                    {/* QR Code and Quick Details */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border">
                      <div className="p-1.5 bg-white rounded-lg border shadow-2xs shrink-0">
                        <QRCode value={portalUrl} size={64} />
                      </div>
                      <div className="space-y-1 text-xs">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                          Acudiente Designado:
                        </span>
                        <span className="font-semibold text-foreground block truncate max-w-[150px]">
                          {st.primary_guardian
                            ? `${st.primary_guardian.first_name} ${st.primary_guardian.last_name}`
                            : "Sin acudiente"}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0 bg-rose-500/10 text-rose-600 font-bold"
                        >
                          RH: {st.blood_type || "O+"} • {st.eps || "Sura"}
                        </Badge>
                      </div>
                    </div>

                    {/* URL Snippet */}
                    <div className="p-2.5 rounded-xl bg-muted/40 border space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                        <span>Portal Estudiantil / QR:</span>
                        <span className="font-mono text-emerald-600 font-bold">
                          /{st.qr_access_token?.slice(0, 16)}...
                        </span>
                      </div>
                      <div className="text-[11px] font-mono truncate text-foreground/80 bg-background/80 p-1.5 rounded-md border">
                        {portalUrl}
                      </div>
                    </div>

                    {/* Action Hub */}
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            copyToClipboard(portalUrl, `Portal Estudiantil de ${st.first_name}`)
                          }
                          className="h-8 text-xs font-bold gap-1 rounded-xl"
                        >
                          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                          Copiar URL
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => openPortal(portalUrl)}
                          className="h-8 text-xs font-bold gap-1 rounded-xl text-white shadow-xs"
                          style={{ backgroundColor: brandColor }}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Abrir Portal
                        </Button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            shareViaWhatsApp(
                              st.primary_guardian?.phone || st.phone || undefined,
                              whatsAppMessage
                            )
                          }
                          className="h-8 flex-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-500/30 gap-1.5 rounded-xl"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Enviar a Familia
                        </Button>

                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  copyWhatsAppMessage(
                                    whatsAppMessage,
                                    `Familia de ${st.first_name}`
                                  )
                                }
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-xl"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copiar texto del mensaje</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRegenerateStudentToken(st)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-xl"
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Regenerar Token QR</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
