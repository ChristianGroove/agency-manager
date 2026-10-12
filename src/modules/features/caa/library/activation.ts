// Lightweight gates: public pages need not load the compiled help corpus when disabled.
export function tasksPortalHelpEnabled(org: string): boolean {
    const tenants = (process.env.PIXY_HELP_TASKS_PORTAL_TENANTS || '').split(',').map(value => value.trim())
    return process.env.PIXY_HELP_TASKS_PORTAL_ENABLED === 'true' && tenants.includes(org)
}
