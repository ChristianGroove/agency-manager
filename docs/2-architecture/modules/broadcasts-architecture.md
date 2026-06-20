# Arquitectura del Módulo de Difusiones (Broadcasts / Marketing)

Este documento detalla la estructura y el motor de ejecución del módulo de Difusiones y Marketing (`broadcasts`).

## 1. Visión General
El módulo de Difusiones está diseñado para orquestar envíos masivos, secuencias de seguimiento (drip campaigns) y mensajes promocionales (marketing) a través de canales como WhatsApp, SMS y Email. Cumple estrictamente con las políticas de Meta (v24.0) y gestiona suscripciones (opt-outs) y aislamientos de Tenant (Multi-Tenancy).

## 2. Modelo de Datos Central

El sistema opera sobre un motor de secuencias (Sequences) estructurado en varias tablas:

- **`marketing_campaigns`**: Cabecera de la campaña (configuración general, fechas programadas).
- **`marketing_steps`**: Nodos individuales dentro de una secuencia (ej: "Enviar Mensaje 1", "Esperar 2 días", "Enviar Mensaje 2"). Tipos de pasos soportados: `whatsapp`, `sms`, `email`, `delay`.
- **`marketing_enrollments`**: El registro de que un contacto/lead específico está participando en una secuencia. Almacena el puntero al paso actual (`current_step_id`) y la fecha de próxima ejecución (`next_run_at`).

## 3. Patrones de Diseño Implementados

### Motor de Ejecución en Segundo Plano (Cron Runner)
A diferencia de los mensajes transaccionales síncronos, las difusiones se procesan mediante un motor asíncrono (Cron Job) ubicado en `marketing-runner.ts`.
1. **Polling**: El `runMarketingCycle()` busca enrolamientos "activos" cuyo `next_run_at` haya vencido.
2. **Tenant Isolation Check**: Verifica imperativamente que la campaña y el lead pertenezcan al mismo `organization_id` antes de procesar cualquier cosa.
3. **Opt-Out Check**: Si el lead marcó `marketing_opted_out`, el enrolamiento se cancela automáticamente de la secuencia, previniendo penalizaciones de spam.
4. **Step Dispatcher**: Si el paso es un retraso (`delay`), calcula la nueva fecha y avanza el puntero. Si es un mensaje de WhatsApp con plantilla, inyecta las variables (nombre, etc.) e invoca a `marketingAPIManager`.

### Integración con Meta API (Fase 5)
El runner delega el envío de plantillas HSM directamente al `MarketingAPIManager` (ver `meta/services/README_PHASE5.md`), heredando así capacidades avanzadas como:
- **Gestión de TTL** (Time To Live).
- **Tracking de Conversiones** (CTWA).
- Prevención de degradación de calidad (si la calidad de la cuenta baja a LOW, las campañas se auto-pausan).

## 4. Dependencias y Relacionamiento
- **CRM (`leads`)**: Todos los contactos enrolados deben existir como Leads para tener trazabilidad de opt-outs.
- **Messaging (`messaging`)**: El runner reutiliza la capa de `getOrCreateOutboundConversation` para registrar los mensajes de difusión en el mismo hilo de chat que la atención humana.
- **Meta Infrastructure**: Se acopla a las credenciales (`integration_connections`) de `meta_whatsapp` o `whatsapp_cloud` configuradas por la organización.
