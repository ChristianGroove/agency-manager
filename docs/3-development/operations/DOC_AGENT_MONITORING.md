# Specialized Documentation: Agent Monitoring Widget

This document provides a deep dive into the architecture and maintenance of the Agent Monitoring tool (hereafter referred to simply as "The Widget").

## 1. Core Architecture

The widget follows a "Server-Hydrated Client Component" pattern to ensure maximum performance and zero flicker.

### A. Data Layer (Supabase RPC)
**File**: `supabase/migrations/20260317000010_agent_monitoring_stats_rpc.sql`
- **Function**: `get_agent_monitoring_stats(p_org_id UUID)`
- **Logic**:
  - Fetches all members of an organization.
  - Joins with `profiles` for names/avatars.
  - Joins with `agent_availability` for status (online/offline) and capacity.
  - Aggregates unread/inbound conversations from `conversations`.
  - **Shared Visibility**: Unassigned conversations (`assigned_to IS NULL`) are globally counted and added to the `unread_count` of all members with `role` in ('owner', 'admin').

### B. Backend Layer (Service Action)
**File**: `src/modules/core/dashboard/actions.ts`
- **Function**: `getDashboardPayload`
- **Logic**: 
  - Validates if the user is an Admin/Owner and if the space is `saas` or `retail`.
  - Calls the RPC and injects `agentStats` directly into the payload root for instant hydration.
  - **Security**: Strips `agentStats` for standard "Member" roles to prevent data leaks.

### C. Frontend Layer (React Component)
**File**: `src/modules/core/dashboard/widgets/smart-cards/agent-monitoring-widget.tsx`
- **Component**: `AgentMonitoringWidget`
- **Features**:
  - Horizontal scrollable list of agent avatars.
  - Real-time status badges (green/gray).
  - Hover tooltips with extended insights (Last activity, Current load, Offline time).

---

## 2. Shared Visibility Logic (The "Inbox" Logic)

To avoid unassigned chats getting lost, the system does not use a separate "Nobody" avatar. Instead:
1. It calculates a `v_unassigned_count` globally for the organization.
2. It adds this count to every user marked as `owner` or `admin`.
3. This creates a "Shared Responsibility" model where any manager can see the pending workload.

### C. Lógica de Burbujas (Persistencia y Robustez)
Para evitar que las burbujas se queden "pegadas" y asegurar que los mensajes no "desaparezcan" por errores de base de datos:
- **Trigger Defensivo**: Ahora gestiona correctamente contenidos no-objetos (strings planos) y metadatos corruptos para evitar que la transacción falle y se haga rollback del mensaje.
- **Reseteo de Contador**: Fuerza `unread_count` a 0 en cuanto hay una respuesta.
- **RPC Fail-Safe**: El widget oculta la burbuja si el último mensaje es `outbound`, independientemente del estado del contador.

---

## 3. Mantenimiento y Solución de Problemas

### Agregar un Nuevo Campo de Datos
1.  **SQL**: Actualizar la definición `RETURNS TABLE` en el RPC y la sentencia `SELECT` interna.
2.  **Interface**: Actualizar la interfaz `AgentStat` en `agent-monitoring-widget.tsx`.
3.  **UI**: Añadir la lógica de renderizado en `AgentStatItem` o su `Tooltip`.

### Fallbacks de Nombres
El sistema está diseñado para nunca mostrar un nombre vacío o un UUID largo. Utiliza:
```sql
COALESCE(NULLIF(p.full_name, ''), 'Agente ' || LEFT(m.user_id::text, 4))
```
Si se desea cambiar el fallback (por ejemplo, a correo electrónico), modificar esta línea en el RPC.

### Seguridad y Permisos
El RPC está marcado como `SECURITY DEFINER`. El acceso está limitado a usuarios `authenticated` mediante `GRANT`. Si el widget deja de mostrar datos, verificar:
1.  El rol del usuario en `organization_members`.
2.  El `orgType` coincidente en `actions.ts`.

---
**Maintained by**: Antigravity AI
**Last Updated**: March 2026
