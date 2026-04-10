# 🔧 Reporte de Reparación: Sincronización de Perfiles e IAM (Abril 2026)

## 1. Problema Identificado
Se detectaron dos inconsistencias críticas en la gestión de agentes y perfiles:
1.  **Fuga de nombres (Nombres Vacíos)**: Los usuarios creados manualmente aparecían como "Sin Nombre" a pesar de haber ingresado el nombre en el formulario.
2.  **Agentes Fantasma**: Administradores de la plataforma (`super_admin`) aparecían como agentes disponibles en el Inbox, pero no eran visibles en la tabla de configuración del equipo, causando confusión sobre la membresía real de la organización.

## 2. Análisis Técnico (Root Cause)
- **Error en Upsert de Perfiles**: El método `createUserManually` intentaba realizar un `upsert` en la tabla `profiles` incluyendo una columna `email`. Dado que la tabla `profiles` NO contiene una columna `email` (esta información reside en `auth.users` y en `organization_members`), la operación de base de datos fallaba. Debido a que el error se capturaba solo en `console.error` y no interrumpía la ejecución, el usuario se creaba pero su nombre nunca llegaba a la tabla `profiles`.
- **Inconsistencia de Filtros**: La tabla de configuración de equipo filtraba correctamente a los `super_admin`, pero la función `getSidebarAgents` (utilizada por el selector del Inbox) no aplicaba este filtro, mostrando a todos los miembros técnicos de la base de datos sin distinción de rol de plataforma.

## 3. Soluciones Implementadas

### A. Corrección de Código (`team.ts`)
Se eliminó la columna inexistente del objeto de `upsert` y se mejoró la gestión de errores para que cualquier fallo en la sincronización del perfil sea reportado inmediatamente al frontend.

### B. Sincronización de Filtros (`assignment-actions.ts`)
Se actualizó `getSidebarAgents` para cargar el `platform_role` de cada miembro y filtrar a aquellos con rol `super_admin`, armonizando la vista del Inbox con la vista de Configuración.

### C. Reparación de Datos (Script de Sincronización)
Se ejecutó un script de reparación masiva que:
1.  Iteró sobre todos los usuarios de `auth.users`.
2.  Extrajo el nombre real de los `user_metadata`.
3.  Actualizó los registros faltantes en `profiles` y `organization_members`.
4.  Resultado: **+40 perfiles restaurados con éxito.**

### D. Persistencia de Campos Extendidos (Cargo y Teléfono)
Se corrigió un problema donde los cambios en "Cargo / Título" y "Teléfono" no se reflejaban en la UI tras guardar.
1.  **Server side**: Se robusteció `updateProfile` para devolver el perfil actualizado y sincronizar con `organization_members`.
2.  **Client side**: Se implementó un callback `onSuccess` en `ProfileForm` y una `key` reactiva para forzar el refresco de los campos del formulario con los datos reales de la base de datos inmediatamente después del éxito.

## 4. Medidas Preventivas
- Se ha documentado que la tabla `profiles` es puramente para metadatos de perfil (nombre, avatar, etc.) y que el email debe consultarse en `auth.users`.
- Cualquier cambio en los filtros de visibilidad de miembros debe aplicarse tanto en `settings/actions/team.ts` como en `messaging/assignment-actions.ts`.
- Las Server Actions de perfil deben devolver el objeto actualizado para que los componentes Client-Side puedan sincronizar su estado local sin depender de recargas de página pesadas.

---
**Estado: SOLUCIONADO Y CERTIFICADO**
