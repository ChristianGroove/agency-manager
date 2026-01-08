export const PERMISSIONS = {
    // 1. CRM & Sales
    CRM: {
        VIEW_LEADS: 'crm.leads.view',
        EDIT_LEADS: 'crm.leads.edit',
        DELETE_LEADS: 'crm.leads.delete',
        EXPORT_DATA: 'crm.data.export',
    },

    // 2. Messaging (Inbox)
    INBOX: {
        VIEW_ALL: 'inbox.conversations.view_all', // If false, sees only assigned
        ASSIGN_AGENTS: 'inbox.conversations.assign',
        MANAGE_CHANNELS: 'inbox.channels.manage',
    },

    // 3. Automation / Workflows
    AUTOMATION: {
        VIEW: 'automation.workflows.view',
        EDIT: 'automation.workflows.edit',
        EXECUTE: 'automation.workflows.execute',
    },

    // 4. Organization Management
    ORG: {
        MANAGE_MEMBERS: 'org.members.manage',
        MANAGE_BILLING: 'org.billing.manage',
        MANAGE_ROLES: 'org.roles.manage', // Critical: Can create/edit roles
        VIEW_AUDIT_LOGS: 'org.audit.view',
    }
} as const;

// Helper type to extract all permission strings
type PermissionObject = typeof PERMISSIONS;
type PermissionValues<T> = T extends string ? T : T extends object ? PermissionValues<T[keyof T]> : never;
export type PermissionString = PermissionValues<PermissionObject>;

// UI Metadata for the Role Editor (Accordion Groups)
export const PERMISSION_GROUPS = [
    {
        id: 'crm',
        label: 'CRM & Sales',
        description: 'Manage customers, pipelines, and data access.',
        permissions: [
            { id: PERMISSIONS.CRM.VIEW_LEADS, label: 'View Leads', description: 'Can view lead lists and details' },
            { id: PERMISSIONS.CRM.EDIT_LEADS, label: 'Edit Leads', description: 'Can modify lead information' },
            { id: PERMISSIONS.CRM.DELETE_LEADS, label: 'Delete Leads', description: 'Can permanently remove leads' },
            { id: PERMISSIONS.CRM.EXPORT_DATA, label: 'Export Data', description: 'Can export CRM data to CSV' },
        ]
    },
    {
        id: 'inbox',
        label: 'Inbox & Messaging',
        description: 'Control chat access and channel configuration.',
        permissions: [
            { id: PERMISSIONS.INBOX.VIEW_ALL, label: 'View All Conversations', description: 'See all chats (otherwise only assigned ones)' },
            { id: PERMISSIONS.INBOX.ASSIGN_AGENTS, label: 'Assign Agents', description: 'Can reassign conversations to others' },
            { id: PERMISSIONS.INBOX.MANAGE_CHANNELS, label: 'Manage Channels', description: 'Connect/disconnect WhatsApp numbers' },
        ]
    },
    {
        id: 'automation',
        label: 'Automation',
        description: 'Manage chatbots and workflows.',
        permissions: [
            { id: PERMISSIONS.AUTOMATION.VIEW, label: 'View Workflows', description: 'Can view existing automations' },
            { id: PERMISSIONS.AUTOMATION.EDIT, label: 'Edit Workflows', description: 'Can create and modify workflows' },
        ]
    },
    {
        id: 'org',
        label: 'Organization Settings',
        description: 'Administrative controls.',
        permissions: [
            { id: PERMISSIONS.ORG.MANAGE_MEMBERS, label: 'Manage Members', description: 'Invite and remove team members' },
            { id: PERMISSIONS.ORG.MANAGE_ROLES, label: 'Manage Roles', description: 'Create and edit custom roles' },
            { id: PERMISSIONS.ORG.MANAGE_BILLING, label: 'Billing Manager', description: 'View invoices and manage subscription' },
        ]
    }
];
