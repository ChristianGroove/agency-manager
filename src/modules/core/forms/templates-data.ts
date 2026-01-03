export type FormTemplateDefinition = {
    id: string
    name: string
    description: string
    vertical: 'agency' | 'real_estate' | 'consulting' | 'saas'
    slug: string
    structure: any[] // JSON Schema for the form fields
}

export const FORM_TEMPLATES: FormTemplateDefinition[] = [
    {
        id: 'agency_brand_brief',
        name: 'Briefing de Marca',
        description: 'Cuestionario esencial para definir la identidad visual y valores de una marca.',
        vertical: 'agency',
        slug: 'branding-brief',
        structure: [
            {
                id: 'brand_personality',
                type: 'text',
                label: '¿Cómo describirías la personalidad de tu marca en 3 palabras?',
                required: true
            },
            {
                id: 'target_audience',
                type: 'textarea',
                label: 'Describe a tu cliente ideal (Edad, Intereses, Problemas)',
                required: true
            },
            {
                id: 'competitors',
                type: 'textarea',
                label: '¿Quiénes son tus principales competidores?',
                required: false
            }
        ]
    },
    {
        id: 'real_estate_property_intake',
        name: 'Ficha de Captación de Inmueble',
        description: 'Formulario inicial para registrar una nueva propiedad en venta o alquiler.',
        vertical: 'real_estate',
        slug: 'property-intake',
        structure: [
            {
                id: 'property_type',
                type: 'select',
                label: 'Tipo de Inmueble',
                options: ['Apartamento', 'Casa', 'Local Comercial', 'Lote'],
                required: true
            },
            {
                id: 'address',
                type: 'text',
                label: 'Dirección Exacta',
                required: true
            },
            {
                id: 'owner_name',
                type: 'text',
                label: 'Nombre del Propietario',
                required: true
            }
        ]
    }
]
