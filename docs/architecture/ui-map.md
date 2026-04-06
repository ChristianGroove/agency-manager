# Mapa de Módulos de UI (Next.js)

Este documento describe la estructura de la interfaz de usuario en el frontend, mapeando las áreas del dashboard a los dominios funcionales y detallando los componentes principales.

---

## 1. Organización de Vistas (App Router)

Las rutas del dashboard se encuentran en `src/app/(dashboard)/` y se dividen por dominios:

| Ruta | Dominio | Componente Principal / Propósito |
|---|---|---|
| `/inbox` | **Mensajería** | Omni-Inbox: Bandeja de entrada multicanal. |
| `/crm` | **CRM** | Pipeline Kanban: Visualización del proceso de ventas. |
| `/automations` | **Automatización** | Workflow Builder: Editor visual de flujos. |
| `/invoices` | **Billing** | Listado y visor de facturas generadas. |
| `/quotes` | **Billing** | Editor y visor de propuestas comerciales. |
| `/settings` | **SaaS Core** | Panel de configuración organizacional y personal. |
| `/resto-tables` | **Resto** | Mapa interactivo de gestión de mesas. |
| `/platform` | **SaaS Admin** | Panel de administración de niveles de sistema (Whitelabel). |

---

## 2. Componentes UI de Gran Tamaño (God Components)

Se han identificado componentes con alta complejidad y cantidad de líneas de código (>1000):

1. **`chat-area.tsx`** (~1144 líneas): Gestiona todo el estado del chat activo, visualización de mensajes y selector de herramientas.
2. **`client-card-v2.tsx`**: Centraliza toda la información del lead/cliente en la vista de detalle del CRM.
3. **`workflow-builder.tsx`**: Orquestador visual para la creación de automatizaciones.

---

## 3. Estrategia de Carga de Datos

El sistema utiliza varios métodos para la obtención y actualización de datos:

- **Server Actions**: Se usan para mutaciones (crear/actualizar) y para alimentar los datos iniciales de las páginas.
- **Supabase Realtime**: Implementado en la Omni-Inbox para recibir mensajes entrantes y actualizaciones de estado sin refrescar.
- **SWR / TanStack Query**: Utilizado para el cacheo de datos en el cliente y la revalidación automática (especialmente en el CRM y Dashboard).
- **Zustand**: Gestión de estado global simplificada para preferencias de UI y contextos multivertical.

---

## 4. Riesgos en la Capa UI

- **Lógica de Negocio Filtrada**: Existe una tendencia a manejar filtros y transformaciones de datos complejas directamente en los componentes de React, en lugar de delegar al Service layer.
- **Acoplamiento Directo al Esquema**: Muchos componentes consumen directamente las tipos generados por Supabase (`Lead`, `Quote`), lo que hace que cualquier cambio en la base de datos impacte de inmediato en la UI si no se usa un adaptador.
- **Rendimiento de Componentes Gigantes**: La alta concentración de lógica en `chat-area.tsx` y `client-card-v2.tsx` puede degradar el tiempo de interactividad (TTI) si no se optimiza con `memo` o `virtualization`.
