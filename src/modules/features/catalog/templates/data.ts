import { ServiceCatalogItem } from "@/types"

export type CatalogTemplate = {
    id: string
    name: string
    description: string
    vertical: 'agency' | 'real_estate' | 'consulting' | 'saas'
    items: Partial<ServiceCatalogItem>[]
}

export const CATALOG_TEMPLATES: CatalogTemplate[] = [
    {
        id: 'agency_creative_pack',
        name: 'Pack Creativo (Agencia)',
        description: 'Servicios esenciales para una agencia creativa: Branding, Redes Sociales y Web.',
        vertical: 'agency',
        items: [
            {
                name: 'Gestión de Redes Sociales (Básico)',
                description: '12 posts mensuales, gestión de comunidad y reporte mensual.',
                category: 'Marketing',
                type: 'recurring',
                frequency: 'monthly',
                base_price: 500,
                is_visible_in_portal: true,
                metadata: {
                    deliverables: ['12 diseños', 'Copywriting', 'Reporte PDF']
                }
            },
            {
                name: 'Diseño de Identidad Visual',
                description: 'Logo, paleta de colores, tipografías y manual de marca básico.',
                category: 'Diseño',
                type: 'one_off',
                base_price: 1200,
                is_visible_in_portal: true,
                metadata: {
                    phases: ['Briefing', 'Bocetos', 'Entrega Final']
                }
            },
            {
                name: 'Desarrollo Web Landing Page',
                description: 'Sitio web de una página optimizado para conversión.',
                category: 'Desarrollo',
                type: 'one_off',
                base_price: 800,
                is_visible_in_portal: true
            }
        ]
    },
    {
        id: 'consulting_standard',
        name: 'Servicios de Consultoría',
        description: 'Oferta estándar para consultores independientes o firmas.',
        vertical: 'consulting',
        items: [
            {
                name: 'Sesión de Diagnóstico',
                description: 'Evaluación inicial de 90 minutos.',
                category: 'Consultoría',
                type: 'one_off',
                base_price: 300,
                is_visible_in_portal: true
            },
            {
                name: 'Mentoria Mensual',
                description: '4 sesiones de seguimiento y soporte por email.',
                category: 'Mentoria',
                type: 'recurring',
                frequency: 'monthly',
                base_price: 1500,
                is_visible_in_portal: true
            }
        ]
    }
]
