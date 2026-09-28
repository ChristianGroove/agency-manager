// ==============================================================================
// PIXY EDU — SCHOOL SPACE DASHBOARD PAGE
// Path: src/app/(dashboard)/school/page.tsx
// ==============================================================================

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/modules/core/database/supabase-server";
import {
  getCurrentOrganizationId,
  getCurrentOrgName,
} from "@/modules/core/organizations/organization-actions";
import { getEffectiveBranding } from "@/modules/core/branding/actions";
import {
  SchoolDashboardView,
  getSchoolDirectoryDataAction,
  type SchoolCourse,
  type SchoolBadge,
  type SchoolStudentWithDetails,
  type SchoolStaffMember,
  type SchoolGuardian,
  type SchoolSection,
} from "@/modules/features/school";

export async function generateMetadata() {
  const orgName = (await getCurrentOrgName()) || "Pixy Edu";
  return {
    title: `Gestión Académica & Boletines | ${orgName}`,
    description: `Control curricular, calificaciones Decreto 1290, carnets QR y cobranza para ${orgName}.`,
    robots: "noindex, nofollow",
  };
}

export default async function SchoolPage(props: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const searchParams = await props.searchParams;
  const initialTab = searchParams?.tab || "dashboard";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/school");
  }

  const orgId = await getCurrentOrganizationId();
  const orgName = (await getCurrentOrgName()) || "Institución Educativa";
  const branding = orgId ? await getEffectiveBranding(orgId) : null;
  const brandColor = branding?.colors?.primary || "#1e40af";

  // Fetch courses, badges and complete directory for this organization
  let courses: SchoolCourse[] = [];
  let badges: SchoolBadge[] = [];
  let directoryStudents: SchoolStudentWithDetails[] = [];
  let directoryStaff: SchoolStaffMember[] = [];
  let directoryGuardians: SchoolGuardian[] = [];
  let directorySections: SchoolSection[] = [];

  if (orgId) {
    const [coursesRes, badgesRes, directoryRes] = await Promise.all([
      supabase
        .from("school_courses")
        .select(`
          id,
          organization_id,
          section_id,
          area_id,
          subject_name,
          lead_teacher_id,
          weekly_hours,
          area_weight_percentage,
          color,
          icon,
          section:school_sections (
            id,
            name
          ),
          area:school_academic_areas (
            id,
            name
          ),
          lead_teacher:organization_staff (
            id,
            first_name,
            last_name,
            email,
            photo_url
          )
        `)
        .eq("organization_id", orgId),
      supabase
        .from("school_badges_catalog")
        .select("*")
        .eq("organization_id", orgId)
        .eq("is_active", true),
      getSchoolDirectoryDataAction(orgId),
    ]);

    if (coursesRes.data) {
      courses = coursesRes.data as unknown as SchoolCourse[];
    }
    if (badgesRes.data) {
      badges = badgesRes.data as unknown as SchoolBadge[];
    }
    if (directoryRes.success && directoryRes.data) {
      directoryStudents = directoryRes.data.students;
      directoryStaff = directoryRes.data.staff;
      directoryGuardians = directoryRes.data.guardians;
      directorySections = directoryRes.data.sections;
    }
  }

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] pb-12">
      <Suspense fallback={<div className="p-8 animate-pulse text-muted-foreground">Cargando Campus Pixy Edu...</div>}>
        <SchoolDashboardView
          organizationName={orgName}
          brandColor={brandColor}
          courses={courses}
          badges={badges}
          initialTab={initialTab}
          directoryStudents={directoryStudents}
          directoryStaff={directoryStaff}
          directoryGuardians={directoryGuardians}
          directorySections={directorySections}
        />
      </Suspense>
    </div>
  );
}
