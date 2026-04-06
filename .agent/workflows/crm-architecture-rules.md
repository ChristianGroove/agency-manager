---
description: Arquitectura Consolidada del CRM (Leads & Clients) y Sistema en 3 Capas
---

# 🏗️ Arquitectura y Reglas del CRM (Agency Manager)

Este documento define las reglas arquitectónicas establecidas durante la gran refactorización del CRM (Abril 2026). **Cualquier futura intervención en el código debe adherirse ESTRICTAMENTE a estas reglas para no quebrar la base de datos de producción.**

---

## 1. Patrón Bimodal: Unificación DB vs Aislamiento de Capa de Servicio

Históricamente, el sistema tenía dos tablas separadas: `leads` y `clients`. En una refactorización masiva, **estas tablas fueron UNIFICADAS a nivel de base de datos dentro de `public.leads`**, trasladando TODAS las relaciones e historiales (`invoices`, `services`, `subscriptions`, etc.) para apuntar obligatoriamente al sistema de leads.

Sin embargo, para evitar cruces mortales comerciales e invisibilización de métricas en Javascript, se estableció una regla de **Separación a nivel de Servicio Bimodal**, controlada rígidamente por la columna `contact_type`:

### API 1: Modalidad 'Leads' (CRM Ventas)
- **Repo Origen:** `public.leads` donde el registro de negocio actúa temporalmente.
- **Regla:** Solo fluye a través del embudo comercial (`ContactService`). 
- **Comportamiento:** Limitado sin tableros o insight features para evitar cargas transaccionales innecesarias.

### API 2: Modalidad 'Clients' (Centro Administrativo)
- **Repo Origen:** `public.leads WHERE contact_type = 'client'`
- **Regla:** Utiliza su propia capa lógica (`ClientService.ts`) especializada en orquestar interacciones estructuradas anexas como `hosting_accounts`, `active_services`, facturas anidadas, deudas, calculos matemáticos, y acceso de Portales.
- **Inbox Sidebar:** La pestaña de "Contactos" en el Sidebar del Inbox DEBE filtrar estrictamente por `contact_type = 'client'` para no mezclar prospectos (leads) con clientes reales.

### 👻 TRAMPA DE POSTGREST: "FACTURAS FANTASMAS Y SOFT-DELETES"
Al consultar las dependencias de los clientes usando la sintaxis embeddida de Supabase (`invoices(*)`), PostgREST **devolverá también registros soft-eliminados o archivados**, ya que no filtra la relación interna. Esto provocaba picos absurdos de facturación ("Facturas Fantasmas") donde registros `void` o con `deleted_at` inflaban la deuda.
**Regla Estricta:** Todo Service que proyecte Arrays relacionados debe mapear y purgar en Javascript (.filter()) la basura histórica `(!inv.deleted_at && !inv.archived && inv.status !== 'void')` ANTES de recalcular matemáticas (`debt`) o despachar el Payload a los componentes Reacr.

### 🚫 CASO DE ESTUDIO: LA CONFUSIÓN LETAL (ABRIL 2026)
Hubo un periodo en el que la tabla legacy `public.clients` no se había eliminado y un programador repuntó los servicios de "Facturación" asumiendo que esa era aún la fuente cliente. Esto provocó Crashings en todo el entorno (`Could not find relationship 'services'`), ya que la Capa DB tenía las llaves foráneas asignadas a `leads`.
**Nunca, por ninguna razón se debe retroceder la consulta de clientes a la vieja tabla `clients`. Siempre es y será `leads` filtrada por `contact_type='client'`.**

### 🎨 REGLA DE INTERFAZ: "GHOST TRIGGERS" EN MODALES
Al crear Sheets o Modales que soporten modo "Controlado" (vía props `open` y `onOpenChange`), **NUNCA se debe renderizar un disparador (`SheetTrigger`) por defecto** si la prop `trigger` es nula y el componente está en modo controlado. Esto inyecta botones fantasma al final del DOM (especialmente en Dashboards).
**Regla:** El `SheetTrigger` debe ser condicional: `{trigger ? <SheetTrigger>{trigger}</SheetTrigger> : !isControlled ? <SheetTrigger>Default Button</SheetTrigger> : null}`.

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
