export interface CRMTemplate {
    id: string
    name: string
    description: string
    industry: string
    processStates: Array<{
        type: string
        key: string
        name: string
        is_initial?: boolean
        is_terminal?: boolean
        allowed_next_states?: string[]
        metadata?: any
        suggested_actions?: string[]
        auto_tags?: string[]
    }>
    pipelineStages: Array<{
        name: string
        key: string
        color: string
        icon?: string
        mapToProcessKey: string
    }>
}

export const INDUSTRY_TEMPLATES = [
    {
        id: 'agency',
        label: 'Agencia / B2B',
        icon: 'Briefcase',
        color: 'indigo',
        spaces: ['agency', 'consulting', 'saas'],
        approve_label: '✅ Aprobar Presupuesto',
        reject_label: '❌ Rechazar / Cambios',
        reject_reasons: ['Presupuesto Alto', 'Alcance Incorrecto', 'Ya contraté otro', 'Postergar'],
        header: 'PROPUESTA DE SERVICIOS',
        footer: 'Documento confidencial. Validez de 15 días.',
        ack_msg: 'Entendido, gracias por el feedback. ¿Podemos re-negociar?'
    },
    {
        id: 'ecommerce',
        label: 'Ecommerce / Retail',
        icon: 'Zap',
        color: 'orange',
        spaces: ['retail', 'ecommerce'],
        approve_label: '🍕 Confirmar Pedido',
        reject_label: '❌ Cancelar Pedido',
        reject_reasons: ['Error en pedido', 'Muy caro', 'Demora mucho', 'Ya no lo quiero'],
        header: 'RESUMEN DE TU PEDIDO',
        footer: 'Gracias por tu compra. Te avisaremos cuando salga.',
        ack_msg: 'Pedido cancelado. Esperamos servirte pronto.'
    },
    {
        id: 'reservation',
        label: 'Citas / Salud',
        icon: 'Calendar',
        color: 'green',
        spaces: ['clinic', 'beauty', 'spa', 'health'],
        approve_label: '📅 Confirmar Cita',
        reject_label: '❌ Re-agendar',
        reject_reasons: ['Horario no sirve', 'Ya no necesito', 'Muy costoso', 'Otro doctor'],
        header: 'CONFIRMACIÓN DE CITA',
        footer: 'Por favor llegar 15 min antes. Cancelaciones con 24h.',
        ack_msg: 'Cita cancelada. Avísanos si deseas re-agendar.'
    },
    {
        id: 'real_estate',
        label: 'Inmobiliaria / Real Estate',
        icon: 'Home',
        color: 'blue',
        spaces: ['real_estate', 'construction'],
        approve_label: '🏡 Me Interesa / Visitar',
        reject_label: '❌ No es lo que busco',
        reject_reasons: ['Precio fuera de rango', 'Ubicación no gusta', 'Muy pequeño', 'Busco alquilar'],
        header: 'OPORTUNIDAD DE INVERSIÓN',
        footer: 'Sujeto a disponibilidad y cambios de precio.',
        ack_msg: 'Entendido. Seguiremos buscando la propiedad ideal para ti.'
    },
    {
        id: 'legal',
        label: 'Legal / Abogados',
        icon: 'Scale',
        color: 'slate',
        spaces: ['legal', 'consulting'],
        approve_label: '⚖️ Aceptar Honorarios',
        reject_label: '❌ Consultar Dudas',
        reject_reasons: ['Honorarios Altos', 'Busco otra opinión', 'No es el momento', 'Caso resuelto'],
        header: 'PROPUESTA DE HONORARIOS',
        footer: 'Información protegida por secreto profesional.',
        ack_msg: 'Gracias. Quedamos atentos a cualquier consulta adicional.'
    },
    {
        id: 'saas',
        label: 'SaaS / Software',
        icon: 'Monitor',
        color: 'violet',
        spaces: ['saas', 'tech'],
        approve_label: '🚀 Activar Suscripción',
        reject_label: '❌ No por ahora',
        reject_reasons: ['Faltan Features', 'Precio Enterprise', 'Usando Competencia', 'Solo explorando'],
        header: 'PLAN DE SUSCRIPCIÓN',
        footer: 'Términos de servicio aplican. Renovación automática.',
        ack_msg: 'Gracias por evaluar nuestro software. Feedback recibido.'
    },
    {
        id: 'education',
        label: 'Educación / Cursos',
        icon: 'GraduationCap',
        color: 'yellow',
        spaces: ['education', 'coaching'],
        approve_label: '🎓 Inscribirme Ahora',
        reject_label: '❌ Ver otro curso',
        reject_reasons: ['Horario difícil', 'Precio alto', 'Temario no encaja', 'Lo pensaré'],
        header: 'INSCRIPCIÓN ACADÉMICA',
        footer: 'Cupos limitados. Certificado incluido al finalizar.',
        ack_msg: 'Entendido. Te enviaremos info de próximos cursos.'
    },
    {
        id: 'travel',
        label: 'Turismo / Viajes',
        icon: 'Plane',
        color: 'sky',
        spaces: ['travel', 'tourism', 'hospitality'],
        approve_label: '✈️ Reservar Viaje',
        reject_label: '❌ Cambiar Destino',
        reject_reasons: ['Muy caro', 'Fechas no sirven', 'Prefiero otro destino', 'Solo cotizando'],
        header: 'TU PRÓXIMA AVENTURA',
        footer: 'Tarifas sujetas a cambio sin previo aviso. Impuestos incluidos.',
        ack_msg: 'Lástima que no puedas viajar ahora. ¡Avísanos para la próxima!'
    },
    {
        id: 'events',
        label: 'Eventos / Catering',
        icon: 'PartyPopper',
        color: 'pink',
        spaces: ['event_planning', 'resto'],
        approve_label: '🎉 Confirmar Evento',
        reject_label: '❌ Modificar Menú',
        reject_reasons: ['Presupuesto excedido', 'Cambio de fecha', 'Menú no gusta', 'Cancelado'],
        header: 'COTIZACIÓN DE EVENTO',
        footer: 'Se requiere 50% de anticipo para bloquear la fecha.',
        ack_msg: 'Evento no confirmado. La fecha queda liberada.'
    },
    {
        id: 'logistics',
        label: 'Logística / Transporte',
        icon: 'Truck',
        color: 'amber',
        spaces: ['logistics', 'construction', 'moving'],
        approve_label: '🚛 Confirmar Flete',
        reject_label: '❌ Rechazar Tarifa',
        reject_reasons: ['Tarifa muy alta', 'Tiempo de tránsito largo', 'Ya despaché', 'Cotizando'],
        header: 'COTIZACIÓN DE TRANSPORTE',
        footer: 'Mercancía viaja asegurada según valor declarado.',
        ack_msg: 'Tarifa rechazada. Gracias por la oportunidad.'
    },
    {
        id: 'consulting',
        label: 'Consultoría / Coaching',
        icon: 'Lightbulb',
        color: 'teal',
        spaces: ['consulting', 'agency', 'financial'],
        approve_label: '💡 Iniciar Proceso',
        reject_label: '❌ No estoy listo',
        reject_reasons: ['Inversión alta', 'No tengo tiempo', 'Dudas del proceso', 'Lo haré solo'],
        header: 'PROPUESTA DE CONSULTORÍA',
        footer: 'Resultados dependen del compromiso mutuo.',
        ack_msg: 'Comprendido. Éxitos en tu camino.'
    }
]

