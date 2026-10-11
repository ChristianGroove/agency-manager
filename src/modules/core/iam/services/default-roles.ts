import { PERMISSIONS } from '../actions/permissions'

export function getDefaultRoles() {
    return [
        {

            name: 'Dueño',
            description: 'Acceso total y administrativo a la organización',
            is_system_role: true,
            hierarchy_level: 100,
            permissions: { all: true }
        },
        {

            name: 'Administrador',
            description: 'Puede gestionar miembros, roles y configuraciones',
            is_system_role: true,
            hierarchy_level: 50,
            permissions: {
                // Administrative
                [PERMISSIONS.ORG.MANAGE_MEMBERS]: true,
                [PERMISSIONS.ORG.MANAGE_ROLES]: true,
                [PERMISSIONS.ORG.MANAGE_BILLING]: true,
                [PERMISSIONS.ORG.MANAGE_SETTINGS]: true,
                [PERMISSIONS.ORG.MANAGE_INTEGRATIONS]: true,
                [PERMISSIONS.ORG.VIEW_AUDIT_LOGS]: true,

                // Standard Modules
                [PERMISSIONS.CRM.VIEW_LEADS]: true,
                [PERMISSIONS.CRM.EDIT_LEADS]: true,
                [PERMISSIONS.INBOX.VIEW_ALL]: true,
                [PERMISSIONS.INBOX.TEAM_VIEW]: true,
                [PERMISSIONS.INBOX.GLOBAL_VIEW]: false,
                [PERMISSIONS.INBOX.ASSIGN_AGENTS]: true,
                [PERMISSIONS.AUTOMATION.VIEW]: true
            }
        },
        {

            name: 'Miembro',
            description: 'Acceso estándar a funciones de operación',
            is_system_role: true,
            hierarchy_level: 10,
            permissions: {
                [PERMISSIONS.CRM.VIEW_LEADS]: true,
                [PERMISSIONS.INBOX.VIEW_ALL]: false,
                [PERMISSIONS.INBOX.TEAM_VIEW]: false,
                [PERMISSIONS.INBOX.GLOBAL_VIEW]: false,
                [PERMISSIONS.INBOX.ASSIGN_AGENTS]: false
            }
        }
    ];
}
