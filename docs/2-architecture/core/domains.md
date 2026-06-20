# Descubrimiento de Dominios del Sistema

Este documento describe los dominios funcionales identificados en **Agency Manager**, mapeando sus responsabilidades, tablas de base de datos, servicios y módulos de UI relacionados.

---

## 1. Dominio: CRM & Ventas
**Propósito**: Gestión del ciclo de vida del cliente, desde el prospecto (lead) hasta el cierre de la venta y gestión de contactos.

- **Tablas**: `leads`, `contacts`, `pipelines`, `pipeline_stages`, `deals`, `client_categories`.
- **Servicios**: `LeadsService`, `ContactService`, `PipelineService`, `DealService`.
- **Módulos UI**: Dashboard de CRM, Pipeline (Kanban), Gestión de Leads, Filtros avanzados.
- **Dependencias**: 
    - **Messaging**: Para capturar leads desde chats.
    - **Billing**: Para convertir deals en facturas/cotizaciones.

---

## 2. Dominio: Mensajería (Messaging)
**Propósito**: Motor de comunicación omnicanal (WhatsApp, Instagram, Messenger).

- **Tablas**: `conversations`, `messages`, `channels`, `broadcasts`, `message_attachments`, `sender_profiles`.
- **Servicios**: `MessagingService`, `BroadcastService`, `ChannelService`, `InboxService`.
- **Módulos UI**: Bandeja de entrada universal (Omni-Inbox), Chat Area, Selector de canales, Plantillas de mensajes.
- **Dependencias**: 
    - **CRM**: Para asociar conversaciones a prospectos/clientes.
    - **AI**: Para respuestas inteligentes y análisis de sentimiento.

---

## 3. Dominio: Automatización (Automation)
**Propósito**: Orquestación de flujos de trabajo basados en eventos y estados.

- **Tablas**: `workflows`, `workflow_jobs`, `automation_rules`, `workflow_versions`.
- **Servicios**: `AutomationService`, `ProcessEngine`, `InngestWorker`.
- **Módulos UI**: Constructor de flujos (Workflow Builder), Monitor de ejecución, Configuración de disparadores (Triggers).
- **Dependencias**: 
    - **Messaging**: Para enviar mensajes automatizados.
    - **CRM**: Para mover leads de etapa automáticamente.

---

## 4. Dominio: Finanzas & Facturación (Billing)
**Propósito**: Gestión de ingresos, suscripciones SaaS y facturación a clientes finales.

- **Tablas**: `invoices`, `quotes`, `payment_transactions`, `subscriptions`, `plans`, `emitters`, `billing_cycles`.
- **Servicios**: `BillingService`, `PaymentService`, `SubscriptionService`, `StripeService`, `QuoteService`.
- **Módulos UI**: Panel de facturación, Editor de cotizaciones, Gestión de suscripciones, Configuración de pasarelas.
- **Dependencias**: 
    - **CRM**: Para obtener datos fiscales del cliente.
    - **Organizations**: Para límites de plan y cuotas.

---

## 5. Dominio: Inteligencia Artificial (AI)
**Propósito**: Servicios cognitivos para automatización de respuestas y análisis de datos.

- **Tablas**: `ai_providers`, `ai_credentials`, `ai_usage_logs`, `knowledge_base` (vectores).
- **Servicios**: `AIService`, `KnowledgeService`, `VectorSearchService`.
- **Módulos UI**: Configuración de Bots, Gestión de base de conocimientos, Logs de uso de IA.
- **Dependencias**: 
    - **Messaging**: Provee el contexto para las respuestas.
    - **Storage**: Para procesar documentos en la base de conocimientos.

---

## 6. Dominio: Verticales (Específicos de Industria)
**Propósito**: Funcionalidades nicho que aportan valor a industrias específicas.

### Resto (Restaurantes)
- **Tablas**: `restaurant_tables`, `restaurant_zones`, `orders`.
- **Módulos UI**: Mapa de mesas, Gestión de comandas.

### Attendance (Control de Personal)
- **Tablas**: `staff`, `attendance_logs`, `schedules`.
- **Módulos UI**: Marcación de asistencia, Reportes de nómina.

### Hosting (Servicios IT)
- **Tablas**: `hosting_accounts`.
- **Módulos UI**: Monitor de dominios y renovaciones.

---

## 7. Dominio: SaaS Core / Infraestructura
**Propósito**: Base del sistema multi-tenant, seguridad y utilidades transversales.

- **Tablas**: `organizations`, `users`, `profiles`, `organization_members`, `audit_logs`, `usage_metrics`, `branding_settings`.
- **Servicios**: `OrganizationService`, `AuthService`, `StorageService`, `UsageService`.
- **Módulos UI**: Configuración de perfil, Gestión de equipo, Dashboard de administración global.