export const CRMTemplates: Record<string, CRMTemplate> = {
    agency: {
        id: 'agency',
        name: 'Agency Model',
        description: 'Standard agency sales pipeline with Lead, Quote, Approval and Onboarding stages.',
        industry: 'agency',
        processStates: [
            { type: 'sale', key: 'lead', name: 'Lead Qualified', is_initial: true, allowed_next_states: ['negotiation', 'lost'], suggested_actions: ['call', 'meeting'] },
            { type: 'sale', key: 'negotiation', name: 'Proposal / Quote', allowed_next_states: ['closing', 'lost'], suggested_actions: ['send_quote'] },
            { type: 'sale', key: 'closing', name: 'Agreement / Approval', allowed_next_states: ['closed_won', 'lost'], suggested_actions: ['follow_up'] },
            { type: 'sale', key: 'closed_won', name: 'Closed Won', is_terminal: true, auto_tags: ['active_client'] },
            { type: 'sale', key: 'lost', name: 'Closed Lost', is_terminal: true }
        ],
        pipelineStages: [
            { name: 'Lead', key: 'lead', color: 'bg-blue-500', icon: 'UserPlus', mapToProcessKey: 'lead' },
            { name: 'Quote', key: 'quote', color: 'bg-yellow-500', icon: 'FileText', mapToProcessKey: 'negotiation' },
            { name: 'Approval', key: 'approval', color: 'bg-indigo-500', icon: 'CheckCircle', mapToProcessKey: 'closing' },
            { name: 'Onboarding', key: 'onboarding', color: 'bg-green-500', icon: 'Rocket', mapToProcessKey: 'closed_won' }
        ]
    },
    saas: {
        id: 'saas',
        name: 'SaaS Platform',
        description: 'B2B SaaS flow: Trial, Evaluation, Contract and Success.',
        industry: 'saas',
        processStates: [
            { type: 'sale', key: 'lead', name: 'Trial Started', is_initial: true, allowed_next_states: ['negotiation', 'lost'] },
            { type: 'sale', key: 'negotiation', name: 'Evaluation', allowed_next_states: ['closing', 'lost'] },
            { type: 'sale', key: 'closing', name: 'Contract / Legal', allowed_next_states: ['closed_won', 'lost'] },
            { type: 'sale', key: 'closed_won', name: 'Customer Success', is_terminal: true },
            { type: 'sale', key: 'lost', name: 'Lost', is_terminal: true }
        ],
        pipelineStages: [
            { name: 'Trial', key: 'trial', color: 'bg-sky-400', icon: 'Zap', mapToProcessKey: 'lead' },
            { name: 'Evaluation', key: 'eval', color: 'bg-violet-400', icon: 'Search', mapToProcessKey: 'negotiation' },
            { name: 'Contract', key: 'contract', color: 'bg-emerald-400', icon: 'FileCheck', mapToProcessKey: 'closing' },
            { name: 'Success', key: 'success', color: 'bg-green-600', icon: 'Award', mapToProcessKey: 'closed_won' }
        ]
    }
}
