# Arquitectura del Módulo de Briefings (Formularios)

Este documento detalla la refactorización arquitectónica y la integración con el CRM consolidado realizada en Abril de 2026.

## Estado de la Modularización

El módulo ha sido migrado a una **Arquitectura de 3 Capas** para garantizar escalabilidad, seguridad (RLS) y facilidad de mantenimiento, eliminando la dependencia de lógica pesada en las acciones de servidor.

### 1. Capa de Servicios (Data Access Layer)
- **Archivo**: `src/modules/features/forms/services/briefing-service.ts`
- **Función**: Contiene toda la lógica de interacción con Supabase para plantillas, envíos y respuestas.
- **Responsabilidad**: Consultas puras, filtrado por `organization_id` y gestión de relaciones directas.

### 2. Capa de Acciones (Orchestration Layer)
- **Archivo**: `src/modules/features/forms/actions.ts`
- **Función**: Server Actions que invocan al servicio.
- **Responsabilidad**: Orquestación de notificaciones, revalidación de caché de Next.js (`revalidatePath`) y manejo de errores para la UI.

### 3. Capa de Interfaz (UI Layer)
- **Archivos**: `src/modules/features/forms/*.tsx` y `src/app/(dashboard)/briefings/page.tsx`.
- **Función**: Componentes de React que consumen exclusivamente las Server Actions.

## Integración con CRM (Leads & Clients)

El módulo de Briefings ha sido unificado bajo el concepto **Lead-First**.

- **Relación de Base de Datos**: La tabla `briefings` ahora apunta directamente a `public.leads(id)`.
- **Redirección de FK**: Se ha realizado una migración (`20260407135500_crm_consolidation_final_fks.sql`) para redirigir la llave foránea que anteriormente apuntaba a la tabla obsoleta `clients`.
- **Compatibilidad**: Tanto los clientes antiguos (migrados a `leads`) como los nuevos prospectos pueden recibir y responder formularios utilizando el mismo sistema de tokens y portal.

## Flujos Críticos

1. **Creación de Envío**: Se genera un registro en `briefings` vinculado a un `lead_id`. Se dispara una notificación al contacto si tiene email.
2. **Respuesta en Portal**: El cliente accede mediante un token único. Sus respuestas se guardan en `briefing_responses`, actualizando el estado del briefing a `submitted`.
3. **Consolidación de Identidad**: Al ser un sistema unificado, el portal del cliente recupera automáticamente todos los briefings históricos vinculados a su ID de lead.

## Mantenimiento

Para añadir campos o nuevas funcionalidades de formularios, se debe extender primero el `BriefingService` antes de exponer la funcionalidad en `actions.ts`. No se deben realizar llamadas directas a Supabase desde los componentes de UI.
