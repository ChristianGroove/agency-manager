"use client";

import React, { useState, useMemo, useEffect } from "react";
import QRCode from "react-qr-code";
import {
  Users,
  GraduationCap,
  BookOpen,
  HeartHandshake,
  Plus,
  Search,
  Filter,
  Copy,
  ExternalLink,
  MessageSquare,
  Pencil,
  Trash2,
  Phone,
  Mail,
  ShieldCheck,
  HeartPulse,
  AlertTriangle,
  QrCode,
  CheckCircle2,
  XCircle,
  RotateCw,
  Eye,
  CreditCard,
  Building,
  UserCheck,
  FileText,
  BadgeAlert,
  Calendar,
  Layers,
} from "lucide-react";
import { SearchFilterBar } from "@/modules/core/ui/components/search-filter-bar";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/modules/infrastructure/utils/utils";
import type {
  SchoolStudentWithDetails,
  SchoolStaffMember,
  SchoolGuardian,
  SchoolSection,
  SchoolCourse,
  GuardianRelationship,
  GuardianDocumentType,
} from "../types/school.types";
import {
  createStudentEnrollmentAction,
  updateStudentEnrollmentAction,
  setStudentStatusAction,
  deleteStudentEnrollmentAction,
  regenerateStudentQrTokenAction,
  createSchoolStaffAction,
  updateSchoolStaffAction,
  setStaffStatusAction,
  deleteSchoolStaffAction,
  regenerateStaffAccessTokenAction,
} from "../actions/school-directory-actions";
import { saveGuardianAction, deleteGuardianAction } from "../actions/guardian-actions";

interface SchoolDirectoryViewProps {
  initialStudents: SchoolStudentWithDetails[];
  initialStaff: SchoolStaffMember[];
  initialGuardians: SchoolGuardian[];
  sections: SchoolSection[];
  courses: SchoolCourse[];
  organizationName?: string;
  brandColor?: string;
  onStudentsChange?: (students: SchoolStudentWithDetails[]) => void;
  onStaffChange?: (staff: SchoolStaffMember[]) => void;
  onGuardiansChange?: (guardians: SchoolGuardian[]) => void;
  externalTriggerCreate?: "student" | "staff" | "guardian" | null;
  onClearExternalTrigger?: () => void;
  initialDirectoryTab?: "students" | "staff" | "guardians";
}

