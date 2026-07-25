# Arquitectura del Módulo de Restaurantes (Resto Space Ecosystem)

Este documento detalla la arquitectura técnica completa y la especificación de diseño del ecosistema para restaurantes y hospitalidad (`resto`), incluyendo la gestión gráfica de planos, comendero (Gestor de Pedidos / KDS), Menú Digital B2C y el Sistema de Portales y Administración de Meseros/Personal.

---

## 1. Visión General

El módulo **Resto Space** es la solución vertical para establecimientos gastronómicos en la plataforma SaaS. Ofrece una experiencia de 360° compuesta por cuatro componentes clave interconectados sin deuda técnica:

1. **Gestor de Planos y Zonas (`/resto-orders` → Mapa)**: Editor e interfaz de monitoreo visual en tiempo real de mesas y zonas del restaurante.
2. **Gestor de Pedidos y KDS (`/resto-orders`)**: Comendero operativo con vistas en Lista, Mapa y Pantalla de Cocina (KDS).
3. **Menú Digital B2C y Pedidos Autónomos (`/menu` y `/portal/[token]`)**: Experiencia de ordenamiento digital para comensales en mesa (vía QR) o domicilio/para llevar.
4. **Sistema de Meseros y Personal Operativo (`/resto-staff` y `/portal/[token]`)**: Administración de colaboradores, asignación relacional de zonas, atribución de sesiones, propinas y portal de meseros en móvil/tablet.

---

## 2. Modelo de Datos Central

El esquema relacional opera sobre los siguientes componentes en PostgreSQL/Supabase:

### A. Zonas y Mesas
- **`resto_zones`**: Zonas físicas (*Salón Principal, Terraza, VIP, Bar*). Contiene dimensiones del lienzo (`grid_width`, `grid_height`) y elementos decorativos (`visual_elements` JSONB).
- **`resto_tables`**: Mesas vinculadas a zonas. Almacena capacidad, forma geométrica, coordenadas (`pos_x`, `pos_y`, `width`, `height`, `rotation`), estado (`available`, `occupied`, `billing`, etc.) y `qr_token` hexadecimal único.

### B. Sesiones de Mesa y Comandas
- **`resto_table_sessions`**: Registro del ciclo de vida de atención a una mesa:
  - `opened_at` / `closed_at`: Tiempos de apertura y cierre.
  - `opened_by`: Usuario que abrió la sesión.
  - `waiter_id` (UUID → `organization_staff.id`): Mesero asignado a atender la sesión.
  - `status`: Estado de la sesión (`active`, `payment_pending`, `closed`).
  - `guest_count`: Número de comensales.
- **`resto_orders`**: Comandas de alimentos/bebidas asociadas a la sesión (`session_id`).
  - `kitchen_status`: Estado en cocina (`pending` → `preparing` → `ready` → `completed` / `cancelled`).
  - `round_number`: Número de ronda de pedidos en la misma mesa.
  - `items_snapshot` (JSONB): Snapshot de los ítems con variaciones y modificadores.
  - `tip_amount`: Propina registrada para la comanda.

### C. Personal y Asignación de Zonas
- **`organization_staff`**: Registro de colaboradores operativos del tenant (roles: `waiter`, `mesero`, `host`, `bartender`, `cajero`). Incluye `access_token` único para su portal y `pin_code` (4 dígitos) para modo POS compartido.
- **`resto_staff_zone_assignments`**: Tabla de unión (junction) N:M entre `organization_staff` y `resto_zones`.
  - `is_primary` (BOOLEAN): Indica si el mesero es el responsable principal de la zona.
  - Al asignar un mesero como primario a una zona, el sistema actualiza automáticamente el `waiter_id` de todas las sesiones activas en curso de esa zona.

---

## 3. Flujos Operativos y Portales

