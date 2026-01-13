
import { CRMTemplate } from "./types"

export const CRMTemplates: Record<string, CRMTemplate> = {
    agency: {
        id: 'agency',
        name: 'Agencia Digital / Marketing',
        description: 'Perfecto para proyectos, retenedores y servicios de marketing.',
        industry: 'agency',
        processStates: [
            {
                key: 'discovery', name: 'Descubrimiento', type: 'sale', is_initial: true, is_terminal: false,
                allowed_next_states: ['proposal', 'lost'],
                metadata: { goal: 'Calificar y entender necesidades' },
                suggested_actions: [{ label: 'Agendar Auditoría', action: 'book_audit', type: 'primary' }]
            },
            {
                key: 'proposal', name: 'Propuesta', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['negotiation', 'lost', 'discovery'],
                metadata: { goal: 'Presentar solución y precio' },
                suggested_actions: [{ label: 'Enviar Propuesta', action: 'send_proposal', type: 'primary' }]
            },
            {
                key: 'negotiation', name: 'Negociación', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['closing', 'lost'],
                metadata: { goal: 'Acordar términos' }
            },
            {
                key: 'closing', name: 'Contrato / Depósito', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['won', 'lost', 'payment_issue'],
                metadata: { goal: 'Firmas y pago' },
                suggested_actions: [{ label: 'Enviar Contrato', action: 'send_contract', type: 'primary' }]
            },
            { key: 'payment_issue', name: 'Problema de Pago', type: 'sale', is_initial: false, is_terminal: false, allowed_next_states: ['won', 'lost', 'closing'], metadata: { goal: 'Resolver fallo de pago' }, suggested_actions: [{ label: 'Reintentar Pago', action: 'retry_payment', type: 'primary' }] },
            { key: 'won', name: 'Ganado', type: 'sale', is_initial: false, is_terminal: true, allowed_next_states: [], metadata: { goal: 'Onboarding' } },
            { key: 'lost', name: 'Perdido', type: 'sale', is_initial: false, is_terminal: true, allowed_next_states: ['discovery'], metadata: { goal: 'Nutrir' } }
        ],
        pipelineStages: [
            { name: 'Consulta', key: 'new', mapToProcessKey: 'discovery', color: 'bg-blue-500', icon: 'circle' },
            { name: 'Propuesta Enviada', key: 'proposal', mapToProcessKey: 'proposal', color: 'bg-indigo-500', icon: 'file-text' },
            { name: 'Negociando', key: 'negotiation', mapToProcessKey: 'negotiation', color: 'bg-amber-500', icon: 'users' },
            { name: 'Contrato Enviado', key: 'contract', mapToProcessKey: 'closing', color: 'bg-purple-500', icon: 'pen-tool' },
            { name: 'Cerrado Ganado', key: 'won', mapToProcessKey: 'won', color: 'bg-green-500', icon: 'check-circle' },
            { name: 'Perdido', key: 'lost', mapToProcessKey: 'lost', color: 'bg-red-500', icon: 'x-circle' }
        ]
    },
    clinic: {
        id: 'clinic',
        name: 'Clínica Médica / Dental',
        description: 'Flujo de admisión de pacientes para prácticas privadas.',
        industry: 'clinic',
        processStates: [
            {
                key: 'triage', name: 'Triaje / Consulta', type: 'sale', is_initial: true, is_terminal: false,
                allowed_next_states: ['consultation', 'lost'],
                metadata: { goal: 'Evaluar tratamiento' },
                suggested_actions: [{ label: 'Llamar Paciente', action: 'call_patient', type: 'primary' }]
            },
            {
                key: 'consultation', name: 'Consulta Presencial', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['treatment_plan', 'lost'],
                metadata: { goal: 'Cita con doctor/especialista' },
                suggested_actions: [{ label: 'Confirmar Cita', action: 'confirm_appt', type: 'primary' }]
            },
            {
                key: 'treatment_plan', name: 'Plan de Tratamiento', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['scheduled', 'lost'],
                metadata: { goal: 'Presentar opciones y costos' }
            },
            {
                key: 'scheduled', name: 'Procedimiento Agendado', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['won', 'lost', 'treatment_plan'],
                metadata: { goal: 'Asegurar asistencia' }
            },
            { key: 'won', name: 'Tratamiento Iniciado', type: 'sale', is_initial: false, is_terminal: true, allowed_next_states: [], metadata: { goal: 'Cuidado' } },
            { key: 'lost', name: 'No Procedió', type: 'sale', is_initial: false, is_terminal: true, allowed_next_states: ['triage'], metadata: { goal: 'Reactivación' } }
        ],
        pipelineStages: [
            { name: 'Nueva Consulta', key: 'new', mapToProcessKey: 'triage', color: 'bg-blue-500', icon: 'activity' },
            { name: 'Cita Agendada', key: 'consulting', mapToProcessKey: 'consultation', color: 'bg-cyan-500', icon: 'calendar' },
            { name: 'Plan Presentado', key: 'plan', mapToProcessKey: 'treatment_plan', color: 'bg-indigo-500', icon: 'clipboard' },
            { name: 'Agendado', key: 'scheduled', mapToProcessKey: 'scheduled', color: 'bg-green-600', icon: 'check-square' },
            { name: 'Paciente Activo', key: 'won', mapToProcessKey: 'won', color: 'bg-green-500', icon: 'heart' },
            { name: 'Perdido', key: 'lost', mapToProcessKey: 'lost', color: 'bg-gray-400', icon: 'x' }
        ]
    },
    real_estate: {
        id: 'real_estate',
        name: 'Venta Inmobiliaria',
        description: 'Para agentes vendiendo propiedades residenciales o comerciales.',
        industry: 'real_estate',
        processStates: [
            {
                key: 'prospecting', name: 'Prospección', type: 'sale', is_initial: true, is_terminal: false,
                allowed_next_states: ['viewing', 'lost'],
                metadata: { goal: 'Determinar capacidad de compra' }
            },
            {
                key: 'viewing', name: 'Visita / Showing', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['offer', 'lost', 'prospecting'],
                metadata: { goal: 'Mostrar propiedades' }
            },
            {
                key: 'offer', name: 'Oferta Realizada', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['under_contract', 'viewing', 'lost'],
                metadata: { goal: 'Negociar precio' }
            },
            {
                key: 'under_contract', name: 'Bajo Contrato', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['won', 'lost', 'offer'], // Fallback to offer if contract fails
                metadata: { goal: 'Diligencia debida y cierre' },
                suggested_actions: [{ label: 'Seguimiento Contingencias', action: 'track_contingencies', type: 'primary' }]
            },
            { key: 'won', name: 'Vendido / Cerrado', type: 'sale', is_initial: false, is_terminal: true, allowed_next_states: [], metadata: { goal: 'Entrega' } },
            { key: 'lost', name: 'Archivado', type: 'sale', is_initial: false, is_terminal: true, allowed_next_states: ['prospecting'], metadata: { goal: 'Lista futura' } }
        ],
        pipelineStages: [
            { name: 'Nuevo Lead', key: 'new', mapToProcessKey: 'prospecting', color: 'bg-blue-500', icon: 'user' },
            { name: 'En Visitas', key: 'touring', mapToProcessKey: 'viewing', color: 'bg-teal-500', icon: 'map-pin' },
            { name: 'Oferta', key: 'offer', mapToProcessKey: 'offer', color: 'bg-amber-500', icon: 'file-text' },
            { name: 'En Custodia (Escrow)', key: 'escrow', mapToProcessKey: 'under_contract', color: 'bg-purple-600', icon: 'lock' },
            { name: 'Vendido', key: 'won', mapToProcessKey: 'won', color: 'bg-green-500', icon: 'home' },
            { name: 'Perdido', key: 'lost', mapToProcessKey: 'lost', color: 'bg-red-500', icon: 'x' }
        ]
    },
    legal: {
        id: 'legal',
        name: 'Servicios Legales',
        description: 'Admisión de casos y contratación de clientes.',
        industry: 'legal',
        processStates: [
            {
                key: 'intake', name: 'Admisión', type: 'sale', is_initial: true, is_terminal: false,
                allowed_next_states: ['conflict_check', 'lost'],
                metadata: { goal: 'Recopilar detalles del caso' }
            },
            {
                key: 'conflict_check', name: 'Verificación Conflictos', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['consultation', 'lost'],
                metadata: { goal: 'Cumplimiento interno' },
                suggested_actions: [{ label: 'Ejecutar Verificación', action: 'run_conflict_check', type: 'primary' }]
            },
            {
                key: 'consultation', name: 'Consulta', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['retainer', 'lost'],
                metadata: { goal: 'Asesoría legal y estrategia' }
            },
            {
                key: 'retainer', name: 'Acuerdo de Retención', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['won', 'lost'],
                metadata: { goal: 'Asegurar pago y firma' }
            },
            { key: 'won', name: 'Contratado', type: 'sale', is_initial: false, is_terminal: true, allowed_next_states: [], metadata: { goal: 'Iniciar caso' } },
            { key: 'lost', name: 'Declinado', type: 'sale', is_initial: false, is_terminal: true, allowed_next_states: [], metadata: { goal: 'Referencia' } }
        ],
        pipelineStages: [
            { name: 'Admisión', key: 'intake', mapToProcessKey: 'intake', color: 'bg-slate-500', icon: 'inbox' },
            { name: 'Verif. Conflictos', key: 'conflict', mapToProcessKey: 'conflict_check', color: 'bg-orange-500', icon: 'shield' },
            { name: 'Consulta', key: 'consult', mapToProcessKey: 'consultation', color: 'bg-blue-600', icon: 'briefcase' },
            { name: 'Retenedor Enviado', key: 'retainer', mapToProcessKey: 'retainer', color: 'bg-purple-500', icon: 'file' },
            { name: 'Firmado', key: 'won', mapToProcessKey: 'won', color: 'bg-green-500', icon: 'check' },
            { name: 'Declinado', key: 'lost', mapToProcessKey: 'lost', color: 'bg-red-500', icon: 'x' }
        ]
    },
    saas: {
        id: 'saas',
        name: 'Ventas B2B SaaS',
        description: 'Ventas de software de alta velocidad o empresariales.',
        industry: 'saas',
        processStates: [
            {
                key: 'qualification', name: 'Calificación', type: 'sale', is_initial: true, is_terminal: false,
                allowed_next_states: ['demo', 'lost'],
                metadata: { goal: 'BANT (Presupuesto, Autoridad, Necesidad, Tiempo)' }
            },
            {
                key: 'demo', name: 'Demo de Producto', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['poc', 'negotiation', 'lost', 'qualification'],
                metadata: { goal: 'Mostrar valor' }
            },
            {
                key: 'poc', name: 'POC / Prueba', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['negotiation', 'lost'],
                metadata: { goal: 'Validación técnica' }
            },
            {
                key: 'negotiation', name: 'Negociación', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['won', 'lost'],
                metadata: { goal: 'Compras / Legal' }
            },
            { key: 'won', name: 'Cerrado Ganado', type: 'sale', is_initial: false, is_terminal: true, allowed_next_states: [], metadata: { goal: 'Entrega a CS' } },
            { key: 'lost', name: 'Cerrado Perdido', type: 'sale', is_initial: false, is_terminal: true, allowed_next_states: ['qualification'], metadata: { goal: 'Nutrir' } }
        ],
        pipelineStages: [
            { name: 'Calificado', key: 'qualified', mapToProcessKey: 'qualification', color: 'bg-blue-500', icon: 'filter' },
            { name: 'Demo Agendada', key: 'demo', mapToProcessKey: 'demo', color: 'bg-purple-500', icon: 'video' },
            { name: 'POC / Prueba', key: 'trial', mapToProcessKey: 'poc', color: 'bg-indigo-500', icon: 'cpu' },
            { name: 'Negociación', key: 'negotiation', mapToProcessKey: 'negotiation', color: 'bg-amber-500', icon: 'dollar-sign' },
            { name: 'Cerrado Ganado', key: 'won', mapToProcessKey: 'won', color: 'bg-green-500', icon: 'rocket' },
            { name: 'Perdido', key: 'lost', mapToProcessKey: 'lost', color: 'bg-red-500', icon: 'x' }
        ]
    },
    consulting: {
        id: 'consulting',
        name: 'Consultoría de Gestión',
        description: 'Compromisos de consultoría a pequeña o gran escala.',
        industry: 'consulting',
        processStates: [
            {
                key: 'scoping', name: 'Alcance (Scoping)', type: 'sale', is_initial: true, is_terminal: false,
                allowed_next_states: ['proposal', 'lost'],
                metadata: { goal: 'Definir problema' }
            },
            {
                key: 'proposal', name: 'Propuesta / Estrategia', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['sow', 'lost', 'scoping'],
                metadata: { goal: 'Presentar enfoque' }
            },
            {
                key: 'sow', name: 'SOW (Trabajo)', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['won', 'lost', 'proposal'],
                metadata: { goal: 'Refinar alcance de trabajo' }
            },
            { key: 'won', name: 'Contratado', type: 'sale', is_initial: false, is_terminal: true, allowed_next_states: [], metadata: { goal: 'Inicio (Kickoff)' } },
            { key: 'lost', name: 'Perdido', type: 'sale', is_initial: false, is_terminal: true, allowed_next_states: ['scoping'], metadata: { goal: 'Mantenimiento relación' } }
        ],
        pipelineStages: [
            { name: 'Alcance', key: 'scoping', mapToProcessKey: 'scoping', color: 'bg-blue-500', icon: 'search' },
            { name: 'Propuesta', key: 'proposal', mapToProcessKey: 'proposal', color: 'bg-teal-500', icon: 'file' },
            { name: 'Revisión SOW', key: 'sow', mapToProcessKey: 'sow', color: 'bg-orange-500', icon: 'edit-3' },
            { name: 'Contratado', key: 'won', mapToProcessKey: 'won', color: 'bg-green-500', icon: 'check-circle' },
            { name: 'Perdido', key: 'lost', mapToProcessKey: 'lost', color: 'bg-red-500', icon: 'x-circle' }
        ]
    },
    construction: {
        id: 'construction',
        name: 'Construcción / Oficios',
        description: 'Contratistas, renovaciones y obras.',
        industry: 'construction',
        processStates: [
            {
                key: 'inquiry', name: 'Consulta', type: 'sale', is_initial: true, is_terminal: false,
                allowed_next_states: ['site_visit', 'lost'],
                metadata: { goal: 'Contacto inicial' }
            },
            {
                key: 'site_visit', name: 'Visita Técnica', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['estimate', 'lost'],
                metadata: { goal: 'Medir y evaluar' },
                suggested_actions: [{ label: 'Agendar Visita', action: 'schedule_visit', type: 'primary' }]
            },
            {
                key: 'estimate', name: 'Presupuesto / Cotización', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['contract', 'lost', 'site_visit'],
                metadata: { goal: 'Cotizar el trabajo' }
            },
            {
                key: 'contract', name: 'Firma de Contrato', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['won', 'lost'],
                metadata: { goal: 'Depósito y agenda' }
            },
            { key: 'won', name: 'Trabajo Ganado', type: 'sale', is_initial: false, is_terminal: true, allowed_next_states: [], metadata: { goal: 'Iniciar obra' } },
            { key: 'lost', name: 'Trabajo Perdido', type: 'sale', is_initial: false, is_terminal: true, allowed_next_states: ['inquiry'], metadata: { goal: 'Archivar' } }
        ],
        pipelineStages: [
            { name: 'Consulta', key: 'inquiry', mapToProcessKey: 'inquiry', color: 'bg-blue-500', icon: 'phone' },
            { name: 'Visita Técnica', key: 'visit', mapToProcessKey: 'site_visit', color: 'bg-orange-500', icon: 'truck' },
            { name: 'Cotizado', key: 'bid', mapToProcessKey: 'estimate', color: 'bg-yellow-500', icon: 'clipboard' },
            { name: 'Contratando', key: 'contract', mapToProcessKey: 'contract', color: 'bg-purple-500', icon: 'pen-tool' },
            { name: 'Ganado', key: 'won', mapToProcessKey: 'won', color: 'bg-green-500', icon: 'hammer' },
            { name: 'Perdido', key: 'lost', mapToProcessKey: 'lost', color: 'bg-red-500', icon: 'x' }
        ]
    },
    education: {
        id: 'education',
        name: 'Educación / Coaching',
        description: 'Flujo de inscripción para cursos o escuelas.',
        industry: 'education',
        processStates: [
            {
                key: 'inquiry', name: 'Consulta', type: 'sale', is_initial: true, is_terminal: false,
                allowed_next_states: ['info_session', 'application', 'lost'],
                metadata: { goal: 'Responder dudas' }
            },
            {
                key: 'info_session', name: 'Sesión Info / Tour', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['application', 'lost'],
                metadata: { goal: 'Demostrar valor' }
            },
            {
                key: 'application', name: 'Postulación', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['interview', 'enrollment', 'lost'],
                metadata: { goal: 'Evaluar ajuste' }
            },
            {
                key: 'enrollment', name: 'Matrícula', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['won', 'lost'],
                metadata: { goal: 'Pago y registro' }
            },
            { key: 'won', name: 'Inscrito', type: 'sale', is_initial: false, is_terminal: true, allowed_next_states: [], metadata: { goal: 'Orientación' } },
            { key: 'lost', name: 'Retirado', type: 'sale', is_initial: false, is_terminal: true, allowed_next_states: ['inquiry'], metadata: { goal: 'Seguimiento próximo ciclo' } }
        ],
        pipelineStages: [
            { name: 'Interesado', key: 'new', mapToProcessKey: 'inquiry', color: 'bg-sky-500', icon: 'star' },
            { name: 'En Tour', key: 'tour', mapToProcessKey: 'info_session', color: 'bg-yellow-500', icon: 'eye' },
            { name: 'Postulado', key: 'applied', mapToProcessKey: 'application', color: 'bg-indigo-500', icon: 'file-text' },
            { name: 'Matriculado', key: 'won', mapToProcessKey: 'won', color: 'bg-green-500', icon: 'book' },
            { name: 'Perdido', key: 'lost', mapToProcessKey: 'lost', color: 'bg-red-500', icon: 'x' }
        ]
    },
    event_planning: {
        id: 'event_planning',
        name: 'Eventos y Venues',
        description: 'Flujo de reservas para bodas y eventos corporativos.',
        industry: 'event_planning',
        processStates: [
            {
                key: 'inquiry', name: 'Consulta', type: 'sale', is_initial: true, is_terminal: false,
                allowed_next_states: ['tour', 'proposal', 'lost'],
                metadata: { goal: 'Verificar disponibilidad' }
            },
            {
                key: 'tour', name: 'Visita Venue', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['proposal', 'lost'],
                metadata: { goal: 'Mostrar espacio' }
            },
            {
                key: 'proposal', name: 'Cotización / Bloqueo', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['contract', 'lost'],
                metadata: { goal: 'Reserva temporal' }
            },
            {
                key: 'contract', name: 'Contrato', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['won', 'lost'],
                metadata: { goal: 'Pago de depósito' }
            },
            { key: 'won', name: 'Reservado', type: 'sale', is_initial: false, is_terminal: true, allowed_next_states: [], metadata: { goal: 'Fase de planeación' } },
            { key: 'lost', name: 'Liberado', type: 'sale', is_initial: false, is_terminal: true, allowed_next_states: ['inquiry'], metadata: { goal: 'Liberar fecha' } }
        ],
        pipelineStages: [
            { name: 'Consulta', key: 'inquiry', mapToProcessKey: 'inquiry', color: 'bg-pink-500', icon: 'calendar' },
            { name: 'Visita', key: 'tour', mapToProcessKey: 'tour', color: 'bg-purple-500', icon: 'map' },
            { name: 'Cotizado', key: 'quote', mapToProcessKey: 'proposal', color: 'bg-blue-500', icon: 'dollar-sign' },
            { name: 'Contrato', key: 'contract', mapToProcessKey: 'contract', color: 'bg-orange-500', icon: 'pen-tool' },
            { name: 'Reservado', key: 'won', mapToProcessKey: 'won', color: 'bg-green-500', icon: 'party-popper' },
            { name: 'Perdido', key: 'lost', mapToProcessKey: 'lost', color: 'bg-red-500', icon: 'x' }
        ]
    },
    ecommerce: {
        id: 'ecommerce',
        name: 'E-commerce High-Ticket',
        description: 'Ventas asistidas de e-commerce (ej: maquinaria, vehículos).',
        industry: 'ecommerce',
        processStates: [
            {
                key: 'interest', name: 'Interés', type: 'sale', is_initial: true, is_terminal: false,
                allowed_next_states: ['product_advisory', 'lost'],
                metadata: { goal: 'Capturar intención' }
            },
            {
                key: 'product_advisory', name: 'Asesoría', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['checkout', 'lost'],
                metadata: { goal: 'Sugerir producto correcto' }
            },
            {
                key: 'checkout', name: 'Checkout Asistido', type: 'sale', is_initial: false, is_terminal: false,
                allowed_next_states: ['won', 'lost', 'payment_issue'],
                metadata: { goal: 'Asegurar pago' }
            },
            { key: 'payment_issue', name: 'Problema de Pago', type: 'sale', is_initial: false, is_terminal: false, allowed_next_states: ['won', 'lost', 'checkout'], metadata: { goal: 'Resolver fallo de pago' } },
            { key: 'won', name: 'Orden Realizada', type: 'sale', is_initial: false, is_terminal: true, allowed_next_states: [], metadata: { goal: 'Logística' } },
            { key: 'lost', name: 'Abandonado', type: 'sale', is_initial: false, is_terminal: true, allowed_next_states: ['interest'], metadata: { goal: 'Remarketing' } }
        ],
        pipelineStages: [
            { name: 'Viendo', key: 'new', mapToProcessKey: 'interest', color: 'bg-gray-500', icon: 'search' },
            { name: 'Asesorando', key: 'advising', mapToProcessKey: 'product_advisory', color: 'bg-blue-500', icon: 'headphones' },
            { name: 'Carrito / Cotiz', key: 'cart', mapToProcessKey: 'checkout', color: 'bg-indigo-500', icon: 'shopping-cart' },
            { name: 'Comprado', key: 'won', mapToProcessKey: 'won', color: 'bg-green-500', icon: 'package' },
            { name: 'Abandonado', key: 'lost', mapToProcessKey: 'lost', color: 'bg-red-500', icon: 'x' }
        ]
    }
}
