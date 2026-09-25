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
import { SchoolDashboardView } from "@/modules/features/school";
import type { SchoolCourse, SchoolBadge } from "@/modules/features/school";

export async function generateMetadata() {
  const orgName = (await getCurrentOrgName()) || "Pixy Edu";
  return {
    title: `Gestión Académica & Boletines | ${orgName}`,
    description: `Control curricular, calificaciones Decreto 1290, carnets QR y cobranza para ${orgName}.`,
    robots: "noindex, nofollow",
  };
}

export default async function SchoolPage() {
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
  const brandColor = branding?.colors?.primary || "#2563eb";

  // Fetch courses and badges for this organization if they exist
  let courses: SchoolCourse[] = [];
  let badges: SchoolBadge[] = [];

  if (orgId) {
    const [coursesRes, badgesRes] = await Promise.all([
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
    ]);

    if (coursesRes.data) {
      courses = coursesRes.data as unknown as SchoolCourse[];
    }
    if (badgesRes.data) {
      badges = badgesRes.data as unknown as SchoolBadge[];
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
        />
      </Suspense>
    </div>
  );
}
