import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/modules/core/database/supabase-server";
import { requireOrgRole, getCurrentOrgRole } from "@/modules/core/iam/services/org-roles";
import {
  getCurrentOrganizationId,
  getCurrentOrgName,
} from "@/modules/core/organizations/organization-actions";
import { getCurrentOrgDetails } from "@/modules/core/organizations/actions/crud";
import { getOrgSpaceCategory } from "@/modules/core/organizations/space-helpers";
import { getEffectiveBranding } from "@/modules/core/branding/actions";
import { getLeasesAction } from "@/modules/features/rentals/actions/leases";
import { getSettlementsAction } from "@/modules/features/rentals/actions/settlements";
import {
  RentalsWorkspace,
  RentalsTabKey,
} from "@/modules/features/rentals/components/rentals-workspace";

export async function generateMetadata() {
  const orgName = (await getCurrentOrgName()) || "Pixy";
  return {
    title: `Gestión de Arriendos & RentFlow | ${orgName}`,
    description: `Administración de contratos de arrendamiento, control de cobranza y liquidaciones a propietarios de ${orgName}.`,
    robots: "noindex, nofollow",
  };
}

function RentalsWorkspaceSkeleton() {
  return (
    <div className="space-y-6 animate-pulse pb-12">
      {/* Header skeleton */}
      <div className="h-16 rounded-3xl bg-zinc-100 dark:bg-zinc-900" />
      {/* 4 KPIs skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
        ))}
      </div>
      {/* Navigation tabs skeleton */}
      <div className="h-12 w-full max-w-xl rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      {/* Search & filter bar skeleton */}
      <div className="h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      {/* Cards grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-64 rounded-3xl bg-zinc-100 dark:bg-zinc-900" />
        ))}
      </div>
    </div>
  );
}

export default async function RentalsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }> | { tab?: string };
}) {
  // 1. Session verification: redirect unauthenticated users to /login?redirect=/rentals
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/rentals");
  }

  // 2. IAM Role check: require at least 'member'
  await requireOrgRole("member");

  // 3. Organization context resolution
  const orgId = await getCurrentOrganizationId();
  if (!orgId) {
    redirect("/login");
  }

  // 4. Space category verification: restrict exclusively to 'real_estate'
  const spaceCategory = await getOrgSpaceCategory(orgId);
  if (spaceCategory !== "real_estate") {
    redirect("/dashboard?error=module_restricted");
  }

  // 5. Resolve search params tab if provided
  const resolvedParams = searchParams ? await Promise.resolve(searchParams) : {};
  const rawTab = resolvedParams?.tab as RentalsTabKey | undefined;
  const initialTab: RentalsTabKey =
    rawTab === "collections" || rawTab === "settlements" ? rawTab : "leases";

  // 6. Parallel Server-Side Data Fetching
  const [
    leasesRes,
    settlementsRes,
    propertiesRes,
    contactsRes,
    orgDetails,
    branding,
    userRole,
  ] = await Promise.all([
    getLeasesAction(),
    getSettlementsAction(),
    supabase
      .from("service_catalog")
      .select("id, name, base_price, classification, real_estate_details, images, gallery_images")
      .eq("organization_id", orgId)
      .eq("classification", "real_estate")
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("leads")
      .select("id, name, email, phone, metadata, company_name, status")
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .order("name"),
    getCurrentOrgDetails(orgId),
    getEffectiveBranding(orgId),
    getCurrentOrgRole(orgId),
  ]);

  const properties = propertiesRes.data || [];
  const contacts = contactsRes.data || [];
  const leases = leasesRes.data || [];
  const settlements = settlementsRes.data || [];

  return (
    <Suspense fallback={<RentalsWorkspaceSkeleton />}>
      <RentalsWorkspace
        initialLeases={leases}
        initialSettlements={settlements}
        properties={properties}
        contacts={contacts}
        organization={{
          id: orgId,
          name: orgDetails?.name || branding?.name || "Praxis Inmobiliaria",
          slug: orgDetails?.slug || orgId,
          currency: "COP",
        }}
        userRole={userRole || "member"}
        initialTab={initialTab}
      />
    </Suspense>
  );
}
