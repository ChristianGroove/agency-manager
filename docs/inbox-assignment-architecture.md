# Arquitectura de Inbox y Motor de Asignación

Este documento describe la lógica técnica, las estrategias de enrutamiento y las políticas de aislamiento del sistema de mensajería (Inbox).

## 1. Motor de Asignación (Assignment Engine)

El motor (`assignment-engine.ts`) es el núcleo que decide a qué agente se le entrega una nueva conversación.

### Estrategias Soportadas
- **Round Robin (Rotación Continua)**: Reparte leads de forma equitativa entre los agentes disponibles. Utiliza ordenamiento determinista por `agent_id` para evitar saltos.
- **Load Balance (Balanceo de Carga)**: Asigna el lead al agente con menor porcentaje de ocupación (basado en `current_load` vs `max_capacity`).
- **Skills-based**: Filtra agentes según etiquetas de habilidad, aplicando luego Round Robin entre los calificados.

### Protocolo de Disponibilidad (Heartbeat)
Para evitar asignar leads a agentes inactivos o con la pestaña cerrada:
- **Umbral de Vida**: Se requiere un `last_seen_at` dentro de los últimos **3 minutos** (180 segundos).
- **Fallback**: Si no hay agentes activos bajo este umbral dentro de los seleccionados, el sistema puede reintentar o asignar al administrador según la configuración de la regla.

## 2. Aislamiento de Datos y Privacidad

El sistema garantiza que los agentes solo operen sobre lo que les corresponde:
- **Vinculación Técnica**: Un agente solo es elegible para leads de un canal si cumple una de estas condiciones:
  1.  Está vinculado en `agent_channels` (Autorización por tipo de canal: WhatsApp, Instagram, etc.).
  2.  Posee el ID del canal específico en su array `permissions.inbox_access` (Autorización granular por canal).
- **Aislamiento de Vista**: Si un usuario tiene el rol `Member` y NO posee el permiso `inbox.conversations.view_all`, la interfaz (`sidebar-conversation-list.tsx`) filtrará el feed para mostrar **únicamente sus conversaciones asignadas** en los canales autorizados.
- **Bypass de Jerarquía Directo**: Los roles `Admin` y `Owner` (incluyendo variantes como `Administrador` y `Dueño`) poseen **visibilidad total implícita** inyectada en el frontend. El bypass se activa automáticamente basado en el valor de `role` del usuario, permitiendo la supervisión de todos los chats de todos los canales de la organización por defecto.

## 4. Sincronización de Carga (Real-Time Workload)

Para asegurar que el dashboard de agentes refleje la ocupación real, el sistema utiliza un mecanismo de sincronización reactiva en la base de datos:

- **Trigger de Sincronización**: El trigger `trigger_update_agent_load` en la tabla `conversations` recalcula automáticamente el `current_load` del agente cada vez que una conversación cambia de estado, estatus o asignación.
- **Definición de "Carga Activa"**: Se considera carga únicamente si la conversación cumple:
  - `state = 'active'`
  - `status IN ('open', 'snoozed')`
  - `assigned_to IS NOT NULL`
- **Herramienta de Reconciliación**: Debido a posibles latencias o estados inconsistentes en migraciones, el sistema ofrece un botón de **"Sincronizar Cargas"** en el dashboard administrativo que ejecuta `public.reconcile_agent_loads()` para forzar una corrección masiva.

## 5. Gobernanza de Interfaz (UI RBAC)

Ciertas partes de la configuración del Inbox son estrictamente administrativas y se protegen a nivel de componente:

| Elemento | Restricción | Componente |
| :--- | :--- | :--- |
| Pestaña **"Reglas"** | Solo Admin/Owner | `InboxSettingsSheet.tsx` |
| Dashboard **"Carga del Equipo"** | Solo Admin/Owner | `AgentWorkloadDashboard.tsx` |
| Sincronización Manual | Solo Admin/Owner | `AgentWorkloadDashboard.tsx` |
| Simulación de Leads | Solo entornos non-prod + Admin | `AgentWorkloadDashboard.tsx` |

## 6. Mantenimiento y Extensión

Al agregar nuevas estrategias o cambiar la lógica de aislamiento:
1.  Actualizar `assignment-engine.ts` asegurando que el ordenamiento sea siempre determinista (`.order('agent_id')`).
2.  Mantener el umbral de 3 minutos para coherencia con el refresco del frontend.
3.  Verificar que cualquier nuevo insight administrativo sea inyectado con el flag `isAdmin` derivado de `getCurrentUserPermissions`.
4.  Si se introducen nuevos estados de conversación, actualizar la función `fn_sync_agent_load_on_change` en la base de datos.
