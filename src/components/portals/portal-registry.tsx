import { B2BAgencyLayout } from "./b2b-agency-template/b2b-agency-layout";
import { B2CRestaurantLayout } from "./b2c-restaurant-template/b2c-restaurant-layout";

/**
 * Diccionario Central de Portales Polimórficos
 * 
 * Cada llave corresponde al valor guardado en la columna `portal_template` de la tabla `saas_apps`.
 * El Layout Enrutador Maestro utilizará este registro para inyectar dinámicamente
 * la arquitectura visual adecuada según la industria de la Organización.
 */
export const PORTAL_TEMPLATES: Record<string, React.ComponentType<any>> = {
    // Plantilla clásica actual: Dashboard B2B con barra lateral izquierda
    b2b_dashboard: B2BAgencyLayout,

    // Plantilla Consumidor (PWA Menu/Cart)
    b2c_commerce: B2CRestaurantLayout,
    // healthcare: ClinicLayout,
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

/**
 * Función Helper para obtener la plantilla del Portal Público (Cliente/Consumidor)
 */
export function getPublicPortalTemplate(templateKey: string | null | undefined): React.ComponentType<any> {
    if (!templateKey || !PORTAL_TEMPLATES[templateKey]) {
        return PORTAL_TEMPLATES['b2b_dashboard'];
    }

    return PORTAL_TEMPLATES[templateKey];
}
