# Documentación Técnica: Modularización de Cotizaciones (Quotes)

Este documento detalla la refactorización realizada en el módulo de cotizaciones para alinearlo con la arquitectura modular del sistema y la consolidación del CRM.

## Arquitectura de 3 Capas

El módulo de cotizaciones ahora sigue estrictamente el patrón de 3 capas definido para asegurar escalabilidad y mantenibilidad:

1.  **Capa de Servicios (`Service Layer`)**: Ubicada en `src/modules/features/quotes/services/`. Contiene toda la lógica de negocio y las interacciones con Supabase. No tiene dependencias de React ni de componentes Next.js.
2.  **Capa de Acciones (`Server Actions`)**: Ubicada en `src/modules/features/quotes/quotes-actions.ts`. Actúa como orquestador entre la UI y los servicios, manejando la seguridad, validación y revalidación de caché de Next.js (`revalidatePath`).
3.  **Capa de Interfaz (`UI Layer`)**: Ubicada en `src/modules/features/quotes/components/`. Compuesta por componentes atómicos y vistas principales. Se ha eliminado toda interacción directa con `@supabase/supabase-js`, delegando todas las operaciones a la capa de acciones.

## Consolidación del CRM (Leads & Clients)

Con la migración de todos los contactos a la tabla única `leads`, el módulo de cotizaciones ha sido actualizado quirúrgicamente:

-   **Relaciones Unificadas**: Las consultas ahora realizan joins explícitos con `leads` tanto para `client_id` como para `lead_id`.
-   **Compatibilidad del Portal**: Se ha corregido la lógica de federación en el portal del cliente para que las cotizaciones creadas originalmente como "leads" sean visibles y accesibles (incluyendo el PDF) de forma transparente.

## Mejoras de Eficiencia

-   **Eliminación de Joins Legacy**: Se eliminaron los joins a la tabla `clients` que causaban datos nulos e inconsistencias en la UI.
-   **Centralización de Lógica**: La lógica de conversión de cotizaciones a facturas ahora utiliza servicios centralizados, garantizando que el estado del CRM se mantenga íntegro durante el ciclo de venta.

## Pendientes y Próximos Pasos

1.  **Auditoría de RLS**: Verificar que las nuevas políticas de RLS para administradores permitan la visibilidad total de cotizaciones independientemente del rol del creador original.
2.  **Automatizaciones**: Integrar el disparador de "Cotización Aceptada" con el motor de automatización centralizado para disparar flujos de bienvenida automáticos.
