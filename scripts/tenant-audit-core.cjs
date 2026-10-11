function auditTenantOwnership(organizations, members, users) {
    const repairs = [], unresolved = [], duplicateCandidates = [];
    const userMap = new Map(users.map(user => [user.id, user]));
    const duplicateGroups = new Map();
    for (const org of organizations) {
        if (org.status === 'archived' || org.deleted_at) continue;
        const orgMembers = members.filter(member => member.organization_id === org.id);
        const active = orgMembers.filter(member => member.status !== 'blocked' && !member.deleted_at && !member.permissions?.is_support_proxy && userMap.has(member.user_id));
        const realOwners = active.filter(member => member.role === 'owner');
        const canonical = active.find(member => member.user_id === org.owner_id);
        let owner = null;
        // Several owner memberships can be intentional. A verified canonical
        // owner_id with an owner membership already defines the tenant's owner.
        if (canonical?.role === 'owner') owner = canonical.user_id;
        else if (canonical && realOwners.every(member => member.user_id === canonical.user_id)) owner = canonical.user_id;
        else if (!org.owner_id || orgMembers.some(member => member.user_id === org.owner_id && member.permissions?.is_support_proxy)) {
            if (realOwners.length === 1) owner = realOwners[0].user_id;
            else if (!realOwners.length) {
                // Never trust editable user_metadata to grant ownership.
                const candidates = users.filter(user => user.app_metadata?.invited_org_id === org.id);
                if (candidates.length === 1 && !orgMembers.some(member => member.user_id === candidates[0].id &&
                    (member.status === 'blocked' || member.deleted_at || member.permissions?.is_support_proxy))) owner = candidates[0].id;
            }
        }
        if (owner && (org.owner_id !== owner || !active.some(member => member.user_id === owner && member.role === 'owner'))) {
            repairs.push({ organization_id: org.id, slug: org.slug, owner_id: owner });
        } else if (!owner) unresolved.push({ organization_id: org.id, slug: org.slug, reason: realOwners.length > 1 ? 'multiple_owners' : 'no_verified_owner' });
        if (owner && org.organization_type !== 'platform') {
            const key = `${owner}:${org.name.trim().toLocaleLowerCase()}`;
            const group = duplicateGroups.get(key) || [];
            group.push({ organization_id: org.id, slug: org.slug, name: org.name });
            duplicateGroups.set(key, group);
        }
    }
    for (const group of duplicateGroups.values()) if (group.length > 1) duplicateCandidates.push(group);
    return { repairs, unresolved, duplicateCandidates };
}
module.exports = { auditTenantOwnership };