### A. Menú Digital B2C y Auto-Vinculación por QR
- Al escanear el QR de la mesa (`/portal/[qr_token]`), el cliente ingresa al Menú Digital.
- El sistema resuelve la mesa, detecta la zona (`table.zone_id`), busca al mesero primario asignado a esa zona (`resto_staff_zone_assignments`) y auto-asigna `waiter_id` a la sesión de mesa (`resto_table_sessions`).
- El portal B2C opera desacoplado del tema del CRM admin (soporta dark/light mode independiente).

### B. Gestor de Pedidos & KDS (`/resto-orders`)
- **Vista Lista**: Muestra comensales, columna **Modo** (Dine-In / Delivery) seguida de **Cliente**, total consumido, estado de pago y el botón **"🔔 Pidió Cuenta"**. Muestra `👤 Mesero: [Nombre]` bajo el número de mesa.
- **Vista Mapa**: Mapeo visual interactivo en vivo de las mesas. La barra superior en *Modo Live* muestra el conteo de mesas disponibles/ocupadas y un badge dinámico `👤 Mesero: [Nombre]` para la zona seleccionada.
- **Vista KDS**: Tarjetas de comandas para la cocina clasificadas por estado con alertas sonoras en tiempo real al recibir nuevos pedidos o solicitudes de cuenta.

### C. Portal del Mesero (`/portal/[access_token]`)
- Detección polimórfica en `getPortalData` (tipo `resto_staff`).
- Funciona mediante enlace directo (`/portal/[access_token]`) o mediante tablet compartida con autenticación por PIN rápido de 4 dígitos.
- **Pestañas del Mesero**:
  1. **Mesas**: Grilla en tiempo real de mesas agrupadas por zona con estados (*Disponible, Ocupada, 🔔 Pidió Cuenta*).
  2. **Comandas**: Pedidos en cocina para sus mesas con indicador del estado del plato (*Pendiente, En Preparación, ¡Listo para Servir!*).
  3. **Propinas**: Resumen analítico de propinas con filtros por Hoy, Esta Semana y Este Mes.
  4. **Perfil**: Datos del colaborador y zonas asignadas.
- **Delimitación por Turno Diario**: Todas las consultas del portal del mesero aplican un filtro estricto `.gte('opened_at', todayISO)` para cargar únicamente las sesiones y pedidos del turno del día, aislando sesiones pasadas o no cerradas.

---

## 4. Estructura de Archivos y Código

```
src/
├── app/(dashboard)/
│   ├── resto-orders/page.tsx           # Gestor de Pedidos & KDS
│   └── resto-staff/page.tsx            # Administración de Meseros y Personal
├── app/(public)/portal/[token]/page.tsx # Enrutador polimórfico (B2C Cliente / Staff Portal)
└── modules/features/resto-orders/
    ├── actions.ts                       # Server Actions principales de comandas
    ├── actions/resto-staff-actions.ts   # Server Actions de meseros, asignaciones y propinas
    └── components/
        ├── resto-orders-table.tsx       # Tabla de comandas con atribución de mesero
        ├── kds-board.tsx                # Tablero de cocina KDS
        ├── resto-staff-admin-view.tsx   # Vista de gestión de colaboradores y asignación de zonas
        └── staff-portal/                # Portal móvil de mesero (Tabs: Mesas, Comandas, Propinas, Perfil)
```

---

## 5. Garantías de Escalabilidad y Cero Deuda Técnica
- **Multi-Tenant Seguro**: Todas las tablas aplican filtro `organization_id` y RLS a nivel de base de datos.
- **Server Actions con SupabaseAdmin**: La gestión de personal y asignaciones de zonas se realiza mediante Server Actions validados en servidor, previniendo errores de cliente RLS o falta de cache.
- **Polimorfismo de Portales**: El endpoint `/portal/[token]` resuelve de forma transparente si el token pertenece a un cliente B2C o a un mesero operativo, reutilizando la infraestructura de seguridad de tokens.
