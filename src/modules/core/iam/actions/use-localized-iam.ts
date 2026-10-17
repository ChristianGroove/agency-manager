"use client";

import { useTranslation } from "@/modules/core/i18n/use-translation";

import { resolveSystemRoleKind } from "./permissions";

export interface IamLocalizedGroup {
    label: string;
    description: string;
}

export interface IamLocalizedPermission {
    label: string;
    description: string;
}

export interface IamLocalizedRole {
    name: string;
    description: string;
}

export function useLocalizedIam() {
    const { t, locale } = useTranslation();

    const getGroupInfo = (group: { id: string; label?: string; description?: string }): IamLocalizedGroup => {
        const safeId = group.id.replace(/\./g, '_');
        const labelKey = `iam.groups.${safeId}.label` as any;
        const legacyKey = `settings.iam_groups.${safeId}` as any;
        const descKey = `iam.groups.${safeId}.description` as any;

        const trLabel = t(labelKey);
        const trLegacy = t(legacyKey);
        const trDesc = t(descKey);

        const resolvedLabel = trLabel !== labelKey
            ? trLabel
            : (trLegacy !== legacyKey ? trLegacy : (group.label || group.id));

        const resolvedDesc = trDesc !== descKey
            ? trDesc
            : (group.description || "");

        return {
            label: resolvedLabel,
            description: resolvedDesc,
        };
    };

    const getPermissionInfo = (perm: { id: string; label?: string; description?: string }): IamLocalizedPermission => {
        const safeId = perm.id.replace(/\./g, '_');
        const labelKey = `iam.permissions.${safeId}.label` as any;
        const descKey = `iam.permissions.${safeId}.description` as any;

        const trLabel = t(labelKey);
        const trDesc = t(descKey);

        const resolvedLabel = trLabel !== labelKey ? trLabel : (perm.label || perm.id);
        const resolvedDesc = trDesc !== descKey ? trDesc : (perm.description || "");

        return {
            label: resolvedLabel,
            description: resolvedDesc,
        };
    };

    const getRoleInfo = (role?: {
        name?: string;
        description?: string | null;
        is_system_role?: boolean;
        hierarchy_level?: number | null;
        permissions?: Record<string, any> | null;
    } | null): IamLocalizedRole => {
        if (!role || !role.name) {
            return { name: "", description: "" };
        }

        const rawName = role.name.trim();
        const kind = resolveSystemRoleKind(role);

        if (kind === 'owner') {
            const trName = t('settings.roles.role_owner' as any);
            const trDesc = t('settings.roles.system_desc_owner' as any);
            return {
                name: trName !== 'settings.roles.role_owner' ? trName : (locale === 'en' ? 'Owner' : 'Dueño'),
                description: trDesc !== 'settings.roles.system_desc_owner' ? trDesc : (role.description || ""),
            };
        }

        if (kind === 'admin') {
            const trName = t('settings.roles.role_admin' as any);
            const trDesc = t('settings.roles.system_desc_admin' as any);
            return {
                name: trName !== 'settings.roles.role_admin' ? trName : (locale === 'en' ? 'Administrator' : 'Administrador'),
                description: trDesc !== 'settings.roles.system_desc_admin' ? trDesc : (role.description || ""),
            };
        }

        if (kind === 'member') {
            const trName = t('settings.roles.role_member' as any);
            const trDesc = t('settings.roles.system_desc_member' as any);
            return {
                name: trName !== 'settings.roles.role_member' ? trName : (locale === 'en' ? 'Member' : 'Miembro'),
                description: trDesc !== 'settings.roles.system_desc_member' ? trDesc : (role.description || ""),
            };
        }

        return {
            name: rawName,
            description: role.description || "",
        };
    };

    return {
        getGroupInfo,
        getPermissionInfo,
        getRoleInfo,
        t,
        locale,
    };
}
