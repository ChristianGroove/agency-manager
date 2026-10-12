---
schema_version: 1
id: dashboard.overview
title: Navegación y vista general del panel principal
module: dashboard
status: draft
audience: tenant-user
source_revision: 0e5706d2f235ee40698ded73cc14e161e908e292
verified_on: 2026-10-12
verification: source-only
routes:
  - /dashboard
keywords:
  - dashboard
  - métricas
  - resumen
  - inicio
  - navegación
requirements:
  - Sesión activa en una organización válida
evidence:
  - path: src/app/(dashboard)/dashboard/page.tsx
    symbol: DashboardPage
    claim: Carga la vista adaptada según el tipo de organización (agency, resto, real_estate, retail, saas, cleaning, reseller) desde el servidor.
  - path: src/modules/core/dashboard/components/agency-dashboard.tsx
    symbol: AgencyDashboard
    claim: Presenta indicadores financieros (ingresos, pendientes, morosos), accesos rápidos (nuevo cliente, cotización, factura) y estado de clientes.
  - path: src/components/layout/sidebar.tsx
    symbol: SidebarContent
    claim: Menú lateral con navegación por categorías (Principal, CRM, Operaciones, Herramientas, Finanzas, Plataforma) filtrado por roles y módulos activos.
  - path: src/modules/core/organizations/capabilities-registry.ts
    symbol: UICapability
    claim: Define las capacidades atómicas de organización (como billing.management o crm.core) diferenciadas de los permisos IAM individuales.
---

# Navegación y vista general del panel principal

## Propósito
El panel principal de Pixy proporciona una panorámica instantánea de la salud operativa y financiera del negocio, adaptada dinámicamente al sector o tipo de organización activa (agencia, restaurante, inmobiliaria, comercio o plataforma).

## Requisitos y permisos
- Contar con una cuenta de usuario activa y pertenecer a una organización.
- No requiere permisos administrativos especiales para acceder a la ruta general `/dashboard`.
- La visibilidad de módulos, métricas y accesos responde a tres niveles diferenciados:
  1. **Módulos contratados:** Módulos de alto nivel activados para el tenant (como `module_crm` o `module_billing`).
  2. **Capacidades de organización:** Banderas atómicas en `capabilities-registry.ts` (como `billing.management` o `crm.core`) que habilitan áreas funcionales según la industria del tenant.
  3. **Permisos IAM del usuario:** Permisos granulares asignados al rol en `permissions.ts` (como `crm.leads.view`).
- *Nota de verificación:* La visualización de la página no certifica automáticamente que cada tarjeta o widget individual filtre métricas por permisos específicos de usuario sin revisar la consulta y acción de servidor de cada componente.
- Si la organización tiene su suscripción en estado `canceled` o `unpaid` y el usuario no es superadministrador, el panel se bloquea mostrando una pantalla de suspensión.

## Ubicación en pantalla
- **Ruta web:** `/dashboard`
- **Acceso:** Primer elemento del menú lateral (categoría Principal) con icono de cuadrícula/dashboard y etiqueta **Dashboard**.

## Pasos para explorar el panel
1. Inicia sesión en Pixy con tus credenciales.
2. Si tienes acceso a múltiples empresas, verifica en la esquina inferior izquierda del menú flotante o selector de organización que te encuentres en la organización deseada.
3. Haz clic en **Dashboard** en el menú lateral si te encuentras en otra sección.
4. En el área principal observarás:
   - **Tarjetas de métricas superiores:** Ingresos consolidados, pagos pendientes, cartera morosa y número de clientes activos.
   - **Acciones rápidas:** Botones directos para crear nuevo cliente, emitir cotización o generar factura (disponibles según la vertical y permisos).
   - **Listado de actividad o deudores:** Resumen de cuentas por cobrar o movimientos recientes.

## Resultado esperado
Visualizar los datos consolidados actualizados de la organización activa sin errores de carga, con acceso rápido a las operaciones más frecuentes.

## Problemas habituales y causas comprobadas
- **Aparece pantalla de organización suspendida:**
  *Causa comprobada:* La suscripción del tenant se encuentra vencida o impaga (`subscription.status === 'canceled' || subscription.status === 'unpaid'`). El acceso solo puede restablecerse actualizando el método de pago o mediante intervención de un superadministrador.
- **No aparecen módulos u opciones esperadas en el menú lateral o en el panel:**
  *Causa comprobada:* Debe verificarse la restricción en su nivel correspondiente: el módulo principal no está contratado para el tenant, la organización carece de la capacidad correspondiente en `capabilities-registry.ts` (como la capacidad `billing.management` para herramientas financieras o `crm.quotes` para cotizaciones), o el rol del usuario carece del permiso granular IAM requerido (como `crm.leads.view`).
- **El menú lateral se ve muy estrecho con solo iconos:**
  *Causa comprobada:* El sidebar está en modo colapsado. Puedes pulsar el botón circular rosa con flecha situado en el borde derecho del sidebar superior para expandirlo.

## Limitaciones conocidas
- La disposición de widgets está predeterminada por la vertical de la organización; actualmente no existe personalización de widgets por usuario individual en base de datos.
- El tiempo de respuesta de los contadores numéricos animados depende de la velocidad de consulta a Supabase.

## Temas relacionados
- [Cambiar entre tema claro y oscuro](theme.toggle-theme.md)
- [Consultar al asistente de ayuda e historial](help.chat-and-history.md)

## Notas de verificación
- Archivo de enrutamiento: `src/app/(dashboard)/dashboard/page.tsx`
- Layout principal y verificación de suspensión: `src/app/(dashboard)/layout.tsx` (líneas 54-56).
- Comprobación de sidebar: `src/components/layout/sidebar.tsx` líneas 200-218.
