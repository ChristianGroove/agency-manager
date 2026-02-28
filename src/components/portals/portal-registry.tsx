import { B2BAgencyLayout } from "./b2b-agency-template/b2b-agency-layout";

/**
 * Diccionario Central de Portales Polimórficos Administrativos
 * 
 * Cada llave corresponde al valor guardado en la columna `portal_template` de la tabla `saas_apps`.
 * El Layout Enrutador Maestro del ROOT utilizará este registro para inyectar dinámicamente
 * la arquitectura visual adecuada según la industria de la Organización (Solo Server Components).
 */
export const PORTAL_TEMPLATES: Record<string, React.ComponentType<any>> = {
    // Plantilla clásica actual: Dashboard B2B con barra lateral izquierda
    b2b_dashboard: B2BAgencyLayout,
};

/**
 * Función Helper para obtener la plantilla del Dashboard de Administración
 */
export function getDashboardTemplate(templateKey: string | null | undefined): React.ComponentType<any> {
    const defaultTemplate = PORTAL_TEMPLATES['b2b_dashboard'];

    if (!templateKey) return defaultTemplate;

    // Si la Organización tiene asignado el portal PWA de restaurantes, 
    // el panel de control administrativo seguirá siendo el dashboard clásico por ahora.
    if (templateKey === 'b2c_commerce') {
        return defaultTemplate;
    }

    return PORTAL_TEMPLATES[templateKey] || defaultTemplate;
}
