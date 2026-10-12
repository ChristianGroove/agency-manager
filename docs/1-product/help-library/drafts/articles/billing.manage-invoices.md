---
schema_version: 1
id: billing.manage-invoices
title: Crear, emitir y gestionar facturas de cobro
module: billing-invoices
status: draft
audience: tenant-user
source_revision: 0e5706d2f235ee40698ded73cc14e161e908e292
verified_on: 2026-10-12
verification: source-only
routes:
  - /invoices
  - /invoices/new
keywords:
  - facturación
  - facturas
  - cobros
  - pagos
  - comprobantes
  - pdf
  - impuestos
requirements:
  - Módulo module_invoicing y capacidad billing.management activos
  - Permiso invoicing.view para consultar e invoicing.manage para emitir
evidence:
  - path: src/app/(dashboard)/invoices/page.tsx
    symbol: InvoicesPage
    claim: Despliega la tabla de comprobantes con estados de pago, filtros y acceso a nueva factura.
  - path: src/modules/core/saas/module-config.ts
    symbol: MODULE_ROUTES
    claim: Mapea /invoices a la categoría Finanzas requiriendo la capacidad billing.management y roles owner o admin.
  - path: src/modules/features/billing/billing-actions.ts
    symbol: createInvoice
    claim: Valida montos, genera consecutivos por organización y asocia los ítems tributarios en la base de datos.
---

# Crear, emitir y gestionar facturas de cobro

## Propósito
Permitir a los equipos administrativos y comerciales generar comprobantes de cobro y facturas para sus clientes, controlar los saldos pendientes o morosos, emitir enlaces públicos de pago y registrar cancelaciones de saldo.

## Requisitos y permisos
- Que la organización tenga habilitado el módulo de facturación (`module_invoicing`) y la capacidad de gestión financiera (`billing.management`).
- Permisos requeridos:
  - *Consultar facturas:* Permiso `invoicing.view`.
  - *Emitir facturas o registrar pagos:* Permiso `invoicing.manage`.
  - *Exportar resúmenes contables:* Permiso `invoicing.export`.

## Ubicación en pantalla
- **Ruta web:** `/invoices`
- **Menú lateral:** Sección **Finanzas** → opción **Centro de Facturación** (icono de documento contable).

## Estados de una factura
- **Borrador (`draft`):** Comprobante en preparación, no visible públicamente para el cliente.
- **Pendiente (`pending`):** Factura emitida y vigente, esperando pago antes de la fecha límite.
- **Pagada (`paid`):** Comprobante liquidado en su totalidad mediante pasarela o registro manual.
- **Vencida (`overdue`):** Factura cuya fecha de vencimiento expiró sin haberse registrado el pago total.
- **Anulada (`canceled`):** Factura cancelada por error de emisión o rectificación contable.

## Pasos para emitir una nueva factura
1. Navega a **Centro de Facturación** (`/invoices`).
2. Haz clic en el botón superior **Nueva Factura**.
3. En el formulario de emisión:
   - Selecciona el **Cliente** destinatario del catálogo de contactos.
   - Especifica la **Fecha de emisión** y la **Fecha de vencimiento**.
   - En la tabla de conceptos, haz clic en **Agregar Ítem** e ingresa la descripción del servicio o producto, la cantidad y el precio unitario.
   - Selecciona si aplica retención o impuesto sobre las ventas (IVA).
   - Opcionalmente añade notas al cliente o condiciones de pago (por ejemplo: transferencias a cuenta bancaria).
4. Revisa los totales calculados automáticamente (subtotal, impuestos y total general).
5. Haz clic en **Emitir Factura** (o en **Guardar como Borrador** si deseas revisarla más tarde).

## Compartir la factura con el cliente
Una vez emitida la factura:
1. Haz clic sobre la factura en el listado para abrir su vista de detalle.
2. Puedes:
   - **Copiar enlace público de pago:** Envía al cliente la URL directa (`/invoice/[id]`) para que consulte su cuenta de cobro y pague en línea (mediante Wompi o transferencia).
   - **Descargar PDF:** Genera un documento con diseño profesional que incluye el logotipo, membrete y datos fiscales configurados en el ADN de marca.
   - **Enviar por WhatsApp / Correo:** Notifica al cliente de forma instantánea si el módulo de mensajería está conectado.

## Pasos para registrar un pago manual
1. Localiza la factura con estado *Pendiente* o *Vencida*.
2. Haz clic en **Registrar Pago**.
3. Ingresa la fecha del abono, el monto pagado, el método de pago utilizado (efectivo, transferencia, datáfono) y la referencia bancaria.
4. Confirma el registro. Si el monto cubre la totalidad, la factura pasará automáticamente a estado **Pagada**.

## Resultado esperado
Actualización de los indicadores financieros del dashboard principal, reducción de la cartera vencida y registro auditable de los ingresos de la empresa.

## Problemas habituales y causas comprobadas
- **El cliente reporta que el enlace de pago muestra error:**
  *Causa comprobada:* La factura fue guardada en estado *Borrador* y no ha sido formalmente emitida, o fue anulada. Debes emitirla para que el portal público la reconozca.
- **El PDF de la factura aparece con colores o logos genéricos:**
  *Causa comprobada:* La organización no ha personalizado su ADN de marca en `/platform/adn` o no completó la sección de Documentos. Los valores predeterminados de Pixy se utilizan como respaldo de seguridad.
- **No se puede anular una factura pagada:**
  *Causa comprobada:* Para anular un comprobante que ya tiene pagos registrados, primero se deben revertir o eliminar los pagos asociados desde la pestaña de movimientos.

## Limitaciones conocidas
- Una vez emitida una factura formal con consecutivo numérico asignado, los ítems y montos quedan bloqueados contra edición arbitraria para cumplir con estándares de auditoría; si hubo un error material debe anularse y emitirse una nueva.

## Temas relacionados
- [Personalizar el ADN de marca y documentos](branding.manage-adn.md)
- [Navegación y vista general del panel principal](dashboard.overview.md)

## Notas de verificación
- Rutas del módulo: `src/app/(dashboard)/invoices/page.tsx`
- Acciones de facturación: `src/modules/features/billing/billing-actions.ts`
- Modelo de estados: `src/domain/state.ts`
