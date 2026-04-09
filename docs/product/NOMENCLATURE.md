# Nomenclatura del Sistema

Este documento define la terminología usada en diferentes capas del sistema para evitar confusiones durante el desarrollo.

## Capa Backend / Base de Datos

**Término técnico: `services`**
- Tabla: `services` (servicios contratados por clientes)
- Tabla: `service_catalog` (plantillas de servicios ofrecidos)
- Funciones: `addService()`, `deleteService()`, `updateService()`
- **NO CAMBIAR** - Estos son nombres técnicos estables

## Capa Frontend - Panel Admin

### Módulo: `/hosting` (Contratos)
**UI Display: "Contratos"**
- **Concepto:** Servicios YA vendidos/contratados a clientes
- **Descripción:** "Servicios contratados y proyectos en curso de tus clientes"
- **Nav Label:** "Contratos"
- **Botones:** "Nuevo Contrato", "Pausar Contrato", "Eliminar Contrato"
- **Mensajes:** "Contrato eliminado", "Cargando contratos..."

#### Archivos clave:
- `src/app/(dashboard)/hosting/page.tsx`
- `src/components/layout/sidebar.tsx`

### Módulo: `/portfolio` (Catálogo)
**UI Display: "Catálogo"**
- **Concepto:** Plantillas/oferta de servicios que la agencia ofrece
- **Descripción:** "Servicios y plantillas de briefing que ofrece tu agencia"
- **Nav Label:** "Catálogo"
- **Botones:** "Nuevo Servicio" (correcto, es una plantilla)

#### Archivos clave:
- `src/app/(dashboard)/portfolio/page.tsx`
- `src/components/layout/sidebar.tsx`

### Vista de Cliente Individual
**UI Display: "Contratos"**
- Insight card muestra cantidad de "Contratos" del cliente
- Sección "Servicios Activos & Facturación" (mantiene "servicios" por contexto)

#### Archivos clave:
- `src/app/(dashboard)/clients/[id]/page.tsx`

## Capa Frontend - Portal Cliente

### Módulo: Servicios del Cliente
**UI Display: "Mis Servicios"** (recomendado)
- **Concepto:** Los servicios que ESE cliente tiene contratados con la agencia
- **Descripción:** "Tus servicios activos con nosotros"
- **Usuario:** Cliente final (no admin)
- **Lenguaje:** Más amigable, menos formal que "Contratos"

#### Archivos clave:
- `src/app/(public)/portal/[token]/page.tsx`

## Capa Arquitectura - Categorías de Sistema (Spaces)

**Término técnico: `space_category`**
- Columna: `saas_apps.space_category`
- Tipo: `SpaceCategory` (en `space-helpers.ts`)
- **Concepto:** Define la industria y el layout visual de una organización.

| Categoría | Significado UI | Layout Predeterminado |
|-----------|----------------|-----------------------|
| `'agency'` | Agencia de Servicios (Marketing, etc) | Agency Dashboard |
| `'resto'` | Restaurante / F&B (Digital Menu) | Resto PWA / Dashboard |
| `'cleaning'` | Servicios de Limpieza / Facility | Agency Dashboard |
| `'retail'` | Comercio Minorista / Tiendas | Agency Dashboard |
| `'saas'` | Suscripciones de Software | Agency Dashboard |
| `'platform'` | Gestión de la Plataforma (Admin) | Agency Dashboard |

### Regla de Oro:
El sistema es **Agency-First**. Cualquier categoría que no sea `'resto'` utilizará por defecto el layout de Agencia (`isAgency = category !== 'resto'`). No crear nuevos layouts a menos que la industria lo requiera físicamente (como el menú de Resto).

---

## Resumen Rápido

| Contexto | Término UI | Significado |
|----------|-----------|-------------|
| **Backend** | `services` | Término técnico (NO cambiar) |
| **Admin: /hosting** | "Contratos" | Servicios vendidos/activos |
| **Admin: /portfolio** | "Catálogo" | Oferta de servicios |
| **SaaS Admin** | "Categoría" | Tipo de Space (`space_category`) |
| **Portal Cliente** | "Mis Servicios" | Sus contratos activos |
| **Resto Portal** | "Menú Digital" | Catálogo de productos B2C |

## Reglas para Desarrollo

1. **Backend/DB:** Siempre usar `services` (técnico)
2. **Admin UI:** Usar "Contratos" para instancias vendidas, "Catálogo" para oferta
3. **Portal Cliente:** Usar "Mis Servicios" (user-friendly)
4. **Comentarios:** Siempre documentar cuando uses estos términos en código nuevo

## Ejemplo de Comentario en Código

```typescript
// NOMENCLATURA: "Contratos" en UI = servicios vendidos (tabla: services)
const contracts = await fetchServices()

// NOMENCLATURA: "Catálogo" en UI = plantillas de servicios (tabla: service_catalog)
const serviceCatalog = await fetchServiceTemplates()
## Capa Mensajería - Motor de Asignación (Assignment Engine)

**Módulo: `assignment-engine.ts`**

| Término UI | Concepto Técnico | Mecanismo |
|------------|------------------|-----------|
| **"Round Robin"** | `round-robin` | Rotación secuencial basada en `assignment_history`. |
| **"Balanceado"** | `load-balance` | Asignación por menor carga de trabajo (`current_load`). |
| **"Selectivo"** | `specific-agent` | Rotación restringida a una lista específica de IDs. |
| **"Carga"** | `current_load` | Contador de chats activos (`state=active`, `status=open/snoozed`). Sincronizado por triggers. |
| **"Heartbeat"** | `last_seen_at` | Verificación de actividad (< 3 min). Si el asesor no tiene el inbox abierto, es ignorado. |

### Reglas críticas de mantenimiento:
1. **Atomisidad**: Siempre usar el RPC `fn_get_next_agent_atomic` para evitar asignaciones duplicadas por mensajes simultáneos.
2. **Historial**: Cada asignación DEBE registrarse en `assignment_history` incluyendo el `organization_id`, o la rotación se romperá (amnesia).
3. **Disparadores**: El funcionamiento del modo "Balanceado" depende del trigger `trigger_update_agent_load`. Si las cargas fallan, verificar este trigger.
4. **Pendiente**: Pulir el sistema de "Heartbeat" (actualmente 3 min es muy estricto y puede ignorar asesores conectados si no interactúan frecuentemente).
