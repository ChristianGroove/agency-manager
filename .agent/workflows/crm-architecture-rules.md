---
description: Arquitectura Consolidada del CRM (Leads & Clients) y Sistema en 3 Capas
---

# 🏗️ Arquitectura y Reglas del CRM (Agency Manager)

Este documento define las reglas arquitectónicas establecidas durante la gran refactorización del CRM (Abril 2026). **Cualquier futura intervención en el código debe adherirse ESTRICTAMENTE a estas reglas para no quebrar la base de datos de producción.**

---

## 1. La Tabla Única Canónica (`leads`)

Históricamente, el sistema tenía dos tablas separadas: `leads` (prospectos) y `clients` (clientes). Esto causaba duplicidad severa de datos y desincronización de historiales de chat.

**Regla de Oro:** La tabla `clients` está **DEPRECADA**. La única fuente de verdad para cualquier persona, empresa, prospecto o cliente en el sistema es la tabla `public.leads`.

### El Discriminador: `contact_type`
Para saber si un registro en `leads` es un contacto frío o un cliente consolidado con facturación, usamos la columna `contact_type`. Valores aceptados:

- `'lead'`: Prospecto inicial. Vive en el CRM Pipeline.
- `'client'`: Cliente formal (suele tener `nit`, `address`, `category_id`). Vive en la tabla de Clientes y Portal.
- `'prospect'`: Prospecto cualificado (usado por cotizaciones).
- `'partner'`: Proveedores o socios.

### Conversión de Lead a Cliente
Nunca se debe hacer un `INSERT` nuevo para convertir a alguien. La conversión se hace haciendo un `UPDATE` al registro existente:
```sql
UPDATE leads SET contact_type = 'client', status = 'converted' WHERE id = '...';
```
Esto preserva el UUID original, manteniendo intacto todo su historial de chats, cotizaciones y facturas asociadas.

---

## 2. Prevención de Ambigüedad PostgREST (`!fk_name`)

Dado que ahora muchas tablas (`invoices`, `services`, `contracts`, `quotes`) apuntan a `leads` por defecto peero algunas aún conservan el nombre de columna foránea legacy (`client_id` apuntando a `leads.id`), **Supabase/PostgREST lanzará errores de ambigüedad si haces un `.select()` anidado sin especificar la llave.**

**Ejemplo Incorrecto (Romperá la UI):**
```typescript
.select('*, client:leads(*)') // ¡Error! PostgREST no sabe qué FK usar.
```

**Ejemplo Correcto (Obligatorio en todo el código):**
```typescript
// Le decimos explícitamente a Supabase a través de qué llave hacer el JOIN
.select('*, client:leads!client_id(*)') 
```

---

## 3. Clean Architecture (Tres Capas) en Server Actions

Para los módulos del CRM, está TERMINANTEMENTE PROHIBIDO crear "God Files" (Server Actions gigantes que combinan autenticación, SQL, lógica de negocio y llamadas a APIs externas en una sola función).

El desarrollo en el módulo CRM (ej. `src/modules/core/crm/`) ahora debe usar el **Patrón de Tres Capas**:

### Capa 1: Repositories (Acceso a Datos)
- **Ubicación:** `logic/repositories/`
- **Regla:** Solo ellos pueden importar y usar el cliente de Supabase para hacer consultas `.from('table')`.
- **Prohibido:** No pueden leer Cookies de Next.js, no revisan Auth, no envían eventos a Analytics. Puramente `SELECT`, `INSERT`, `UPDATE`, `DELETE`.

### Capa 2: Services (Reglas de Negocio)
- **Ubicación:** `logic/services/`
- **Regla:** Orquestan la aplicación. Si un Lead pasa a 'Ganado', el *Service* invoca al Process Engine, calcula Scores financieros, y luego le dice al *Repository* que guarde en base de datos.
- **Prohibido:** No maneja URLs, no redirige, no llama a `revalidatePath`.

### Capa 3: Controllers / Server Actions (Frontend Bridge)
- **Ubicación:** Archivos estelares como `leads-actions.ts`.
- **Regla:** Su único trabajo es validar que el usuario tenga sesión en Supabase Auth, instanciar el Service correspondiente pasándole los datos, y al final ejecutar `revalidatePath('/ruta')` de Next.js.
- Son funciones extremadamente cortas (menos de 20 líneas).

---

## 4. Fases Completadas (Hitos)

1. **Unificación Base de Datos (Migraciones Step 1-6):** Se le inyectaron a `leads` los campos de `clients` (portal_token, nit, category_id, redes sociales). Se migró la data sin pérdida de UUIDs.
2. **Re-Mapeo Físico y de Vistas:** Se alteraron las Constraints de `invoices`, `quotes`, `subscriptions`, etc., para apuntar formalmente a `leads(id)`. Se reemplazó el RPC de paginación Legacy.
3. **Refactorización Limpia (Leads):** El macro-archivo `leads-actions.ts` fue desguazado con éxito en la nueva arquitectura de Tres Capas (Service/Repo/Action), obteniendo **Exit code: 0** en el Build de Next.js.
4. **Hotfixes Frontend:** Se resolvió el bug de creación de contactos al entender que los nuevos Inserts requerían el discriminador `contact_type = 'client'`.

## 5. Pendientes (Próximas Fases)
- **Squash de Migraciones:** Consolidar los 220 archivos `.sql` en un solo `baseline` (A realizarse con extrema cautela ya que se opera directo sobre Producción).
- **Refactorización de Otros Módulos:** Aplicar el mismo patrón de Tres Capas a `deal-actions.ts` y `crm-advanced-actions.ts`.
- **Deprecación Final:** En unas semanas o meses, eliminar físicamente la tabla `clients` de Supabase una vez confirmemos métricas de estabilidad totales.
