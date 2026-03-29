# Arquitectura del Dashboard Pixy (Modernizado)

Este documento detalla el funcionamiento del sistema de Dashboards Multitenant para evitar regresiones técnicas y asegurar que nuevas intervenciones mantengan el alto rendimiento logrado.

## 🏗️ Arquitectura: Server-First

El Dashboard ha sido migrado a una arquitectura de **Server Component** (`async function DashboardPage`).

### 1. El Orquestador (`src/app/(dashboard)/dashboard/page.tsx`)
- **Responsabilidad**: Es el único encargado de hacer el "fetch" inicial de datos usando `getDashboardPayload()`.
- **Ventaja**: Elimina el "blank skeleton" inicial. El navegador recibe el HTML con las métricas ya listas.
- **Regla Crítica**: **NUNCA** pases funciones (ej. `onClick`, `onReload`) desde este archivo a los componentes hijos. Next.js no puede serializar funciones entre Servidor y Cliente.

### 2. Los Dashboards Verticales (`src/modules/core/dashboard/components/*.tsx`)
- **Responsabilidad**: Son **Client Components** interactivos que reciben los datos del servidor por props.
- **Refresco de Datos**: Para actualizar métricas (después de crear un cliente, factura, etc.), utiliza `router.refresh()` de `next/navigation`. Esto re-ejecuta la lógica del servidor de forma transparente y reactiva.

## 📊 Flujo de Datos (Data Flow)

1.  **Fetch Raíz**: `getDashboardPayload()` unifica todas las consultas (RPCs, Metrics, Settings) en una sola pasada de servidor usando `Promise.all`.
2.  **Memoización**: Las funciones de configuración usan `cache()` de React. Si 10 widgets piden el branding, la DB solo responde UNA vez.
3.  **Distribución**: `ModularDashboardLayout` recibe un objeto `DashboardDataProps` estandarizado para renderizar widgets (`MagicStatCard`, `SocialGlassWidget`).

## 🛠️ Cómo agregar un nuevo Widget

1.  **Datos**: Si el widget necesita datos nuevos, agrégalos a la respuesta de `getDashboardPayload()` en `src/modules/core/dashboard/actions.ts`.
2.  **Interfaz**: Define el tipo en `src/modules/core/dashboard/modular-dashboard-layout.tsx`.
3.  **Componente**: Crea el widget en `src/modules/core/dashboard/widgets/`.
4.  **Conexión**: Inyecta el widget en el layout modular.

## ⚠️ Checklist para futuras ediciones

- [ ] ¿He verificado que NO estoy pasando funciones desde el servidor a un componente de cliente?
- [ ] ¿He usado `router.refresh()` si necesito actualizar las métricas tras una acción?
- [ ] ¿He mantenido las consultas de base de datos dentro de `actions.ts` (Servidor)?
- [ ] ¿He verificado el build con `npm run build`?

> [!IMPORTANT]
> **No toques el `onReload` opcional**: Se mantuvo como prop opcional en los dashboards para compatibilidad con vistas heredadas o manuales, pero la norma ahora es usar el refresco de router nativo.
