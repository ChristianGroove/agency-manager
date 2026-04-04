import { PortalLayout } from "@/modules/features/portal/components/portal-layout";
import { B2CRestaurantLayout } from "./b2c-restaurant-template/b2c-restaurant-layout";

/**
 * Diccionario de Plantillas Públicas (Visibles para los clientes finales)
 * ESTE ARCHIVO SOLO DEBE IMPORTAR COMPONENTES DE CLIENTE ("use client")
 */
export const PUBLIC_PORTAL_TEMPLATES: Record<string, React.ComponentType<any>> = {
    // Portal de cliente B2B Clásico (Ver facturas, ver cotizaciones)
    b2b_dashboard: PortalLayout,

    // Portal de Consumidor (App de comida PWA)
    b2c_commerce: B2CRestaurantLayout,
};

/**
 * Función Helper para obtener la plantilla del Portal Público
 */
export function getPublicPortalTemplate(templateKey: string | null | undefined): React.ComponentType<any> {
    if (!templateKey || !PUBLIC_PORTAL_TEMPLATES[templateKey]) {
        return PUBLIC_PORTAL_TEMPLATES['b2b_dashboard'];
    }

    return PUBLIC_PORTAL_TEMPLATES[templateKey];
}

