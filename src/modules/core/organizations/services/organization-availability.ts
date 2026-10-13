type OrganizationAvailability = { status?: string | null; deleted_at?: string | null }
type MembershipAvailability = OrganizationAvailability & { organization?: OrganizationAvailability | OrganizationAvailability[] | null }

/** Archived tenants stay in administrative history, but cannot be selected as a workspace. */
export function isOrganizationAvailable(organization?: OrganizationAvailability | null) {
    return !!organization && organization.status !== 'archived' && !organization.deleted_at
}

export function isMembershipAvailable(member?: MembershipAvailability | null) {
    if (!member || member.status === 'blocked' || member.deleted_at) return false
    const organization = Array.isArray(member.organization)
        ? (member.organization.length === 1 ? member.organization[0] : null)
        : member.organization
    return isOrganizationAvailable(organization)
}
