/**
 * Centralized Inbox Permission Evaluator
 * 
 * PURE FUNCTION — No side effects, no DB calls.
 * Works in both client and server environments.
 * 
 * Receives the effective permissions object (from getCurrentUserPermissions)
 * and returns boolean flags that components consume directly.
 * 
 * This eliminates the 6 hardcoded role-checking locations scattered
 * across the codebase and provides a SINGLE SOURCE OF TRUTH for
 * inbox visibility rules.
 */
export function evaluateInboxPermissions(effectivePermissions: any) {
    const role = effectivePermissions?.role?.toLowerCase() || '';
    const hierarchy = effectivePermissions?.hierarchy;
    const perms = effectivePermissions?.permissions || {};

    // GLOBAL VIEW: Can see ALL channels without restriction.
    // This is the "Owner" level — full organizational visibility.
    const hasGlobalView =
        hierarchy === 100 ||
        role === 'owner' || role === 'dueño' || role === 'propietario' ||
        perms.all === true ||
        perms['inbox.conversations.global_view'] === true;

    // VIEW ALL: Can see all conversations within authorized channels.
    // "Supervisor" level — sees unassigned and other agents' chats.
    const hasViewAll =
        hasGlobalView ||
        perms['inbox.conversations.view_all'] === true;

    // TEAM VIEW: Can see the agent filter dropdown and team activity.
    // "Manager" level — monitors team workload.
    const hasTeamView =
        hasGlobalView ||
        perms['inbox.team.view'] === true;

    // AUTHORIZED CHANNELS: Only relevant when NOT in global view.
    // Deep-reads from multiple possible JSONB paths for backwards compatibility
    // with legacy permission structures (V1 nested vs V2 flat).
    const authorizedChannels: string[] = hasGlobalView
        ? []
        : (
            perms.inbox_access ||
            perms.modules?.inbox?.inbox_access ||
            perms.inbox?.inbox_access ||
            []
        );

    return {
        hasGlobalView,
        hasViewAll,
        hasTeamView,
        authorizedChannels,
    };
}
