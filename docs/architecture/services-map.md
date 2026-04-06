# Mapa de la Capa de Servicios (Business Logic)

Este documento describe la organización de la lógica de negocio en la capa de servicios, detallando sus responsabilidades y las interacciones con los repositorios de datos.

---

## 1. Estructura de Servicios por Dominio

### Dominio: CRM & Ventas
| Servicio | Responsabilidad | Dependencias Principales |
|---|---|---|
| `LeadsService` | Creación de contactos, scoring de leads, conversión a cliente. | `LeadsRepository`, `ProcessEngine`. |
| `DealService` | Gestión de oportunidades comerciales y vinculación a pipelines. | `DealsRepository`. |
| `PipelineService` | Definición de etapas y flujo de ventas. | `SupabaseClient`. |
| `ContactService` | Gestión de metadatos de contacto y categorías. | `ContactRepository`. |

### Dominio: Mensajería & Comunicación
| Servicio | Responsabilidad | Dependencias Principales |
|---|---|---|
| `MessagingService` | Envío/Recepción omnicanal, gestión de estados de mensaje. | `MessagingRepository`, `Inngest`. |
| `BroadcastService` | Orquestación de envíos masivos. | `MessagingService`, `OrganizationLimits`. |
| `ChannelService` | Configuración de conexiones (Meta, WhatsApp, etc.). | `IntegrationsService`. |

### Dominio: Facturación & Finanzas
| Servicio | Responsabilidad | Dependencias Principales |
|---|---|---|
| `BillingService` | Ciclo de vida de facturas y emisión legal. | `InvoiceRepository`, `EmitterService`. |
| `QuoteService` | Creación de propuestas comerciales y validación. | `QuotesRepository`, `BillingService`. |
| `PaymentService` | Integración con pasarelas (Stripe, Wompi). | `TransactionsRepository`. |

### Dominio: IA & Automatización
| Servicio | Responsabilidad | Dependencias Principales |
|---|---|---|
| `AIEngineService` | Inferencia de modelos, generación de respuestas. | `ProvidersRepository`, `KnowledgeService`. |
| `ProcessEngine` | Ejecución de procesos de negocio (state machines). | `WorkflowRepository`. |
| `KnowledgeService` | Gestión de fragmentos de conocimiento vectorizados. | `SupabaseVectorStore`. |

---

## 2. Patrón de Interacción: Action → Service → Repository

El sistema implementa este patrón para desacoplar la UI de la lógica de persistencia:

1. **Server Action**: Punto de entrada desde los componentes de Next.js. Valida la sesión y los permisos básicos.
2. **Service**: Contiene la lógica de negocio "pesada". Puede llamar a múltiples repositorios o a otros servicios.
3. **Repository**: Encapsulado de las consultas a Supabase (PostgreSQL). No contiene lógica de negocio, solo operaciones CRUD y filtros complejos.

---

## 3. Riesgos y Observaciones de la Capa de Lógica

- **Acoplamiento Directo**: Algunos servicios instancian sus repositorios internamente (`new Repository(supabase)`) en lugar de recibirlos por inyección, lo cual dificulta el testing unitario puro.
- **Inyección de SupabaseClient**: La dependencia del cliente de Supabase está presente en toda la cadena, acoplando la lógica de negocio a la tecnología de base de datos específica.
- **Duplicidad**: Existe una ligera duplicidad entre `crm-actions` y los servicios especializados, donde algunas acciones contienen lógica que debería residir en el servicio.
