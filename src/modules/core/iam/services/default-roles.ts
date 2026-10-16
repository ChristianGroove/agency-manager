import { PERMISSIONS } from '../actions/permissions'

export const DEFAULT_ROLES = [
        {
            name: 'Dueño',
            description: 'Acceso total y administrativo a la organización',
            is_system_role: true,
            hierarchy_level: 100,
            permissions: {
                all: true,
                // Administrative
                [PERMISSIONS.ORG.MANAGE_MEMBERS]: true,
                [PERMISSIONS.ORG.MANAGE_ROLES]: true,
                [PERMISSIONS.ORG.MANAGE_BILLING]: true,
                [PERMISSIONS.ORG.MANAGE_SETTINGS]: true,
                [PERMISSIONS.ORG.MANAGE_INTEGRATIONS]: true,
                [PERMISSIONS.ORG.VIEW_AUDIT_LOGS]: true,

                // CRM & Marketing
                [PERMISSIONS.CRM.VIEW_LEADS]: true,
                [PERMISSIONS.CRM.EDIT_LEADS]: true,
                [PERMISSIONS.CRM.DELETE_LEADS]: true,
                [PERMISSIONS.CRM.EXPORT_DATA]: true,
                [PERMISSIONS.MARKETING.VIEW]: true,
                [PERMISSIONS.MARKETING.MANAGE]: true,
                [PERMISSIONS.MARKETING.EXECUTE]: true,
                [PERMISSIONS.MARKETING.IMPORT]: true,
                [PERMISSIONS.MARKETING.EXPORT]: true,

                // Inbox & Messaging
                [PERMISSIONS.INBOX.GLOBAL_VIEW]: true,
                [PERMISSIONS.INBOX.VIEW_ALL]: true,
                [PERMISSIONS.INBOX.TEAM_VIEW]: true,
                [PERMISSIONS.INBOX.ASSIGN_AGENTS]: true,
                [PERMISSIONS.INBOX.MANAGE_CHANNELS]: true,

                // Finance & Invoicing
                [PERMISSIONS.INVOICING.VIEW]: true,
                [PERMISSIONS.INVOICING.MANAGE]: true,
                [PERMISSIONS.INVOICING.EXPORT]: true,

                // Automation
                [PERMISSIONS.AUTOMATION.VIEW]: true,
                [PERMISSIONS.AUTOMATION.EDIT]: true,
                [PERMISSIONS.AUTOMATION.EXECUTE]: true,

                // Operations & Specialized Modules
                [PERMISSIONS.OPERATIONS.CATALOG_MANAGE]: true,
                [PERMISSIONS.OPERATIONS.BRIEFINGS_MANAGE]: true,
                [PERMISSIONS.OPERATIONS.BRANDING_MANAGE]: true,
                [PERMISSIONS.OPERATIONS.LOCATIONS_VIEW]: true,
                [PERMISSIONS.OPERATIONS.LOCATIONS_MANAGE]: true,
                [PERMISSIONS.OPERATIONS.ATTENDANCE_VIEW]: true,
                [PERMISSIONS.OPERATIONS.ATTENDANCE_MANAGE]: true,
                [PERMISSIONS.OPERATIONS.TASKS_VIEW]: true,
                [PERMISSIONS.OPERATIONS.TASKS_MANAGE]: true,
                [PERMISSIONS.OPERATIONS.RESTO_VIEW]: true,
                [PERMISSIONS.OPERATIONS.RESTO_MANAGE]: true,
                [PERMISSIONS.OPERATIONS.RESTO_ORDERS_VIEW]: true,
                [PERMISSIONS.OPERATIONS.RESTO_ORDERS_MANAGE]: true,
                [PERMISSIONS.OPERATIONS.RESTO_MENU_VIEW]: true,
                [PERMISSIONS.OPERATIONS.RESTO_MENU_MANAGE]: true,
                [PERMISSIONS.OPERATIONS.RESTO_STAFF_VIEW]: true,
                [PERMISSIONS.OPERATIONS.RESTO_STAFF_MANAGE]: true,

                // Rentals
                [PERMISSIONS.RENTALS.VIEW]: true,
                [PERMISSIONS.RENTALS.MANAGE_PROPERTIES]: true,
                [PERMISSIONS.RENTALS.MANAGE_CONTRACTS]: true,
                [PERMISSIONS.RENTALS.MANAGE_SETTLEMENTS]: true,

                // Quotes
                [PERMISSIONS.QUOTES.VIEW]: true,
                [PERMISSIONS.QUOTES.MANAGE]: true,
                [PERMISSIONS.QUOTES.CONVERT]: true,

                // Work Orders
                [PERMISSIONS.WORK_ORDERS.VIEW]: true,
                [PERMISSIONS.WORK_ORDERS.MANAGE]: true,

                // Payroll
                [PERMISSIONS.PAYROLL.VIEW]: true,
                [PERMISSIONS.PAYROLL.PROCESS]: true,
                [PERMISSIONS.PAYROLL.PAY]: true,

                // Vault
                [PERMISSIONS.VAULT.MANAGE]: true,
                [PERMISSIONS.VAULT.RESTORE]: true,
            }
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

                // CRM & Marketing
                [PERMISSIONS.CRM.VIEW_LEADS]: true,
                [PERMISSIONS.CRM.EDIT_LEADS]: true,
                [PERMISSIONS.CRM.DELETE_LEADS]: true,
                [PERMISSIONS.CRM.EXPORT_DATA]: true,
                [PERMISSIONS.MARKETING.VIEW]: true,
                [PERMISSIONS.MARKETING.MANAGE]: true,
                [PERMISSIONS.MARKETING.EXECUTE]: true,
                [PERMISSIONS.MARKETING.IMPORT]: true,
                [PERMISSIONS.MARKETING.EXPORT]: true,

                // Inbox & Messaging
                [PERMISSIONS.INBOX.VIEW_ALL]: true,
                [PERMISSIONS.INBOX.TEAM_VIEW]: true,
                [PERMISSIONS.INBOX.GLOBAL_VIEW]: false,
                [PERMISSIONS.INBOX.ASSIGN_AGENTS]: true,
                [PERMISSIONS.INBOX.MANAGE_CHANNELS]: true,

                // Finance & Invoicing
                [PERMISSIONS.INVOICING.VIEW]: true,
                [PERMISSIONS.INVOICING.MANAGE]: true,
                [PERMISSIONS.INVOICING.EXPORT]: true,

                // Automation
                [PERMISSIONS.AUTOMATION.VIEW]: true,
                [PERMISSIONS.AUTOMATION.EDIT]: true,
                [PERMISSIONS.AUTOMATION.EXECUTE]: true,

                // Operations & Specialized Modules
                [PERMISSIONS.OPERATIONS.CATALOG_MANAGE]: true,
                [PERMISSIONS.OPERATIONS.BRIEFINGS_MANAGE]: true,
                [PERMISSIONS.OPERATIONS.BRANDING_MANAGE]: true,
                [PERMISSIONS.OPERATIONS.LOCATIONS_VIEW]: true,
                [PERMISSIONS.OPERATIONS.LOCATIONS_MANAGE]: true,
                [PERMISSIONS.OPERATIONS.ATTENDANCE_VIEW]: true,
                [PERMISSIONS.OPERATIONS.ATTENDANCE_MANAGE]: true,
                [PERMISSIONS.OPERATIONS.TASKS_VIEW]: true,
                [PERMISSIONS.OPERATIONS.TASKS_MANAGE]: true,
                [PERMISSIONS.OPERATIONS.RESTO_VIEW]: true,
                [PERMISSIONS.OPERATIONS.RESTO_MANAGE]: true,
                [PERMISSIONS.OPERATIONS.RESTO_ORDERS_VIEW]: true,
                [PERMISSIONS.OPERATIONS.RESTO_ORDERS_MANAGE]: true,
                [PERMISSIONS.OPERATIONS.RESTO_MENU_VIEW]: true,
                [PERMISSIONS.OPERATIONS.RESTO_MENU_MANAGE]: true,
                [PERMISSIONS.OPERATIONS.RESTO_STAFF_VIEW]: true,
                [PERMISSIONS.OPERATIONS.RESTO_STAFF_MANAGE]: true,

                // Rentals
                [PERMISSIONS.RENTALS.VIEW]: true,
                [PERMISSIONS.RENTALS.MANAGE_PROPERTIES]: true,
                [PERMISSIONS.RENTALS.MANAGE_CONTRACTS]: true,
                [PERMISSIONS.RENTALS.MANAGE_SETTLEMENTS]: true,

                // Quotes
                [PERMISSIONS.QUOTES.VIEW]: true,
                [PERMISSIONS.QUOTES.MANAGE]: true,
                [PERMISSIONS.QUOTES.CONVERT]: true,

                // Work Orders
                [PERMISSIONS.WORK_ORDERS.VIEW]: true,
                [PERMISSIONS.WORK_ORDERS.MANAGE]: true,

                // Payroll
                [PERMISSIONS.PAYROLL.VIEW]: true,
                [PERMISSIONS.PAYROLL.PROCESS]: true,
                [PERMISSIONS.PAYROLL.PAY]: true,

                // Vault
                [PERMISSIONS.VAULT.MANAGE]: true,
                [PERMISSIONS.VAULT.RESTORE]: true,
            }
        },
        {
            name: 'Miembro',
            description: 'Acceso estándar a las funciones asignadas',
            is_system_role: true,
            hierarchy_level: 10,
            permissions: {
                [PERMISSIONS.CRM.VIEW_LEADS]: true,
                [PERMISSIONS.CRM.EDIT_LEADS]: true,
                [PERMISSIONS.INBOX.VIEW_ALL]: false,
                [PERMISSIONS.INBOX.TEAM_VIEW]: false,
                [PERMISSIONS.INBOX.GLOBAL_VIEW]: false,
                [PERMISSIONS.INBOX.ASSIGN_AGENTS]: false,
                [PERMISSIONS.INVOICING.VIEW]: true,
                [PERMISSIONS.AUTOMATION.VIEW]: true,
                [PERMISSIONS.OPERATIONS.LOCATIONS_VIEW]: true,
                [PERMISSIONS.OPERATIONS.ATTENDANCE_VIEW]: true,
                [PERMISSIONS.OPERATIONS.TASKS_VIEW]: true,
                [PERMISSIONS.OPERATIONS.RESTO_VIEW]: true,
                [PERMISSIONS.OPERATIONS.RESTO_ORDERS_VIEW]: true,
                [PERMISSIONS.OPERATIONS.RESTO_MENU_VIEW]: true,

                // Member read access to operational domains
                [PERMISSIONS.RENTALS.VIEW]: true,
                [PERMISSIONS.QUOTES.VIEW]: true,
                [PERMISSIONS.WORK_ORDERS.VIEW]: true,
            }
        }
    ];

export function getDefaultRoles() {
    return DEFAULT_ROLES;
}

