// ==============================================================================
// PIXY EDU — TEACHER TACTICAL PORTAL SERVER ACTIONS
// Module: module_school (School Space)
// Path: src/modules/features/school/actions/teacher-portal-actions.ts
// ==============================================================================

"use server";

import { createClient } from "@/modules/core/database/supabase-server";
import { supabaseAdmin } from "@/modules/core/database/supabase-admin";
import type { SchoolCourse, SchoolAssignment, SchoolEnrollment } from "../types/school.types";

export interface TeacherPortalData {
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    photoUrl?: string | null;
    role?: string | null;
  };
  organization: {
    id: string;
    name: string;
    logoUrl?: string | null;
    primaryColor: string;
    secondaryColor: string;
  };
  courses: SchoolCourse[];
  activePeriod?: {
    id: string;
    name: string;
    periodNumber: number;
    isGradingOpen: boolean;
  } | null;
}

/**
 * Validates a teacher's cryptographic access token and loads their assigned courses
 */
export async function getTeacherPortalData(token: string): Promise<TeacherPortalData | null> {
  if (!token || token.length < 8) return null;

  try {
    const supabase = supabaseAdmin;

    // 1. Resolve staff by token
    const { data: staff, error: staffErr } = await supabase
      .from("organization_staff")
      .select("id, organization_id, first_name, last_name, email, photo_url, role")
      .eq("access_token", token)
      .single();

    if (staffErr || !staff) {
      return null;
    }

    // 2. Fetch organization & branding
    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, logo_url, primary_color, secondary_color")
      .eq("id", staff.organization_id)
      .single();

    // 3. Fetch courses where teacher is lead or co-teacher
    const { data: coursesData } = await supabase
      .from("school_courses")
      .select(`
        id,
        organization_id,
        section_id,
        area_id,
        subject_name,
        lead_teacher_id,
        co_teachers,
        weekly_hours,
        area_weight_percentage,
        color,
        icon,
        section:school_sections(id, name),
        area:school_academic_areas(id, name)
      `)
      .eq("organization_id", staff.organization_id)
      .or(`lead_teacher_id.eq.${staff.id},co_teachers.cs.{${staff.id}}`);

    // 4. Fetch active period
    const { data: periodData } = await supabase
      .from("school_periods")
      .select("id, name, period_number, is_grading_open")
      .eq("organization_id", staff.organization_id)
      .eq("is_closed", false)
      .order("period_number", { ascending: true })
      .limit(1)
      .maybeSingle();

    return {
      teacher: {
        id: staff.id,
        firstName: staff.first_name,
        lastName: staff.last_name,
        email: staff.email,
        photoUrl: staff.photo_url,
        role: staff.role || "Docente",
      },
      organization: {
        id: org?.id || staff.organization_id,
        name: org?.name || "Colegio",
        logoUrl: org?.logo_url,
        primaryColor: org?.primary_color || "#2563eb",
        secondaryColor: org?.secondary_color || "#38bdf8",
      },
      courses: (coursesData || []) as unknown as SchoolCourse[],
      activePeriod: periodData
        ? {
            id: periodData.id,
            name: periodData.name,
            periodNumber: periodData.period_number,
            isGradingOpen: periodData.is_grading_open,
          }
        : null,
    };
  } catch (err) {
    console.error("[ACTION:getTeacherPortalData] Error:", err);
    return null;
  }
}

/**
 * Loads student roster and existing evaluations for a specific course
 */
export async function getCourseRosterAction(courseId: string, periodId?: string) {
  try {
    const supabase = supabaseAdmin;

    // Fetch course details
    const { data: course } = await supabase
      .from("school_courses")
      .select("id, organization_id, section_id, subject_name")
      .eq("id", courseId)
      .single();

    if (!course) return { success: false, error: "Curso no encontrado" };

    // Fetch students enrolled in this section
    const { data: enrollments } = await supabase
      .from("school_enrollments")
      .select(`
        id,
        student_code,
        status,
        qr_access_token,
        student:leads (
          id,
          first_name,
          last_name,
          email,
          phone,
          avatar_url
        )
      `)
      .eq("organization_id", course.organization_id)
      .eq("section_id", course.section_id)
      .eq("status", "active")
      .order("student_code", { ascending: true });

    // Fetch assignments in this course
    let assignmentsQuery = supabase
      .from("school_assignments")
      .select("*")
      .eq("course_id", courseId)
      .order("due_date", { ascending: true });

    if (periodId) {
      assignmentsQuery = assignmentsQuery.eq("period_id", periodId);
    }

    const { data: assignments } = await assignmentsQuery;

    // Fetch existing grades
    const assignmentIds = (assignments || []).map((a) => a.id);
    let grades: any[] = [];
    if (assignmentIds.length > 0) {
      const { data: gradesData } = await supabase
        .from("school_grades_records")
        .select("*")
        .in("assignment_id", assignmentIds);
      grades = gradesData || [];
    }

    return {
      success: true,
      data: {
        course,
        enrollments: enrollments || [],
        assignments: assignments || [],
        grades,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Error al cargar nómina de estudiantes" };
  }
}
