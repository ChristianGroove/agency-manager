# Arquitectura de 3 Capas - Módulo de Facturación (Billing)

Este documento detalla la reestructuración física y lógica del módulo de Facturación implementada en la Fase 3 del refactor del Core.

## 1. Visión General
El módulo de Facturación ha sido extraído del "Monolito del Core" (`src/modules/core/billing`) hacia un Feature modular (`src/modules/features/billing`). El objetivo es aislar la lógica de negocio vertical para maximizar la escalabilidad y facilitar el mantenimiento.

## 2. Estructura de Directorios (Mapping)

| Directorio Core (Anterior) | Directorio Feature (Nuevo) | Propósito |
|---------------------------|----------------------------|-----------|
| `core/billing/*.ts`       | `features/billing/services/` | Lógica de negocio y consultas DB puras. |
| `core/billing/actions/`   | `features/billing/billing-actions.ts` | Fachada central de Server Actions. |
| `core/billing/components/`| `features/billing/components/` | Componentes de la interfaz de usuario. |
| `core/billing/usage/`     | `core/usage/` | Utilidades compartidas de SaaS Engine (permanecen en Core). |

## 3. El Patrón de 3 Capas

Para garantizar la integridad del sistema, se ha implementado un flujo estrictamente unidireccional:

### A. Capa de Servicios (`/services`)
Contienen funciones asíncronas puras que interactúan con Supabase. No tienen dependencias de Next.js (cache, revalidate) ni de la UI.
- **`billing-service.ts`**: Gestión de facturas (`invoices`) y ciclos de recurrencia.
- **`payment-service.ts`**: Pasarelas de pago, suscripciones de plataforma y transacciones.
- **`revenue-service.ts`**: Reglas de comisión, liquidaciones (`settlements`) y métricas de ingresos para Resellers.
- **`platform-billing-service.ts`**: Herramientas exclusivas para SuperAdmins (facturación manual de plataforma).

### B. Capa de Fachada (`billing-actions.ts`)
Es el único punto de entrada para los componentes y módulos externos (ej: Asistente).
- Utiliza la directiva `"use server"`.
- Centraliza la revalidación de caché (`revalidatePath`).
- **Standardized Naming**: Las acciones terminan en `Action` (ej: `createInvoiceAction`) para diferenciarlas de las funciones de servicio.

### C. Capa de UI (`/components`)
Componentes desacoplados que consumen únicamente la Fachada de Acciones. No importan servicios directamente.

## 4. Diferenciación de Facturación (Capa 0 vs Capa 1)

Es crítico entender la separación lógica mantenida en este módulo:

1.  **Platform Billing (Capa 0)**: Pixy -> Agencia. Se gestiona a través de `PlatformBillingService`. Controla el acceso al software y suscripciones SaaS.
2.  **Client Billing (Capa 1)**: Agencia -> Cliente Final. Se gestiona a través de `BillingService`. Es la herramienta de facturación/POS que la agencia ofrece a sus clientes.

## 5. Integraciones Críticas

- **Assistant/AI**: Las acciones del asistente (`list-pending`, `send-reminder`) ahora apuntan directamente a la fachada de `features/billing/billing-actions.ts`.
- **Inngest Workers**: Los procesos de facturación automática y dunning han sido actualizados para importar desde `core/usage` (para límites) y `features/billing/services` (para transacciones).
- **Public Invoices**: La página pública de facturas (`/invoice/[id]`) utiliza `getPublicInvoice` del `BillingService` para garantizar seguridad RLS y performance.

## 6. Guía de Intervención Futura

> [!IMPORTANT]
> **REGLA DE ORO**: Nunca importes archivos de `billing/services/` directamente en un componente de la UI. Usa siempre la fachada `billing-actions.ts`.

Si necesitas agregar una funcionalidad:
1. Implementa la lógica en el servicio correspondiente dentro de `services/`.
2. Expón la función envolviéndola en una Server Action dentro de `billing-actions.ts`.
3. Invoca la acción desde la UI.

---
*Ultima actualización: Abril 2026 - Fase 3 Refactor*
