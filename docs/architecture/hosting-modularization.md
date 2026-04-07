# Documentación Técnica: Modularización de Hosting Web

Este documento detalla la refactorización integral realizada en el módulo de Hosting Web para alinearlo con la arquitectura modular del sistema y la consolidación del CRM (tabla `leads`).

## Arquitectura de 3 Capas

El módulo de hosting ha sido actualizado para seguir estrictamente el patrón de 3 capas:

1.  **Capa de Servicios (`Service Layer`)**: Ubicada en `src/modules/features/hosting/services/hosting-service.ts`. Maneja la persistencia y la lógica de negocio pura.
2.  **Capa de Acciones (`Server Actions`)**: Ubicada en `src/modules/features/hosting/actions.ts`. Orquestador de solicitudes desde la UI, encargado de la validación de permisos y la revalidación de caché (`revalidatePath`).
3.  **Capa de Interfaz (`UI Layer`)**: Ubicada en `src/app/(dashboard)/platform/hosting-accounts/page.tsx`. Componentes visuales que delegan la carga y manipulación de datos a las acciones del servidor.

## Consolidación del CRM (Leads & Clients)

Tras la migración de contactos a la tabla única `leads`, se realizaron los siguientes ajustes quirúrgicos:

-   **Joins Unificados**: Se configuraron los joins explícitos mediante `client:leads!client_id` para garantizar la visibilidad de cuentas vinculadas tanto a prospectos como a clientes.
-   **Modularización del Selector**: El selector de clientes en el formulario de creación ahora utiliza la acción centralizada `getContactOptions`, eliminando la dependencia directa de la base de datos en el cliente.

## Optimización de Rendimiento

-   **Eliminación de Dynamic Imports**: Se refactorizó la página principal para cargar las acciones del servidor de forma estática, mejorando el tiempo de respuesta inicial.
-   **Manejo de Estados**: Se estandarizó el manejo de estados de carga y errores mediante `toast` y utilidades de UI consistentes con el resto de la aplicación.

## Mantenimiento Futuro

Cualquier extensión técnica de los servidores (como integraciones con APIs de cPanel o Plesk) debe implementarse primero en la **Capa de Servicios** para mantener la integridad de la arquitectura.
