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
---

# Navegación y vista general del panel principal

## Propósito
El panel principal de Pixy proporciona una panorámica instantánea de la salud operativa y financiera del negocio, adaptada dinámicamente al sector o tipo de organización activa (agencia, restaurante, inmobiliaria, comercio o plataforma).

## Requisitos y permisos
- Contar con una cuenta de usuario activa y pertenecer a una organización.
- No requiere permisos administrativos especiales para visualizar el dashboard general; no obstante, el contenido específico de las métricas respeta las políticas de acceso del rol asignado.
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
- **No aparecen módulos esperados en el menú lateral:**
  *Causa comprobada:* El módulo no está contratado o habilitado para esa organización en `capabilities-registry`, o tu rol carece del permiso granular requerido (por ejemplo, `crm.leads.view` o `billing.management`).
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
