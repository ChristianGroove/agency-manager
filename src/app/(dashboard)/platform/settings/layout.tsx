import { redirect } from 'next/navigation';
import { hasPermission } from '@/modules/core/iam/services/role-service';
import { PERMISSIONS } from '@/modules/core/iam/actions/permissions';

export default async function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Escudo de seguridad perimetral para todo el submódulo de Settings.
    // Redirige silenciosamente a usuarios sin permiso al dashboard.
    const canViewSettings = await hasPermission(PERMISSIONS.ORG.MANAGE_SETTINGS);
    
    if (!canViewSettings) {
        redirect('/dashboard?error=unauthorized');
    }

    return children;
}
