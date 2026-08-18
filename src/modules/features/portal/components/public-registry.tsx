import { PortalLayout } from "@/modules/features/portal/components/portal-layout";
import { B2CRestaurantLayout } from "./b2c-restaurant-template/b2c-restaurant-layout";
import { UniversalStorefrontLayout } from "./universal-storefront/universal-storefront-layout";

/**
 * Diccionario de Plantillas Públicas (Visibles para los clientes finales y visitantes de la tienda)
 * ESTE ARCHIVO SOLO DEBE IMPORTAR COMPONENTES DE CLIENTE ("use client")
 */
export const PUBLIC_PORTAL_TEMPLATES: Record<string, React.ComponentType<any>> = {
    // Portal de cliente B2B Clásico (Ver facturas, ver cotizaciones para clientes autenticados con token)
    b2b_dashboard: PortalLayout,

    // Portal de Consumidor (App de comida PWA / Menú digital para restaurantes)
    b2c_commerce: B2CRestaurantLayout,

    // Portal Comercial Dedicado / Tienda & Portafolio en Vivo Multindustria
    storefront: UniversalStorefrontLayout,
    universal_catalog: UniversalStorefrontLayout,
    universal_storefront: UniversalStorefrontLayout,
};

/**
 * Función Helper para obtener la plantilla del Portal Público
 */
export function getPublicPortalTemplate(templateKey: string | null | undefined): React.ComponentType<any> {
    if (!templateKey || !PUBLIC_PORTAL_TEMPLATES[templateKey]) {
        return PUBLIC_PORTAL_TEMPLATES['storefront'] || UniversalStorefrontLayout;
    }

    return PUBLIC_PORTAL_TEMPLATES[templateKey];
}
