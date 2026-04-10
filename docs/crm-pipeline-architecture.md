# Arquitectura y Funcionamiento del Pipeline (CRM)

Este documento describe la arquitectura técnica, el flujo de datos y las operaciones críticas del sistema de Pipeline y Gestión de Leads de Pixy.

## 1. Modelo de Datos y Entidades
El corazón del CRM reside en la tabla `leads`, la cual ha sido optimizada para soportar grandes volúmenes de datos y filtros complejos.

### Campos Críticos de Salud (Phase 4):
- **`score` (int4)**: Puntaje de 0-100 calculado por el algoritmo de salud. Determina la prioridad del lead.
- **`last_scored_at` (timestamptz)**: Timestamp del último cálculo de score.
- **`estimated_value` (numeric)**: Valor proyectado del cierre, mapeado desde la propiedad legacy `value`.
- **`contact_type` (text)**: Discriminador crítico (`client` vs `lead`).
- **`master_contact_id` (uuid)**: Link de auto-referencia para vincular un lead transaccional con su **Contacto Maestro**.
- **`organization_id`**: Pilar del aislamiento Multi-Tenant vía RLS.

## 2. Gestión de Identidad y Seguridad (Safety Layer)

Para garantizar la integridad de los datos, el pipeline opera bajo un modelo de **Blindaje de Contactos Maestros**:

### A. Relación Lead-Maestro
Cada oportunidad en el embudo (`contact_type='lead'`) está vinculada a un registro de identidad permanente en la agenda (`contact_type='client'`) a través de `master_contact_id`. Esto permite:
- Tener múltiples negocios activos (ej: "Mantenimiento", "Rediseño") para una misma empresa sin duplicar datos de contacto.
- Mantener la consistencia de facturación y hosting centralizada en el "Master".

### B. Borrado Físico Definitivo
Toda acción de eliminación en el pipeline es **Física e Irreversible**.
- **Independencia de Borrado**: Eliminar un lead del embudo NO afecta al contacto maestro vinculado.
- **Service-Level Enforcement**: La lógica de "soft-delete" vía `deleted_at` ha sido erradicada de la capa de servicios (`ContactService`). Las eliminaciones ahora invocan directamente el método `hardDelete` del repositorio para garantizar la higiene total del esquema.

## 3. Ciclo de Vida del Lead (Lifecycle)

El sistema implementa una estrategia de **Data Hygiene** para mantener el rendimiento:

### A. Algoritmo de Scoring (`scoring.ts`)
Calcula el interés y salud del lead basándose en:
- **Completitud del Perfil**: Email, teléfono y nombre de empresa.
- **Engagement**: Volumen de mensajes recibidos y enviados.
- **Recencia (Decay)**: Aplicación de una penalización automática por inactividad. Si un lead no tiene actividad en >30 días, su score decrece un 2% diario.

### B. Purga Inteligente (`purgeColdLeads`)
Permite a los administradores drenar el pipeline de leads irrelevantes:
- **Criterio de Inactividad**: Filtra por `updated_at` inferior a X días.
- **Criterio de Score**: Filtra leads con salud por debajo de un umbral (ej. < 20).
- **Protección**: Nunca purga leads en estados `converted`, `customer` o con tratos activos.

### C. Exportación Optimizada (`exportLeadsToCSV`)
Diseñado para compatibilidad total con sistemas de marketing masivo y Excel:
- **Formato**: CSV con delimitador `;` y UTF-8 BOM.
- **Fix de Números**: Los teléfonos se formatean como `="numero"` para evitar que Excel los convierta a notación científica.
- **Rendimiento**: Soporta exportaciones rápidas de hasta 10,000 registros mediante `supabaseAdmin`.

## 3. Arquitectura de Consultas (Escalabilidad)

Para manejar miles de leads sin degradar la UI, el sistema utiliza un modelo híbrido:

### RPC: `get_paginated_leads`
- **Agregación Server-Side**: Calcula los conteos por etapa (`stageCounts`) y el total de registros en una sola consulta SQL.
- **Búsqueda Full-Text**: Búsqueda optimizada por nombre, empresa o teléfono.
- **Paginación**: Cursor-based/Offet-based para evitar carga excesiva de memoria en el cliente.

### Virtualización de UI
- Implementado mediante `react-virtuoso` en la `LeadManagementSheet` para renderizar solo los elementos visibles en el viewport.

## 5. Integración de Mensajería
Para asegurar una experiencia fluida, el CRM redirige las acciones de "Enviar Mensaje" directamente al Inbox:
- **Origen**: Dashboard (`LeadCard`), Inspector o Detail Modal.
- **Parámetros**: Se utilizan `contact` (teléfono/email) o `leadId` como parámetros de consulta.

## 6. Integración de Gestión de Etapas (Inbox UI)

Tras la estabilización de la Phase 4.1.2, la gestión del Pipeline se ha integrado profundamente en el Inbox mediante una interfaz táctica:

### A. Lead Stage Stepper
- **Componente**: `LeadStageStepper.tsx`
- **Ubicación**: Se despliega en la parte superior central del `ChatArea`, posicionado de forma absoluta para no obstruir el flujo de mensajes.
- **Diseño**: Adopta una estética de "Pill Badge" redondeada y minimalista, alineada verticalmente con el botón de **Nota** inferior para mantener el equilibrio visual de la interfaz.
- **Lógica Status-Driven**: El Stepper opera basándose en el campo `status` (status_key) de la tabla `leads`. Esto elimina la dependencia de columnas de esquema inconsistentes y garantiza que el cambio de etapa sea atómico y seguro.

### B. Sincronización de Procesos
Al cambiar la etapa desde el Stepper:
1. Se actualiza el campo `status` en la DB.
2. Si el Pipeline tiene activado el "Process Engine", se dispara una validación de transición automática.
3. El cambio se refleja instantáneamente en el **Command Center** (Analítica) gracias a la nueva arquitectura unificada de reportes.
