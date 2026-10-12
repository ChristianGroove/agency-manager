---
schema_version: 1
id: resto.manage-orders
title: Gestionar pedidos, comandas y pantalla de cocina (KDS)
module: resto
status: draft
audience: tenant-user
source_revision: 0e5706d2f235ee40698ded73cc14e161e908e292
verified_on: 2026-10-12
verification: source-only
routes:
  - /resto-orders
keywords:
  - pedidos
  - comandas
  - cocina
  - kds
  - restaurante
  - mesas
  - despacho
requirements:
  - Módulo module_resto_orders activo
  - Permiso operations.resto_orders.view para consultar y operations.resto_orders.manage para despachar
evidence:
  - path: src/app/(dashboard)/resto-orders/page.tsx
    symbol: RestoOrdersPage
    claim: Carga la vista operativa de pedidos y pantalla de cocina en tiempo real.
  - path: src/modules/core/saas/module-config.ts
    symbol: MODULE_ROUTES
    claim: Asocia /resto-orders a la categoría Operaciones bajo module_resto_orders exigiendo operations.resto_orders.view.
  - path: src/modules/core/iam/actions/permissions.ts
    symbol: PERMISSIONS.OPERATIONS.RESTO_ORDERS_VIEW
    claim: Segrega la visualización (view) y la gestión operativa de pedidos, cambios de estado y cancelaciones (manage).
---

# Gestionar pedidos, comandas y pantalla de cocina (KDS)

## Propósito
Permitir al personal de sala, cocina y caja monitorear los pedidos en tiempo real, coordinar los tiempos de cocción y preparación mediante una pantalla de cocina (KDS), y controlar el estado de servicio de cada mesa o despacho.

## Requisitos y permisos
- Que la empresa tenga activado el módulo de pedidos de restaurante (`module_resto_orders`).
- Permisos requeridos:
  - *Ver comandas y pedidos:* Permiso `operations.resto_orders.view`.
  - *Cambiar estados, despachar o cancelar pedidos:* Permiso `operations.resto_orders.manage`.
- Disponible para administradores y para roles operativos (meseros, cocineros, jefes de sala y cajeros).

## Ubicación en pantalla
- **Ruta web:** `/resto-orders`
- **Menú lateral:** Sección **Operaciones** → opción **Gestor de Pedidos** (icono de lista de control).

## Estados de un pedido
Cada orden transita por un ciclo operativo estructurado:
1. **Pendiente (`pending`):** Comanda recién creada por un mesero o enviada por un comensal desde el portal web. Emite alerta en pantalla.
2. **En Cocina (`in_kitchen`):** Pedido aceptado por el equipo de cocina y en proceso activo de preparación.
3. **Listo (`ready`):** Platos preparados y emplatados, esperando ser llevados a la mesa o empacados para despacho.
4. **Entregado (`delivered`):** Comida servida en mesa o entregada al repartidor/cliente.
5. **Completado (`completed`):** Cuenta liquidada y cerrada en caja.
6. **Cancelado (`canceled`):** Orden anulada por solicitud del cliente o falta de insumos.

## Información de la tarjeta de comanda
Cada tarjeta en la pantalla de pedidos muestra:
- Número de orden y tiempo transcurrido desde la creación (con alerta visual si excede los minutos esperados).
- Modalidad: **Mesa** (con número de mesa escaneada por QR), **Para Llevar**, o **Domicilio**.
- Lista de platos con sus cantidades y especificaciones de modificadores (por ejemplo: *"Término medio, sin cebolla, adición de queso"*).
- Nombre del comensal o mesero que tomó la orden.

## Pasos para gestionar comandas en cocina
1. Accede a **Gestor de Pedidos** (`/resto-orders`) en la pantalla táctil de cocina o terminal de sala.
2. Al llegar un pedido nuevo (columna *Pendientes*), revísalo y haz clic en **Pasar a Cocina**.
3. Cuando los platos estén listos para salir del pase de cocina, haz clic en **Marcar Listo**. El personal de sala recibirá una indicación visual para recoger los platos.
4. Una vez servido en la mesa correspondiente, haz clic en **Entregar**.
5. Desde el módulo de caja o facturación se podrá procesar el cobro final y cerrar la orden como **Completada**.

## Resultado esperado
Sincronización instantánea entre comensales, meseros y cocineros, eliminando comandas extraviadas en papel y reduciendo los tiempos de espera en mesa.

## Problemas habituales y causas comprobadas
- **Una orden entrante no aparece en la pantalla de cocina:**
  *Causa comprobada:* Ocurre si la conexión a internet en la terminal se interrumpió y Supabase Realtime no pudo entregar el evento. Basta con pulsar el botón de refrescar para sincronizar las comandas activas del servidor.
- **No se puede cambiar el estado de una orden:**
  *Causa comprobada:* El usuario autenticado en la terminal carece del permiso `operations.resto_orders.manage`. Verifica que el rol asignado al colaborador tenga permisos operativos de gestión.

## Limitaciones conocidas
- Si se cancela una orden que ya había sido despachada, el registro contable conservará la trazabilidad del incidente para control de inventarios de alimentos.

## Temas relacionados
- [Administrar el menú digital, categorías y horarios](resto.manage-menu.md)
- [Crear, emitir y gestionar facturas de cobro](billing.manage-invoices.md)

## Notas de verificación
- Ruta: `src/app/(dashboard)/resto-orders/page.tsx`
- Acciones operativas: `src/modules/features/resto-orders/actions.ts`
- Definición de permisos: `src/modules/core/iam/actions/permissions.ts` (grupo `RESTO_ORDERS`).