export function SchoolDirectoryView({
  initialStudents,
  initialStaff,
  initialGuardians,
  sections,
  courses,
  organizationName = "Colegio Bilingüe San Mateo 2026",
  brandColor = "#1e40af",
  onStudentsChange,
  onStaffChange,
  onGuardiansChange,
  externalTriggerCreate,
  onClearExternalTrigger,
  initialDirectoryTab = "students",
}: SchoolDirectoryViewProps) {
  // Navigation tabs within directory
  const [activeTab, setActiveTab] = useState<"students" | "staff" | "guardians">(initialDirectoryTab);

  // Local state for instant optimistic updates
  const [students, setStudents] = useState<SchoolStudentWithDetails[]>(initialStudents);
  const [staff, setStaff] = useState<SchoolStaffMember[]>(initialStaff);
  const [guardians, setGuardians] = useState<SchoolGuardian[]>(initialGuardians);

  // Modal states: Create
  const [isCreateStudentOpen, setIsCreateStudentOpen] = useState(false);
  const [isCreateStaffOpen, setIsCreateStaffOpen] = useState(false);
  const [isCreateGuardianOpen, setIsCreateGuardianOpen] = useState(false);

  // Synchronize tab when parent navigates to specific sub-tab (e.g. /school?tab=docentes)
  useEffect(() => {
    if (initialDirectoryTab) {
      setActiveTab(initialDirectoryTab);
    }
  }, [initialDirectoryTab]);

  // React to external triggers (e.g. from Dashboard or Portals View)
  useEffect(() => {
    if (externalTriggerCreate === "student") {
      setActiveTab("students");
      setIsCreateStudentOpen(true);
      onClearExternalTrigger?.();
    } else if (externalTriggerCreate === "staff") {
      setActiveTab("staff");
      setIsCreateStaffOpen(true);
      onClearExternalTrigger?.();
    } else if (externalTriggerCreate === "guardian") {
      setActiveTab("guardians");
      setIsCreateGuardianOpen(true);
      onClearExternalTrigger?.();
    }
  }, [externalTriggerCreate, onClearExternalTrigger]);

  // Synchronize local state with props
  useEffect(() => {
    setStudents(initialStudents);
  }, [initialStudents]);

  useEffect(() => {
    setStaff(initialStaff);
  }, [initialStaff]);

  useEffect(() => {
    setGuardians(initialGuardians);
  }, [initialGuardians]);

  // Helper setters that also notify parent
  const updateStudents = (newStudents: SchoolStudentWithDetails[]) => {
    setStudents(newStudents);
    onStudentsChange?.(newStudents);
  };

  const updateStaff = (newStaff: SchoolStaffMember[]) => {
    setStaff(newStaff);
    onStaffChange?.(newStaff);
  };

  const updateGuardians = (newGuardians: SchoolGuardian[]) => {
    setGuardians(newGuardians);
    onGuardiansChange?.(newGuardians);
  };

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal states: Edit
  const [editingStudent, setEditingStudent] = useState<SchoolStudentWithDetails | null>(null);
  const [editingStaff, setEditingStaff] = useState<SchoolStaffMember | null>(null);
  const [editingGuardian, setEditingGuardian] = useState<SchoolGuardian | null>(null);

  // Detail / Ficha states
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<SchoolStudentWithDetails | null>(null);
  const [selectedStaffDetail, setSelectedStaffDetail] = useState<SchoolStaffMember | null>(null);

  // Submitting loaders
  const [isSubmitting, setIsSubmitting] = useState(false);

  // FORM STATES: Create Student
  const [stFirstName, setStFirstName] = useState("");
  const [stLastName, setStLastName] = useState("");
  const [stEmail, setStEmail] = useState("");
  const [stPhone, setStPhone] = useState("");
  const [stCode, setStCode] = useState("");
  const [stSectionId, setStSectionId] = useState(sections[0]?.id || "e1111111-2222-3333-4444-555555555555");
  const [stBloodType, setStBloodType] = useState("O+");
  const [stEps, setStEps] = useState("Sura");
  const [stEmergencyPhone, setStEmergencyPhone] = useState("");
  const [stWithGuardian, setStWithGuardian] = useState(true);
  const [stGFirstName, setStGFirstName] = useState("");
  const [stGLastName, setStGLastName] = useState("");
  const [stGRelation, setStGRelation] = useState<GuardianRelationship>("mother");
  const [stGPhone, setStGPhone] = useState("");
  const [stGEmail, setStGEmail] = useState("");
  const [stGFinancial, setStGFinancial] = useState(true);

  // FORM STATES: Create Staff
  const [staffFirstName, setStaffFirstName] = useState("");
  const [staffLastName, setStaffLastName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffRole, setStaffRole] = useState("teacher");
  const [staffDocument, setStaffDocument] = useState("");
  const [staffSelectedCourses, setStaffSelectedCourses] = useState<string[]>([]);

  // FORM STATES: Create Guardian
  const [gStudentId, setGStudentId] = useState(students[0]?.student_id || "");
  const [gFirstName, setGFirstName] = useState("");
  const [gLastName, setGLastName] = useState("");
  const [gRelationship, setGRelationship] = useState<GuardianRelationship>("mother");
  const [gDocType, setGDocType] = useState<GuardianDocumentType>("CC");
  const [gDocNumber, setGDocNumber] = useState("");
  const [gPhone, setGPhone] = useState("");
  const [gEmail, setGEmail] = useState("");
  const [gFinancial, setGFinancial] = useState(true);
  const [gPrimary, setGPrimary] = useState(true);
  const [gAddress, setGAddress] = useState("");

  // URL & LINK HELPERS
  const getOrigin = () => {
    return typeof window !== "undefined" ? window.location.origin : "http://localhost:3005";
  };

  const getStudentPortalUrl = (token: string) => `${getOrigin()}/portal/student/${token}`;
  const getTeacherPortalUrl = (token: string) => `${getOrigin()}/portal/teacher/${token}`;

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    toast.success("Enlace copiado", { description: label });
  };

  const openInNewTab = (url: string) => {
    window.open(url, "_blank");
  };

  const shareWhatsApp = (phone: string | undefined, message: string) => {
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, "") : "";
    const encoded = encodeURIComponent(message);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith("57") ? cleanPhone : `57${cleanPhone}`}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank");
  };

  // HANDLERS: STUDENT CRUD
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stFirstName.trim() || !stLastName.trim() || !stSectionId) {
      toast.error("Por favor completa los campos obligatorios del estudiante");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createStudentEnrollmentAction({
        firstName: stFirstName.trim(),
        lastName: stLastName.trim(),
        email: stEmail.trim() || undefined,
        phone: stPhone.trim() || undefined,
        studentCode: stCode.trim() || undefined,
        sectionId: stSectionId,
        bloodType: stBloodType,
        eps: stEps,
        emergencyPhone: stEmergencyPhone.trim() || undefined,
        guardian:
          stWithGuardian && stGFirstName.trim()
            ? {
                firstName: stGFirstName.trim(),
                lastName: stGLastName.trim() || stLastName.trim(),
                relationship: stGRelation,
                phone: stGPhone.trim() || stPhone.trim() || "3000000000",
                email: stGEmail.trim() || undefined,
                isFinancialResponsible: stGFinancial,
              }
            : undefined,
      });

      if (res.success && res.data) {
        toast.success("Estudiante matriculado exitosamente", {
          description: `Código asignado: ${res.data.student_code}`,
        });
        updateStudents([res.data, ...students]);
        setIsCreateStudentOpen(false);
        // Reset form
        setStFirstName("");
        setStLastName("");
        setStEmail("");
        setStPhone("");
        setStCode("");
        setStEmergencyPhone("");
        setStGFirstName("");
        setStGLastName("");
        setStGPhone("");
        setStGEmail("");
      } else {
        toast.error(res.error || "Error al matricular estudiante");
      }
    } catch (err: any) {
      toast.error(err.message || "Error procesando solicitud");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    setIsSubmitting(true);
    try {
      const res = await updateStudentEnrollmentAction({
        enrollmentId: editingStudent.id,
        studentId: editingStudent.student_id,
        firstName: editingStudent.first_name,
        lastName: editingStudent.last_name,
        email: editingStudent.email || undefined,
        phone: editingStudent.phone || undefined,
        studentCode: editingStudent.student_code,
        sectionId: editingStudent.section_id,
        status: editingStudent.status,
        bloodType: editingStudent.blood_type,
        eps: editingStudent.eps,
        emergencyPhone: editingStudent.emergency_phone,
      });

      if (res.success) {
        toast.success("Datos del estudiante actualizados");
        updateStudents(students.map((s) => (s.id === editingStudent.id ? editingStudent : s)));
        setEditingStudent(null);
      } else {
        toast.error(res.error || "Error al actualizar estudiante");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar estudiante");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStudentStatus = async (student: SchoolStudentWithDetails) => {
    const nextStatus = student.status === "active" ? "withdrawn" : "active";
    const statusLabel = nextStatus === "active" ? "activado" : "desvinculado / retirado";

    try {
      const res = await setStudentStatusAction(student.id, nextStatus);
      if (res.success) {
        toast.success(`Estudiante ${statusLabel}`, {
          description: `${student.first_name} ${student.last_name}`,
        });
        updateStudents(students.map((s) => (s.id === student.id ? { ...s, status: nextStatus } : s)));
      } else {
        toast.error(res.error || "Error al cambiar estado");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al cambiar estado");
    }
  };

  const handleDeleteStudent = async (student: SchoolStudentWithDetails) => {
    if (
      !confirm(
        `¿Estás seguro de eliminar permanentemente la matrícula de ${student.first_name} ${student.last_name} (${student.student_code})?`
      )
    )
      return;

    try {
      const res = await deleteStudentEnrollmentAction(student.id);
      if (res.success) {
        toast.success("Matrícula eliminada");
        updateStudents(students.filter((s) => s.id !== student.id));
      } else {
        toast.error(res.error || "Error al eliminar matrícula");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar matrícula");
    }
  };

  const handleRegenerateStudentQr = async (student: SchoolStudentWithDetails) => {
    try {
      const res = await regenerateStudentQrTokenAction(student.id);
      if (res.success && res.data) {
        toast.success("Nuevo token QR generado", {
          description: "El carnet anterior ha sido revocado por seguridad.",
        });
        const updated = students.map((s) =>
          s.id === student.id ? { ...s, qr_access_token: res.data! } : s
        );
        updateStudents(updated);
        if (selectedStudentDetail?.id === student.id) {
          setSelectedStudentDetail((prev) =>
            prev ? { ...prev, qr_access_token: res.data! } : null
          );
        }
      } else {
        toast.error(res.error || "Error al regenerar token");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al regenerar token");
    }
  };

  // HANDLERS: STAFF CRUD
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFirstName.trim() || !staffLastName.trim() || !staffEmail.trim()) {
      toast.error("Por favor completa nombre, apellido y correo institucional");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createSchoolStaffAction({
        firstName: staffFirstName.trim(),
        lastName: staffLastName.trim(),
        email: staffEmail.trim(),
        phone: staffPhone.trim() || undefined,
        role: staffRole,
        documentId: staffDocument.trim() || undefined,
        courseIds: staffSelectedCourses,
      });

      if (res.success && res.data) {
        toast.success("Docente registrado exitosamente", {
          description: `Token de acceso directo creado: ${res.data.access_token}`,
        });
        updateStaff([res.data, ...staff]);
        setIsCreateStaffOpen(false);
        // Reset
        setStaffFirstName("");
        setStaffLastName("");
        setStaffEmail("");
        setStaffPhone("");
        setStaffDocument("");
        setStaffSelectedCourses([]);
      } else {
        toast.error(res.error || "Error al registrar docente");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al registrar docente");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    setIsSubmitting(true);
    try {
      const res = await updateSchoolStaffAction({
        id: editingStaff.id,
        firstName: editingStaff.first_name,
        lastName: editingStaff.last_name,
        email: editingStaff.email || "",
        phone: editingStaff.phone || undefined,
        role: editingStaff.role,
        documentId: editingStaff.document_id || undefined,
        isActive: editingStaff.is_active,
        courseIds: staffSelectedCourses,
      });

      if (res.success) {
        toast.success("Información docente actualizada");
        updateStaff(staff.map((st) => (st.id === editingStaff.id ? editingStaff : st)));
        setEditingStaff(null);
      } else {
        toast.error(res.error || "Error al actualizar docente");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar docente");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStaffStatus = async (member: SchoolStaffMember) => {
    const nextActive = !member.is_active;
    try {
      const res = await setStaffStatusAction(member.id, nextActive);
      if (res.success) {
        toast.success(nextActive ? "Docente reactivado" : "Docente inactivado");
        updateStaff(staff.map((s) => (s.id === member.id ? { ...s, is_active: nextActive } : s)));
      } else {
        toast.error(res.error || "Error al cambiar estado");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al cambiar estado");
    }
  };

  const handleDeleteStaff = async (member: SchoolStaffMember) => {
    if (
      !confirm(
        `¿Estás seguro de desvincular al docente ${member.first_name} ${member.last_name}?`
      )
    )
      return;

    try {
      const res = await deleteSchoolStaffAction(member.id);
      if (res.success) {
        toast.success("Docente desvinculado");
        updateStaff(staff.filter((s) => s.id !== member.id));
      } else {
        toast.error(res.error || "Error al desvincular docente");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al desvincular docente");
    }
  };

  const handleRegenerateStaffToken = async (member: SchoolStaffMember) => {
    try {
      const res = await regenerateStaffAccessTokenAction(member.id);
      if (res.success && res.data) {
        toast.success("Nuevo token de acceso generado", {
          description: "El enlace directo anterior ha expirado.",
        });
        const updated = staff.map((s) =>
          s.id === member.id ? { ...s, access_token: res.data! } : s
        );
        updateStaff(updated);
        if (selectedStaffDetail?.id === member.id) {
          setSelectedStaffDetail((prev) =>
            prev ? { ...prev, access_token: res.data! } : null
          );
        }
      } else {
        toast.error(res.error || "Error al regenerar token");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al regenerar token");
    }
  };

  // HANDLERS: GUARDIAN CRUD
  const handleSaveGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gStudentId || !gFirstName.trim() || !gLastName.trim() || !gPhone.trim()) {
      toast.error("Por favor completa estudiante, nombre, apellido y teléfono");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await saveGuardianAction({
        student_id: gStudentId,
        relationship: gRelationship,
        first_name: gFirstName.trim(),
        last_name: gLastName.trim(),
        document_type: gDocType,
        document_number: gDocNumber.trim() || "10000000",
        phone: gPhone.trim(),
        email: gEmail.trim() || undefined,
        is_primary_contact: gPrimary,
        is_emergency_contact: true,
        is_financial_responsible: gFinancial,
        billing_address: gAddress.trim() || undefined,
      });

      if (res.success && res.data) {
        toast.success("Acudiente registrado exitosamente");
        updateGuardians([res.data, ...guardians]);
        setIsCreateGuardianOpen(false);
        // Reset
        setGFirstName("");
        setGLastName("");
        setGDocNumber("");
        setGPhone("");
        setGEmail("");
        setGAddress("");
      } else {
        toast.error(res.error || "Error al guardar acudiente");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al guardar acudiente");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGuardian = async (guardian: SchoolGuardian) => {
    if (!confirm(`¿Eliminar al acudiente ${guardian.first_name} ${guardian.last_name}?`))
      return;

    try {
      const res = await deleteGuardianAction(guardian.id);
      if (res.success) {
        toast.success("Acudiente eliminado");
        updateGuardians(guardians.filter((g) => g.id !== guardian.id));
      } else {
        toast.error(res.error || "Error al eliminar");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar");
    }
  };

  const handleUpdateGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuardian) return;

    setIsSubmitting(true);
    try {
      const res = await saveGuardianAction({
        id: editingGuardian.id,
        student_id: editingGuardian.student_id,
        relationship: editingGuardian.relationship,
        first_name: editingGuardian.first_name,
        last_name: editingGuardian.last_name,
        document_type: editingGuardian.document_type,
        document_number: editingGuardian.document_number,
        phone: editingGuardian.phone,
        email: editingGuardian.email || undefined,
        is_primary_contact: editingGuardian.is_primary_contact,
        is_emergency_contact: editingGuardian.is_emergency_contact,
        is_financial_responsible: editingGuardian.is_financial_responsible,
        billing_address: editingGuardian.billing_address || undefined,
      });

      if (res.success && res.data) {
        toast.success("Datos del acudiente actualizados");
        updateGuardians(guardians.map((g) => (g.id === editingGuardian.id ? res.data! : g)));
        setEditingGuardian(null);
      } else {
        toast.error(res.error || "Error al actualizar acudiente");
      }
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar acudiente");
    } finally {
      setIsSubmitting(false);
    }
  };

  // FILTERED LISTS
  const filteredStudents = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return students.filter((s) => {
      const matchesSearch =
        !q ||
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q) ||
        s.student_code.toLowerCase().includes(q) ||
        s.section_name.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && s.status === "active") ||
        (statusFilter === "withdrawn" && s.status === "withdrawn") ||
        (statusFilter === "suspended" && s.status === "suspended");

      return matchesSearch && matchesStatus;
    });
  }, [students, searchTerm, statusFilter]);

  const filteredStaff = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return staff.filter((st) => {
      const matchesSearch =
        !q ||
        st.first_name.toLowerCase().includes(q) ||
        st.last_name.toLowerCase().includes(q) ||
        (st.email && st.email.toLowerCase().includes(q)) ||
        st.role.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && st.is_active) ||
        (statusFilter === "inactive" && !st.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [staff, searchTerm, statusFilter]);

  const filteredGuardians = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return guardians.filter((g) => {
      const matchesSearch =
        !q ||
        g.first_name.toLowerCase().includes(q) ||
        g.last_name.toLowerCase().includes(q) ||
        g.phone.includes(q) ||
        (g.email && g.email.toLowerCase().includes(q)) ||
        (g.student &&
          `${g.student.first_name} ${g.student.last_name}`
            .toLowerCase()
            .includes(q));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "financial" && g.is_financial_responsible) ||
        (statusFilter === "primary" && g.is_primary_contact);

      return matchesSearch && matchesStatus;
    });
  }, [guardians, searchTerm, statusFilter]);

  // Counts for filter pills
  const activeStudentsCount = students.filter((s) => s.status === "active").length;
  const withdrawnStudentsCount = students.filter((s) => s.status === "withdrawn").length;
  const activeStaffCount = staff.filter((s) => s.is_active).length;
  const financialGuardiansCount = guardians.filter((g) => g.is_financial_responsible).length;

  return (
    <div className="space-y-6">
      {/* Sub-Pill Navigation Hub */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-1.5 rounded-2xl border">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <Button
            variant={activeTab === "students" ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setActiveTab("students");
              setStatusFilter("all");
            }}
            className="h-8 text-xs font-bold gap-1.5 rounded-xl shrink-0"
            style={activeTab === "students" ? { backgroundColor: brandColor } : {}}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Estudiantes ({students.length})
          </Button>

          <Button
            variant={activeTab === "staff" ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setActiveTab("staff");
              setStatusFilter("all");
            }}
            className="h-8 text-xs font-bold gap-1.5 rounded-xl shrink-0"
            style={activeTab === "staff" ? { backgroundColor: brandColor } : {}}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Docentes & Planta ({staff.length})
          </Button>

          <Button
            variant={activeTab === "guardians" ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setActiveTab("guardians");
              setStatusFilter("all");
            }}
            className="h-8 text-xs font-bold gap-1.5 rounded-xl shrink-0"
            style={activeTab === "guardians" ? { backgroundColor: brandColor } : {}}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            Acudientes & Familias ({guardians.length})
          </Button>
        </div>

        {/* Global Alta Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {activeTab === "students" && (
            <Button
              onClick={() => setIsCreateStudentOpen(true)}
              className="gap-2 rounded-xl text-xs font-bold shadow-xs text-white h-8"
              style={{ backgroundColor: brandColor }}
            >
              <Plus className="w-4 h-4" />
              Alta de Estudiante
            </Button>
          )}

          {activeTab === "staff" && (
            <Button
              onClick={() => setIsCreateStaffOpen(true)}
              className="gap-2 rounded-xl text-xs font-bold shadow-xs text-white h-8"
              style={{ backgroundColor: brandColor }}
            >
              <Plus className="w-4 h-4" />
              Alta de Docente
            </Button>
          )}

          {activeTab === "guardians" && (
            <Button
              onClick={() => setIsCreateGuardianOpen(true)}
              className="gap-2 rounded-xl text-xs font-bold shadow-xs text-white h-8"
              style={{ backgroundColor: brandColor }}
            >
              <Plus className="w-4 h-4" />
              Vincular Acudiente
            </Button>
          )}
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase">
                Estudiantes Activos
              </p>
              <h4 className="text-2xl font-black text-foreground mt-0.5">
                {activeStudentsCount} / {students.length}
              </h4>
              <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
                Con carnet QR individual
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase">
                Docentes en Operación
              </p>
              <h4 className="text-2xl font-black text-foreground mt-0.5">
                {activeStaffCount} / {staff.length}
              </h4>
              <p className="text-[10px] text-primary font-medium mt-0.5">
                {courses.length} asignaturas cubiertas
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase">
                Acudientes DIAN
              </p>
              <h4 className="text-2xl font-black text-foreground mt-0.5">
                {financialGuardiansCount}
              </h4>
              <p className="text-[10px] text-amber-600 font-medium mt-0.5">
                Responsables Financieros
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase">
                Acceso a Portales
              </p>
              <h4 className="text-2xl font-black text-emerald-600 mt-0.5">
                100%
              </h4>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Tokens Cero-Login activos
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SearchFilterBar Row */}
      <SearchFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder={
          activeTab === "students"
            ? "Buscar por nombre, código estudiantil o sección..."
            : activeTab === "staff"
            ? "Buscar docente por nombre, email o materia..."
            : "Buscar acudiente por nombre, teléfono o estudiante..."
        }
        filters={
          activeTab === "students"
            ? [
                { id: "all", label: "Todos", count: students.length },
                { id: "active", label: "Activos", count: activeStudentsCount, color: "emerald" },
                { id: "withdrawn", label: "Retirados", count: withdrawnStudentsCount, color: "slate" },
              ]
            : activeTab === "staff"
            ? [
                { id: "all", label: "Todos", count: staff.length },
                { id: "active", label: "Activos", count: activeStaffCount, color: "emerald" },
                { id: "inactive", label: "Inactivos", count: staff.length - activeStaffCount, color: "slate" },
              ]
            : [
                { id: "all", label: "Todos", count: guardians.length },
                { id: "financial", label: "Responsable DIAN", count: financialGuardiansCount, color: "amber" },
              ]
        }
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
        defaultShowFilters={true}
        className="w-full"
      />

      {/* ============================================================== */}
      {/* TAB 1: ESTUDIANTES TABLE */}
      {/* ============================================================== */}
      {activeTab === "students" && (
        <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="p-3.5 pl-4">Estudiante / Código</th>
                  <th className="p-3.5">Grado & Grupo</th>
                  <th className="p-3.5">Ficha Médica</th>
                  <th className="p-3.5">Acudiente Principal</th>
                  <th className="p-3.5 text-center">Estado</th>
                  <th className="p-3.5 text-center">Acceso Portal</th>
                  <th className="p-3.5 pr-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No se encontraron estudiantes con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st) => (
                    <tr
                      key={st.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* Name & Avatar */}
                      <td className="p-3.5 pl-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9 rounded-xl border shadow-xs shrink-0">
                            <AvatarImage src={st.avatar_url || ""} />
                            <AvatarFallback
                              className="font-bold text-white text-xs rounded-xl"
                              style={{ backgroundColor: brandColor }}
                            >
                              {st.first_name?.[0] || "E"}
                              {st.last_name?.[0] || ""}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-foreground text-xs block leading-tight truncate">
                              {st.first_name} {st.last_name}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-muted text-muted-foreground border border-border/70 shrink-0 leading-none">
                                {st.student_code}
                              </span>
                              {st.email && (
                                <span className="text-[11px] text-muted-foreground truncate" title={st.email}>
                                  {st.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Grade & Section */}
                      <td className="p-3.5">
                        <span className="font-bold text-foreground block">
                          {st.section_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {st.grade_name} • {st.academic_year_name}
                        </span>
                      </td>

                      {/* Medical info */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-bold px-1.5 py-0 bg-rose-500/10 text-rose-600 border border-rose-500/20"
                          >
                            RH: {st.blood_type || "O+"}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground font-medium">
                            {st.eps || "Sura"}
                          </span>
                        </div>
                        {st.emergency_phone && (
                          <span className="text-[10px] text-muted-foreground font-mono mt-0.5 flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5 opacity-60" />
                            {st.emergency_phone}
                          </span>
                        )}
                      </td>

                      {/* Primary Guardian */}
                      <td className="p-3.5">
                        {st.primary_guardian ? (
                          <div>
                            <span className="font-semibold text-foreground block text-xs">
                              {st.primary_guardian.first_name} {st.primary_guardian.last_name}
                            </span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">
                                {st.primary_guardian.relationship === "mother"
                                  ? "Madre"
                                  : st.primary_guardian.relationship === "father"
                                  ? "Padre"
                                  : "Acudiente"}
                              </Badge>
                              {st.primary_guardian.is_financial_responsible && (
                                <span className="text-[9px] text-amber-600 font-bold">
                                  • DIAN
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60 italic text-[11px]">
                            Sin acudiente
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-2 py-0.5 font-bold uppercase",
                            st.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                          )}
                        >
                          {st.status === "active" ? "Matriculado" : "Retirado"}
                        </Badge>
                      </td>

                      {/* Direct Portal Link */}
                      <td className="p-3.5 text-center">
                        <TooltipProvider delayDuration={150}>
                          <div className="flex items-center justify-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    copyToClipboard(
                                      getStudentPortalUrl(st.qr_access_token),
                                      `Portal Estudiantil de ${st.first_name}`
                                    )
                                  }
                                  className="h-7 px-2 text-[10px] gap-1 font-mono hover:border-primary/40"
                                >
                                  <Copy className="w-3 h-3 text-muted-foreground" />
                                  <span>Token</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copiar enlace directo</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    openInNewTab(getStudentPortalUrl(st.qr_access_token))
                                  }
                                  className="h-7 w-7 p-0 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Abrir Portal Estudiantil</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    shareWhatsApp(
                                      st.primary_guardian?.phone || st.phone || undefined,
                                      `👋 Cordial saludo, familia de *${st.first_name} ${st.last_name}*. Les compartimos el enlace directo al Portal Estudiantil y Familiar de *${organizationName}*: ${getStudentPortalUrl(
                                        st.qr_access_token
                                      )} . Desde allí podrán consultar carnet con QR de acceso, seguimiento de calificaciones Decreto 1290 y pago de pensiones Wompi.`
                                    )
                                  }
                                  className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-500/30"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Enviar Invitación WhatsApp</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <TooltipProvider delayDuration={150}>
                            {/* Ver Ficha */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedStudentDetail(st)}
                                  className="h-7 w-7 p-0 hover:bg-muted"
                                >
                                  <Eye className="w-3.5 h-3.5 text-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver Ficha Integral & Carnet</TooltipContent>
                            </Tooltip>

                            {/* Editar */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingStudent(st)}
                                  className="h-7 w-7 p-0 hover:bg-muted"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-primary" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar Datos</TooltipContent>
                            </Tooltip>

                            {/* Baja / Retiro */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleStudentStatus(st)}
                                  className="h-7 w-7 p-0 hover:bg-muted"
                                >
                                  {st.status === "active" ? (
                                    <XCircle className="w-3.5 h-3.5 text-amber-600" />
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {st.status === "active" ? "Dar de Baja / Retirar" : "Reactivar Matrícula"}
                              </TooltipContent>
                            </Tooltip>

                            {/* Eliminar */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteStudent(st)}
                                  className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 border-border"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Eliminar Registro</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: DOCENTES / PERSONAL TABLE */}
      {/* ============================================================== */}
      {activeTab === "staff" && (
        <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="p-3.5 pl-4">Docente / Personal</th>
                  <th className="p-3.5">Rol Institucional</th>
                  <th className="p-3.5">Materias & Cursos Asignados</th>
                  <th className="p-3.5 text-center">Carga Semanal</th>
                  <th className="p-3.5 text-center">Estado</th>
                  <th className="p-3.5 text-center">Portal Táctico</th>
                  <th className="p-3.5 pr-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No se encontraron docentes con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((st) => (
                    <tr
                      key={st.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* Name & Avatar */}
                      <td className="p-3.5 pl-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9 rounded-xl border shadow-xs">
                            <AvatarImage src={st.photo_url || ""} />
                            <AvatarFallback
                              className="font-bold text-white text-xs rounded-xl"
                              style={{ backgroundColor: brandColor }}
                            >
                              {st.first_name?.[0] || "D"}
                              {st.last_name?.[0] || ""}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-bold text-foreground text-xs block leading-tight">
                              {st.first_name} {st.last_name}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              {st.email && (
                                <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                                  {st.email}
                                </span>
                              )}
                              {st.phone && (
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  • {st.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="p-3.5">
                        <Badge
                          variant="secondary"
                          className="font-semibold text-[10px] capitalize px-2 py-0.5"
                        >
                          {st.role === "teacher"
                            ? "Docente Titular"
                            : st.role === "coordinator"
                            ? "Coordinador Académico"
                            : st.role}
                        </Badge>
                      </td>

                      {/* Assigned Courses */}
                      <td className="p-3.5">
                        {st.assigned_courses && st.assigned_courses.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-sm">
                            {st.assigned_courses.map((c) => (
                              <Badge
                                key={c.id}
                                variant="outline"
                                className="text-[10px] font-medium border-primary/20 bg-primary/5 text-primary"
                              >
                                {c.subject_name} ({c.section?.name || "Grupo"})
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60 italic text-[11px]">
                            Sin asignaturas en curso
                          </span>
                        )}
                      </td>

                      {/* Weekly Hours */}
                      <td className="p-3.5 text-center font-bold font-mono">
                        <span className="inline-flex items-center gap-1 text-foreground">
                          {st.weekly_hours || 0} h/sem
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-2 py-0.5 font-bold uppercase",
                            st.is_active
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                          )}
                        >
                          {st.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                      </td>

                      {/* Portal Link */}
                      <td className="p-3.5 text-center">
                        <TooltipProvider delayDuration={150}>
                          <div className="flex items-center justify-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    copyToClipboard(
                                      getTeacherPortalUrl(st.access_token || ""),
                                      `Portal Docente de ${st.first_name}`
                                    )
                                  }
                                  className="h-7 px-2 text-[10px] gap-1 font-mono hover:border-primary/40"
                                >
                                  <Copy className="w-3 h-3 text-muted-foreground" />
                                  <span>Acceso</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copiar enlace directo al portal docente</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    openInNewTab(getTeacherPortalUrl(st.access_token || ""))
                                  }
                                  className="h-7 w-7 p-0 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Abrir Portal Docente</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    shareWhatsApp(
                                      st.phone || undefined,
                                      `👋 Estimado(a) profesor(a) *${st.first_name} ${st.last_name}*, te compartimos tu enlace de acceso directo al Portal Docente Táctico de *${organizationName}*: ${getTeacherPortalUrl(
                                        st.access_token || ""
                                      )} . Recuerda que no requieres contraseña para ingresar; desde allí puedes registrar asistencia diaria y calificaciones Decreto 1290.`
                                    )
                                  }
                                  className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-500/30"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Enviar Invitación WhatsApp</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <TooltipProvider delayDuration={150}>
                            {/* Ver Ficha Docente */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedStaffDetail(st)}
                                  className="h-7 w-7 p-0 hover:bg-muted"
                                >
                                  <Eye className="w-3.5 h-3.5 text-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ficha Docente & Carga</TooltipContent>
                            </Tooltip>

                            {/* Editar */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingStaff(st);
                                    setStaffSelectedCourses(
                                      st.assigned_courses?.map((c) => c.id) || []
                                    );
                                  }}
                                  className="h-7 w-7 p-0 hover:bg-muted"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-primary" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar Datos y Materias</TooltipContent>
                            </Tooltip>

                            {/* Toggle Activo */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleStaffStatus(st)}
                                  className="h-7 w-7 p-0 hover:bg-muted"
                                >
                                  {st.is_active ? (
                                    <XCircle className="w-3.5 h-3.5 text-amber-600" />
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {st.is_active ? "Inactivar Docente" : "Reactivar"}
                              </TooltipContent>
                            </Tooltip>

                            {/* Desvincular / Eliminar */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteStaff(st)}
                                  className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 border-border"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Desvincular Permanentemente</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: ACUDIENTES / FAMILIAS TABLE */}
      {/* ============================================================== */}
      {activeTab === "guardians" && (
        <div className="rounded-2xl border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="p-3.5 pl-4">Acudiente</th>
                  <th className="p-3.5">Parentesco</th>
                  <th className="p-3.5">Estudiante Vinculado</th>
                  <th className="p-3.5">Teléfono & WhatsApp</th>
                  <th className="p-3.5">Responsabilidad DIAN</th>
                  <th className="p-3.5 pr-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredGuardians.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No se encontraron acudientes registrados.
                    </td>
                  </tr>
                ) : (
                  filteredGuardians.map((g) => (
                    <tr
                      key={g.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* Guardian Name */}
                      <td className="p-3.5 pl-4">
                        <span className="font-bold text-foreground text-xs block">
                          {g.first_name} {g.last_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {g.document_type} {g.document_number}
                          {g.email ? ` • ${g.email}` : ""}
                        </span>
                      </td>

                      {/* Relationship */}
                      <td className="p-3.5">
                        <Badge variant="outline" className="capitalize text-[10px]">
                          {g.relationship === "mother"
                            ? "Madre"
                            : g.relationship === "father"
                            ? "Padre"
                            : g.relationship === "legal_guardian"
                            ? "Acudiente Legal"
                            : g.relationship}
                        </Badge>
                      </td>

                      {/* Student */}
                      <td className="p-3.5">
                        {g.student ? (
                          <span className="font-semibold text-foreground text-xs block">
                            {g.student.first_name} {g.student.last_name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic text-[11px]">
                            ID: {g.student_id.slice(0, 8)}...
                          </span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="p-3.5 font-mono">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          {g.phone}
                        </span>
                      </td>

                      {/* DIAN */}
                      <td className="p-3.5">
                        {g.is_financial_responsible ? (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] font-bold">
                            Responsable Financiero DIAN
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">
                            Contacto Familiar
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <TooltipProvider delayDuration={150}>
                            {/* WhatsApp Direct */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    shareWhatsApp(
                                      g.phone,
                                      `👋 Cordial saludo ${g.first_name} ${g.last_name}. Nos comunicamos desde la administración de ${organizationName}.`
                                    )
                                  }
                                  className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-500/30"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Escribir por WhatsApp</TooltipContent>
                            </Tooltip>

                            {/* Editar */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingGuardian(g)}
                                  className="h-7 w-7 p-0 hover:bg-muted"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-primary" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar Acudiente</TooltipContent>
                            </Tooltip>

                            {/* Eliminar */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteGuardian(g)}
                                  className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 border-border"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Eliminar Acudiente</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ALTA DE ESTUDIANTE */}
      {/* ============================================================== */}
      <Dialog open={isCreateStudentOpen} onOpenChange={setIsCreateStudentOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              Alta de Nuevo Estudiante (Matrícula SIEE)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Registra los datos curriculares, médicos y el carnet QR de acceso al portal familiar.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateStudent} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold block mb-1">Nombre(s) *</label>
                <Input
                  required
                  value={stFirstName}
                  onChange={(e) => setStFirstName(e.target.value)}
                  placeholder="Ej. Juan Andrés"
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Apellido(s) *</label>
                <Input
                  required
                  value={stLastName}
                  onChange={(e) => setStLastName(e.target.value)}
                  placeholder="Ej. Pérez Gómez"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold block mb-1">Grado & Grupo (Sección) *</label>
                <Select value={stSectionId} onValueChange={setStSectionId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecciona el grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((sec) => (
                      <SelectItem key={sec.id} value={sec.id} className="text-xs">
                        {sec.name} ({sec.grade?.name || "Grado"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">
                  Código Estudiantil (Opcional)
                </label>
                <Input
                  value={stCode}
                  onChange={(e) => setStCode(e.target.value)}
                  placeholder="Ej. EST-2026-042 (Autogenerado si vacío)"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold block mb-1">Tipo de Sangre (RH)</label>
                <Select value={stBloodType} onValueChange={setStBloodType}>
                  <SelectTrigger className="h-9 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((rh) => (
                      <SelectItem key={rh} value={rh} className="text-xs font-mono">
                        {rh}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">EPS / Prestador</label>
                <Input
                  value={stEps}
                  onChange={(e) => setStEps(e.target.value)}
                  placeholder="Ej. Sura, Sanitas"
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Teléfono Emergencia</label>
                <Input
                  value={stEmergencyPhone}
                  onChange={(e) => setStEmergencyPhone(e.target.value)}
                  placeholder="Ej. 310 123 4567"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Optional First Guardian Block */}
            <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <HeartHandshake className="w-4 h-4 text-primary" />
                  Vincular Acudiente Principal (Ley 115)
                </span>
                <Switch
                  checked={stWithGuardian}
                  onCheckedChange={setStWithGuardian}
                />
              </div>

              {stWithGuardian && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
                        Nombre Acudiente
                      </label>
                      <Input
                        value={stGFirstName}
                        onChange={(e) => setStGFirstName(e.target.value)}
                        placeholder="Ej. Carmen"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
                        Parentesco
                      </label>
                      <Select
                        value={stGRelation}
                        onValueChange={(val: any) => setStGRelation(val)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mother">Madre</SelectItem>
                          <SelectItem value="father">Padre</SelectItem>
                          <SelectItem value="legal_guardian">Acudiente Legal</SelectItem>
                          <SelectItem value="grandparent">Abuelo/a</SelectItem>
                          <SelectItem value="uncle_aunt">Tío/a</SelectItem>
                          <SelectItem value="other">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
                        WhatsApp Contacto
                      </label>
                      <Input
                        value={stGPhone}
                        onChange={(e) => setStGPhone(e.target.value)}
                        placeholder="315 987 6543"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="stGFinancial"
                      checked={stGFinancial}
                      onChange={(e) => setStGFinancial(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="stGFinancial" className="text-xs font-medium text-muted-foreground">
                      Designar como Responsable Financiero para facturación electrónica DIAN
                    </label>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateStudentOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="text-xs font-bold text-white"
                style={{ backgroundColor: brandColor }}
              >
                {isSubmitting ? "Registrando..." : "Confirmar Matrícula"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* MODAL: ALTA DE DOCENTE */}
      {/* ============================================================== */}
      <Dialog open={isCreateStaffOpen} onOpenChange={setIsCreateStaffOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Alta de Docente o Personal Académico
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Genera la cuenta de planta y su enlace directo al Portal Táctico con Zero-Login.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateStaff} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold block mb-1">Nombre(s) *</label>
                <Input
                  required
                  value={staffFirstName}
                  onChange={(e) => setStaffFirstName(e.target.value)}
                  placeholder="Ej. Roberto"
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Apellido(s) *</label>
                <Input
                  required
                  value={staffLastName}
                  onChange={(e) => setStaffLastName(e.target.value)}
                  placeholder="Ej. Sánchez"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold block mb-1">Correo Institucional *</label>
                <Input
                  type="email"
                  required
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="roberto.sanchez@sanmateo.edu.co"
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Teléfono / WhatsApp</label>
                <Input
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                  placeholder="+57 312 345 6789"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold block mb-1">Rol en el Colegio</label>
                <Select value={staffRole} onValueChange={setStaffRole}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher">Docente Titular de Asignatura</SelectItem>
                    <SelectItem value="homeroom_teacher">Director de Grupo</SelectItem>
                    <SelectItem value="coordinator">Coordinador Académico</SelectItem>
                    <SelectItem value="counselor">Orientador Escolar / Psicología</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Documento de Identidad (CC)</label>
                <Input
                  value={staffDocument}
                  onChange={(e) => setStaffDocument(e.target.value)}
                  placeholder="Ej. 1020304050"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Asignación de Materias Inicial */}
            <div>
              <label className="text-xs font-bold block mb-1">
                Asignar Materias / Cursos a su Carga Académica
              </label>
              <div className="max-h-40 overflow-y-auto p-3 rounded-xl border bg-muted/20 space-y-2">
                {courses.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No hay asignaturas creadas en el plan de estudios.
                  </p>
                ) : (
                  courses.map((course) => {
                    const isChecked = staffSelectedCourses.includes(course.id);
                    return (
                      <div
                        key={course.id}
                        onClick={() => {
                          setStaffSelectedCourses((prev) =>
                            isChecked ? prev.filter((id) => id !== course.id) : [...prev, course.id]
                          );
                        }}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors",
                          isChecked
                            ? "bg-primary/10 border-primary/40 text-primary font-bold"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            className="rounded pointer-events-none"
                          />
                          <span>{course.subject_name}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {course.section?.name || "Grupo"} • {course.weekly_hours}h
                        </Badge>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateStaffOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="text-xs font-bold text-white"
                style={{ backgroundColor: brandColor }}
              >
                {isSubmitting ? "Registrando..." : "Crear Docente & Enlace"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* MODAL: VINCULAR ACUDIENTE */}
      {/* ============================================================== */}
      <Dialog open={isCreateGuardianOpen} onOpenChange={setIsCreateGuardianOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-primary" />
              Vincular Acudiente / Familia (Ley 115 / DIAN)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Asocia un responsable legal o financiero a un estudiante matriculado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveGuardian} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold block mb-1">Estudiante Vinculado *</label>
              <Select value={gStudentId} onValueChange={setGStudentId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecciona el estudiante" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((st) => (
                    <SelectItem key={st.student_id} value={st.student_id} className="text-xs">
                      {st.first_name} {st.last_name} ({st.student_code} - {st.section_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold block mb-1">Nombre Acudiente *</label>
                <Input
                  required
                  value={gFirstName}
                  onChange={(e) => setGFirstName(e.target.value)}
                  placeholder="Ej. Martha"
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Apellido(s) *</label>
                <Input
                  required
                  value={gLastName}
                  onChange={(e) => setGLastName(e.target.value)}
                  placeholder="Ej. Castro Ríos"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold block mb-1">Parentesco</label>
                <Select
                  value={gRelationship}
                  onValueChange={(val: any) => setGRelationship(val)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mother">Madre</SelectItem>
                    <SelectItem value="father">Padre</SelectItem>
                    <SelectItem value="legal_guardian">Acudiente Legal</SelectItem>
                    <SelectItem value="grandparent">Abuelo(a)</SelectItem>
                    <SelectItem value="uncle_aunt">Tío(a)</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Tipo Documento</label>
                <Select value={gDocType} onValueChange={(val: any) => setGDocType(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CC">C.C. Cédula</SelectItem>
                    <SelectItem value="CE">C.E. Extranjería</SelectItem>
                    <SelectItem value="PP">Pasaporte</SelectItem>
                    <SelectItem value="NIT">NIT Empresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Número Documento</label>
                <Input
                  value={gDocNumber}
                  onChange={(e) => setGDocNumber(e.target.value)}
                  placeholder="Ej. 52345678"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold block mb-1">Teléfono / WhatsApp *</label>
                <Input
                  required
                  value={gPhone}
                  onChange={(e) => setGPhone(e.target.value)}
                  placeholder="Ej. 315 987 6543"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Correo Electrónico (Facturación)</label>
                <Input
                  type="email"
                  value={gEmail}
                  onChange={(e) => setGEmail(e.target.value)}
                  placeholder="martha@empresa.com"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="gFinancial"
                  checked={gFinancial}
                  onChange={(e) => setGFinancial(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="gFinancial" className="text-xs font-medium text-foreground">
                  Responsable Financiero para Facturación Electrónica DIAN y Pagos Wompi
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="gPrimary"
                  checked={gPrimary}
                  onChange={(e) => setGPrimary(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="gPrimary" className="text-xs font-medium text-foreground">
                  Contacto principal para notificaciones de asistencia y convivencia
                </label>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateGuardianOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="text-xs font-bold text-white"
                style={{ backgroundColor: brandColor }}
              >
                {isSubmitting ? "Guardando..." : "Vincular Acudiente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* MODAL: FICHA DETALLADA DEL ESTUDIANTE CON CARNET QR */}
      {/* ============================================================== */}
      <Dialog
        open={!!selectedStudentDetail}
        onOpenChange={(open) => !open && setSelectedStudentDetail(null)}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {selectedStudentDetail && (
            <div>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-base font-black flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-primary" />
                    Ficha Integral del Estudiante
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-bold uppercase",
                      selectedStudentDetail.status === "active"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                        : "bg-zinc-500/10 text-zinc-500"
                    )}
                  >
                    {selectedStudentDetail.status}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-3">
                {/* Header card */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border">
                  <Avatar className="w-14 h-14 rounded-2xl border-2 shadow-sm">
                    <AvatarImage src={selectedStudentDetail.avatar_url || ""} />
                    <AvatarFallback
                      className="font-black text-white text-base rounded-2xl"
                      style={{ backgroundColor: brandColor }}
                    >
                      {selectedStudentDetail.first_name?.[0] || "E"}
                      {selectedStudentDetail.last_name?.[0] || ""}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-black text-base text-foreground">
                      {selectedStudentDetail.first_name} {selectedStudentDetail.last_name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedStudentDetail.grade_name} • Grupo {selectedStudentDetail.section_name} • Año {selectedStudentDetail.academic_year_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {selectedStudentDetail.student_code}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-bold bg-rose-500/10 text-rose-600"
                      >
                        RH: {selectedStudentDetail.blood_type || "O+"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* QR Code and Direct Link Hub */}
                <div className="p-4 rounded-2xl border bg-card flex flex-col sm:flex-row items-center gap-4">
                  <div className="p-2.5 bg-white rounded-xl border shadow-xs shrink-0">
                    <QRCode
                      value={getStudentPortalUrl(selectedStudentDetail.qr_access_token)}
                      size={100}
                    />
                  </div>
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <div>
                      <h4 className="text-xs font-bold text-foreground">
                        Credencial de Acceso y Carnet Digital
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Token activo para Zero-Login en el Portal de Estudiantes y Familias.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          copyToClipboard(
                            getStudentPortalUrl(selectedStudentDetail.qr_access_token),
                            "Enlace del Portal Estudiantil"
                          )
                        }
                        className="h-7 text-xs gap-1 font-semibold"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copiar Enlace
                      </Button>

                      <Button
                        size="sm"
                        onClick={() =>
                          openInNewTab(getStudentPortalUrl(selectedStudentDetail.qr_access_token))
                        }
                        className="h-7 text-xs gap-1 font-semibold text-white"
                        style={{ backgroundColor: brandColor }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Abrir Portal
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRegenerateStudentQr(selectedStudentDetail)}
                        className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                      >
                        <RotateCw className="w-3 h-3" />
                        Regenerar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Medical & Emergency Block */}
                <div className="p-4 rounded-2xl border bg-muted/20 space-y-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <HeartPulse className="w-4 h-4 text-rose-500" />
                    Información Médica & Emergencias
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground text-[10px] block">EPS</span>
                      <span className="font-semibold text-foreground">
                        {selectedStudentDetail.eps || "Sura"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] block">Grupo Sanguíneo</span>
                      <span className="font-semibold text-foreground font-mono">
                        {selectedStudentDetail.blood_type || "O+"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[10px] block">Tel. Emergencia</span>
                      <span className="font-semibold text-foreground font-mono">
                        {selectedStudentDetail.emergency_phone || "No registrado"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Guardians list */}
                <div className="p-4 rounded-2xl border bg-muted/20 space-y-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <HeartHandshake className="w-4 h-4 text-primary" />
                    Acudientes Vinculados ({selectedStudentDetail.guardians.length})
                  </span>
                  {selectedStudentDetail.guardians.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      No hay acudientes registrados para este estudiante.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedStudentDetail.guardians.map((g) => (
                        <div
                          key={g.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-card border text-xs"
                        >
                          <div>
                            <span className="font-semibold text-foreground">
                              {g.first_name} {g.last_name}
                            </span>
                            <span className="text-[10px] text-muted-foreground ml-2">
                              ({g.relationship === "mother" ? "Madre" : g.relationship === "father" ? "Padre" : "Acudiente"})
                            </span>
                            {g.is_financial_responsible && (
                              <Badge className="ml-2 bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px]">
                                DIAN
                              </Badge>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              shareWhatsApp(
                                g.phone,
                                `👋 Hola ${g.first_name}, te escribimos desde ${organizationName}.`
                              )
                            }
                            className="h-7 px-2 text-emerald-600 gap-1 text-xs"
                          >
                            <Phone className="w-3 h-3" />
                            {g.phone}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* MODAL: FICHA DETALLADA DEL DOCENTE */}
      {/* ============================================================== */}
      <Dialog
        open={!!selectedStaffDetail}
        onOpenChange={(open) => !open && setSelectedStaffDetail(null)}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {selectedStaffDetail && (
            <div>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-base font-black flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    Ficha de Docente & Operación Táctica
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-bold uppercase",
                      selectedStaffDetail.is_active
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                        : "bg-zinc-500/10 text-zinc-500"
                    )}
                  >
                    {selectedStaffDetail.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-3">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border">
                  <Avatar className="w-14 h-14 rounded-2xl border-2 shadow-sm">
                    <AvatarImage src={selectedStaffDetail.photo_url || ""} />
                    <AvatarFallback
                      className="font-black text-white text-base rounded-2xl"
                      style={{ backgroundColor: brandColor }}
                    >
                      {selectedStaffDetail.first_name?.[0] || "D"}
                      {selectedStaffDetail.last_name?.[0] || ""}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-black text-base text-foreground">
                      {selectedStaffDetail.first_name} {selectedStaffDetail.last_name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedStaffDetail.email} • {selectedStaffDetail.phone || "Sin teléfono"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {selectedStaffDetail.role === "teacher"
                          ? "Docente Titular"
                          : selectedStaffDetail.role}
                      </Badge>
                      <span className="text-[11px] font-bold font-mono text-primary">
                        {selectedStaffDetail.weekly_hours || 0} horas semanales
                      </span>
                    </div>
                  </div>
                </div>

                {/* Direct Tactical Access Hub */}
                <div className="p-4 rounded-2xl border bg-card space-y-2">
                  <h4 className="text-xs font-bold text-foreground">
                    Acceso Cero-Login al Portal Docente Táctico
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    El docente no requiere ingresar contraseña ni correo; este enlace carga su ribbon pedagógico, registro de calificaciones y toma de asistencia.
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(
                          getTeacherPortalUrl(selectedStaffDetail.access_token || ""),
                          "Enlace al Portal Docente"
                        )
                      }
                      className="h-8 text-xs gap-1 font-semibold"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copiar Enlace Directo
                    </Button>

                    <Button
                      size="sm"
                      onClick={() =>
                        openInNewTab(getTeacherPortalUrl(selectedStaffDetail.access_token || ""))
                      }
                      className="h-8 text-xs gap-1 font-semibold text-white"
                      style={{ backgroundColor: brandColor }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Abrir Portal
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRegenerateStaffToken(selectedStaffDetail)}
                      className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
                    >
                      <RotateCw className="w-3 h-3" />
                      Regenerar
                    </Button>
                  </div>
                </div>

                {/* Assigned Courses List */}
                <div className="p-4 rounded-2xl border bg-muted/20 space-y-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-primary" />
                    Asignaturas Asignadas ({selectedStaffDetail.assigned_courses?.length || 0})
                  </span>
                  {!selectedStaffDetail.assigned_courses ||
                  selectedStaffDetail.assigned_courses.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      No tiene materias asignadas en este momento.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedStaffDetail.assigned_courses.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-card border text-xs"
                        >
                          <div>
                            <span className="font-bold text-foreground">{c.subject_name}</span>
                            <span className="text-[10px] text-muted-foreground ml-2">
                              Grupo {c.section?.name || "9°A"}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {c.weekly_hours} hrs/sem
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* MODAL: EDITAR ESTUDIANTE */}
      {/* ============================================================== */}
      <Dialog
        open={!!editingStudent}
        onOpenChange={(open) => !open && setEditingStudent(null)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {editingStudent && (
            <form onSubmit={handleUpdateStudent}>
              <DialogHeader>
                <DialogTitle className="text-base font-black">
                  Editar Datos del Estudiante
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 py-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold block mb-1">Nombre</label>
                    <Input
                      value={editingStudent.first_name}
                      onChange={(e) =>
                        setEditingStudent({ ...editingStudent, first_name: e.target.value })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Apellido</label>
                    <Input
                      value={editingStudent.last_name}
                      onChange={(e) =>
                        setEditingStudent({ ...editingStudent, last_name: e.target.value })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold block mb-1">Código Estudiantil</label>
                    <Input
                      value={editingStudent.student_code}
                      onChange={(e) =>
                        setEditingStudent({ ...editingStudent, student_code: e.target.value })
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Grupo / Sección</label>
                    <Select
                      value={editingStudent.section_id}
                      onValueChange={(val) =>
                        setEditingStudent({ ...editingStudent, section_id: val })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sections.map((s) => (
                          <SelectItem key={s.id} value={s.id} className="text-xs">
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold block mb-1">EPS</label>
                    <Input
                      value={editingStudent.eps || ""}
                      onChange={(e) =>
                        setEditingStudent({ ...editingStudent, eps: e.target.value })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Tel. Emergencia</label>
                    <Input
                      value={editingStudent.emergency_phone || ""}
                      onChange={(e) =>
                        setEditingStudent({ ...editingStudent, emergency_phone: e.target.value })
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">Estado de Matrícula</label>
                  <Select
                    value={editingStudent.status}
                    onValueChange={(val: any) =>
                      setEditingStudent({ ...editingStudent, status: val })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo / Matriculado</SelectItem>
                      <SelectItem value="withdrawn">Retirado / Desvinculado</SelectItem>
                      <SelectItem value="suspended">Suspendido</SelectItem>
                      <SelectItem value="graduated">Graduado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingStudent(null)}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="text-xs font-bold text-white"
                  style={{ backgroundColor: brandColor }}
                >
                  {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* MODAL: EDITAR DOCENTE */}
      {/* ============================================================== */}
      <Dialog
        open={!!editingStaff}
        onOpenChange={(open) => !open && setEditingStaff(null)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {editingStaff && (
            <form onSubmit={handleUpdateStaff}>
              <DialogHeader>
                <DialogTitle className="text-base font-black flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Editar Docente o Personal
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Actualiza datos de contacto y materias asignadas a su carga horaria.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold block mb-1">Nombre</label>
                    <Input
                      required
                      value={editingStaff.first_name}
                      onChange={(e) =>
                        setEditingStaff({ ...editingStaff, first_name: e.target.value })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Apellido</label>
                    <Input
                      required
                      value={editingStaff.last_name}
                      onChange={(e) =>
                        setEditingStaff({ ...editingStaff, last_name: e.target.value })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold block mb-1">Correo Institucional</label>
                    <Input
                      type="email"
                      required
                      value={editingStaff.email || ""}
                      onChange={(e) =>
                        setEditingStaff({ ...editingStaff, email: e.target.value })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Teléfono / WhatsApp</label>
                    <Input
                      value={editingStaff.phone || ""}
                      onChange={(e) =>
                        setEditingStaff({ ...editingStaff, phone: e.target.value })
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold block mb-1">Rol</label>
                    <Select
                      value={editingStaff.role}
                      onValueChange={(val) =>
                        setEditingStaff({ ...editingStaff, role: val })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="teacher">Docente Titular</SelectItem>
                        <SelectItem value="homeroom_teacher">Director de Grupo</SelectItem>
                        <SelectItem value="coordinator">Coordinador Académico</SelectItem>
                        <SelectItem value="counselor">Orientador Escolar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-bold block mb-1">Estado</label>
                    <Select
                      value={editingStaff.is_active ? "active" : "inactive"}
                      onValueChange={(val) =>
                        setEditingStaff({ ...editingStaff, is_active: val === "active" })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="inactive">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Materias asignadas */}
                <div>
                  <label className="text-xs font-bold block mb-1">
                    Carga Académica Asignada
                  </label>
                  <div className="max-h-40 overflow-y-auto p-2.5 rounded-xl border bg-muted/20 space-y-1.5">
                    {courses.map((course) => {
                      const isChecked = staffSelectedCourses.includes(course.id);
                      return (
                        <div
                          key={course.id}
                          onClick={() => {
                            setStaffSelectedCourses((prev) =>
                              isChecked
                                ? prev.filter((id) => id !== course.id)
                                : [...prev, course.id]
                            );
                          }}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors",
                            isChecked
                              ? "bg-primary/10 border-primary/40 text-primary font-bold"
                              : "hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              className="rounded pointer-events-none"
                            />
                            <span>{course.subject_name}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {course.section?.name || "Grupo"} • {course.weekly_hours}h
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingStaff(null)}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="text-xs font-bold text-white"
                  style={{ backgroundColor: brandColor }}
                >
                  {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* MODAL: EDITAR ACUDIENTE */}
      {/* ============================================================== */}
      <Dialog
        open={!!editingGuardian}
        onOpenChange={(open) => !open && setEditingGuardian(null)}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {editingGuardian && (
            <form onSubmit={handleUpdateGuardian}>
              <DialogHeader>
                <DialogTitle className="text-base font-black flex items-center gap-2">
                  <HeartHandshake className="w-5 h-5 text-primary" />
                  Editar Acudiente / Familia
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Actualiza información de parentesco, contacto y responsabilidad DIAN.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold block mb-1">Nombre</label>
                    <Input
                      required
                      value={editingGuardian.first_name}
                      onChange={(e) =>
                        setEditingGuardian({ ...editingGuardian, first_name: e.target.value })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Apellido</label>
                    <Input
                      required
                      value={editingGuardian.last_name}
                      onChange={(e) =>
                        setEditingGuardian({ ...editingGuardian, last_name: e.target.value })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold block mb-1">Parentesco</label>
                    <Select
                      value={editingGuardian.relationship}
                      onValueChange={(val: any) =>
                        setEditingGuardian({ ...editingGuardian, relationship: val })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mother">Madre</SelectItem>
                        <SelectItem value="father">Padre</SelectItem>
                        <SelectItem value="legal_guardian">Acudiente Legal</SelectItem>
                        <SelectItem value="grandparent">Abuelo(a)</SelectItem>
                        <SelectItem value="uncle_aunt">Tío(a)</SelectItem>
                        <SelectItem value="other">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">Teléfono / WhatsApp</label>
                    <Input
                      required
                      value={editingGuardian.phone}
                      onChange={(e) =>
                        setEditingGuardian({ ...editingGuardian, phone: e.target.value })
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1">Correo Electrónico</label>
                  <Input
                    type="email"
                    value={editingGuardian.email || ""}
                    onChange={(e) =>
                      setEditingGuardian({ ...editingGuardian, email: e.target.value })
                    }
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="editGFinancial"
                      checked={editingGuardian.is_financial_responsible}
                      onChange={(e) =>
                        setEditingGuardian({
                          ...editingGuardian,
                          is_financial_responsible: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="editGFinancial" className="text-xs font-medium text-foreground">
                      Responsable Financiero DIAN
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="editGPrimary"
                      checked={editingGuardian.is_primary_contact}
                      onChange={(e) =>
                        setEditingGuardian({
                          ...editingGuardian,
                          is_primary_contact: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="editGPrimary" className="text-xs font-medium text-foreground">
                      Contacto Principal
                    </label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingGuardian(null)}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="text-xs font-bold text-white"
                  style={{ backgroundColor: brandColor }}
                >
                  {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
