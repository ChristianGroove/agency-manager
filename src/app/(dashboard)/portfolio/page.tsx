import { Suspense } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/modules/core/database/supabase-server"
import { requireOrgRole, getCurrentOrgRole } from "@/modules/core/iam/services/org-roles"
import {
  getCurrentOrganizationId,
  getCurrentOrgName,
} from "@/modules/core/organizations/organization-actions"
import { getCurrentOrgDetails } from "@/modules/core/organizations/actions/crud"
import { getOrgSpaceCategory } from "@/modules/core/organizations/space-helpers"
import { getCatalogItemsAction } from "@/modules/features/catalog/actions"
import { getCategories } from "@/modules/features/catalog/categories-actions"
import { getAttributeGroupsAction } from "@/modules/features/catalog/attributes-actions"
import { getStorefrontThemeConfigAction } from "@/modules/features/catalog/customizer-actions"
import { getEffectiveBranding } from "@/modules/core/branding/actions"
import { CatalogWorkspace, WorkspaceTabKey } from "@/modules/features/catalog/components/catalog-workspace"

export async function generateMetadata() {
  const orgName = (await getCurrentOrgName()) || "Pixy"
  return {
    title: `Catálogo & Portal de Servicios | ${orgName}`,
    description: `Explora el catálogo comercial y portafolio de servicios de ${orgName}.`,
    robots: "index, follow",
  }
}

function CatalogWorkspaceSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="h-16 rounded-3xl bg-zinc-100 dark:bg-zinc-900" />
      {/* Navigation tabs skeleton */}
      <div className="h-12 w-96 rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      {/* Filter bar skeleton */}
      <div className="h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      {/* Cards grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-64 rounded-3xl bg-zinc-100 dark:bg-zinc-900" />
        ))}
      </div>
    </div>
  )
}

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }> | { tab?: string }
}) {
  // 1. Session verification
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?redirect=/portfolio")
  }

  // 2. IAM Role check: require at least 'member'
  await requireOrgRole("member")

  // 3. Organization context resolution
  const orgId = await getCurrentOrganizationId()
  if (!orgId) {
    redirect("/login")
  }

  // 4. Resolve search params tab if provided
  const resolvedParams = searchParams ? await Promise.resolve(searchParams) : {}
  const rawTab = resolvedParams?.tab as WorkspaceTabKey | undefined
  const initialTab: WorkspaceTabKey =
    rawTab === "attributes" || rawTab === "customizer" ? rawTab : "catalog"

  // 5. Parallel Server-Side Data Fetching
  const [
    itemsRes,
    categories,
    attributeGroups,
    themeConfig,
    orgDetails,
    branding,
    spaceType,
    userRole,
  ] = await Promise.all([
    getCatalogItemsAction({ includeInactive: true }),
    getCategories(orgId),
    getAttributeGroupsAction(orgId),
    getStorefrontThemeConfigAction({ orgId }),
    getCurrentOrgDetails(orgId),
    getEffectiveBranding(orgId),
    getOrgSpaceCategory(orgId),
    getCurrentOrgRole(orgId),
  ])

  return (
    <Suspense fallback={<CatalogWorkspaceSkeleton />}>
      <CatalogWorkspace
        initialItems={itemsRes.data || []}
        initialCategories={categories || []}
        initialAttributeGroups={attributeGroups || []}
        initialThemeConfig={themeConfig}
        organization={{
          id: orgId,
          name: orgDetails?.name || branding?.name || "Mi Negocio",
          slug: orgDetails?.slug || orgId,
          customDomain: orgDetails?.custom_portal_domain || branding?.custom_domain || null,
          customDomainStatus: (orgDetails as any)?.custom_domain_status || (orgDetails?.custom_portal_domain ? 'active' : 'unconfigured'),
          spaceType: spaceType || "agency",
          currency: "COP",
          logos: {
            dark: branding?.logos?.main || null,
            light: branding?.logos?.main_light || null,
          },
        }}
        userRole={userRole || "member"}
        initialTab={initialTab}
      />
    </Suspense>
  )
}
