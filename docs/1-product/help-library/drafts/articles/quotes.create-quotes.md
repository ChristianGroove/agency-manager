---
schema_version: 1
id: quotes.create-quotes
title: Crear, enviar y dar seguimiento a cotizaciones comerciales
module: quotes
status: draft
audience: tenant-user
source_revision: 0e5706d2f235ee40698ded73cc14e161e908e292
verified_on: 2026-10-12
verification: source-only
routes:
  - /quotes
  - /quotes/new
keywords:
  - cotizaciones
  - propuestas
  - presupuestos
  - ventas
  - comercial
  - portal
requirements:
  - Módulo module_quotes y capacidad crm.quotes activos
  - Roles autorizados (owner, admin o permiso comercial)
evidence:
  - path: src/app/(dashboard)/quotes/page.tsx
    symbol: QuotesPage
    claim: Despliega el listado de presupuestos y propuestas comerciales con estados de aceptación.
  - path: src/modules/features/quotes/quotes-actions.ts
    symbol: createQuoteAction
    claim: Crea la cotización en el sistema y revalida la ruta /quotes.
---

# Crear, enviar y dar seguimiento a cotizaciones comerciales

## Propósito
Permitir a los equipos comerciales elaborar presupuestos claros y profesionales, enviarlos a los prospectos mediante enlaces interactivos o documentos PDF y registrar su aprobación para agilizar el cierre de ventas.

## Requisitos y permisos
- Que la empresa tenga habilitado el módulo de cotizaciones (`module_quotes`) y la capacidad `crm.quotes`.
- Roles autorizados por defecto: Dueño (`owner`) y Administrador (`admin`), o usuarios con permisos de gestión comercial asignados.

## Ubicación en pantalla
- **Ruta web:** `/quotes`
- **Menú lateral:** Sección **Operaciones** → opción **Cotizaciones** (icono de documento de texto). También accesible desde el acceso rápido del dashboard o desde la barra lateral del Inbox.

## Estados de una cotización
- **Borrador (`draft`):** Propuesta en redacción interna, no accesible para el cliente.
- **Enviada (`sent`):** Cotización enviada al prospecto y pendiente de decisión.
- **Aceptada (`accepted`):** El cliente aprobó la propuesta formalmente desde el portal o el agente registró la confirmación.
- **Rechazada (`rejected`):** La propuesta no fue aprobada por el prospecto.
- **Expirada (`expired`):** La fecha de vigencia límite venció sin respuesta del cliente.

## Pasos para crear una cotización
1. Navega a **Cotizaciones** (`/quotes`).
2. Haz clic en el botón superior **Nueva Cotización**.
3. En el editor de propuestas:
   - Selecciona el **Cliente o Prospecto** del directorio del CRM.
   - Define la **Fecha de vigencia** (plazo de días durante el cual los precios se mantienen vigentes).
   - Añade los ítems desde el catálogo de servicios o ingresa descripciones manuales con sus cantidades y precios unitarios.
   - Aplica descuentos porcentuales o fijos si procede.
   - Agrega términos y condiciones comerciales en las notas finales (por ejemplo: tiempos de entrega o forma de pago).
4. Revisa el resumen financiero (subtotal, descuentos, impuestos y total).
5. Haz clic en **Guardar y Emitir**.

## Envío y aprobación por el cliente
1. Una vez emitida, abre el detalle de la cotización.
2. Puedes:
   - **Copiar enlace interactivo del portal:** El cliente podrá abrir el enlace en su móvil o computador, revisar las partidas detalladas y presionar el botón **Aceptar Propuesta**.
   - **Descargar PDF corporativo:** Genera un presupuesto imprimible con la estética, membrete y sellos del ADN de marca de tu negocio.
   - **Enviar por WhatsApp:** Comparte el enlace directo dentro de la conversación del Inbox.

## Convertir cotización en factura
- Cuando el cliente acepta la cotización, la propuesta cambia a estado **Aceptada**.
- Desde la vista de detalle de la cotización aceptada, haz clic en **Convertir a Factura**: los conceptos, cantidades y montos se transferirán automáticamente al borrador del Centro de Facturación sin necesidad de reescribir la información.

## Resultado esperado
Presentación comercial ágil y profesional que reduce tiempos de negociación y facilita la transición inmediata hacia la cobranza y la ejecución del servicio.

## Problemas habituales y causas comprobadas
- **El cliente dice que el enlace indica que la cotización ha caducado:**
  *Causa comprobada:* La fecha de vigencia configurada expiró (`status === 'expired'`). Debes editar la cotización, ampliar la fecha de validez y volver a guardarla para reactivar el enlace de aceptación.
- **La cotización no se convirtió automáticamente en factura tras la aceptación:**
  *Causa comprobada:* Por diseño contable, la aprobación del cliente no genera de inmediato una factura fiscal sin confirmación del operador; el agente debe presionar el botón de conversión para validar los datos fiscales finales.

## Limitaciones conocidas
- Las cotizaciones aceptadas quedan archivadas como registro histórico y no deben modificarse en sus montos base; para cambios posteriores se debe emitir una cotización complementaria.

## Temas relacionados
- [Crear, emitir y gestionar facturas de cobro](billing.manage-invoices.md)
- [Gestión de embudo de ventas y pipeline](crm.manage-pipeline.md)

## Notas de verificación
- Página: `src/app/(dashboard)/quotes/page.tsx`
- Acciones de servidor: `src/modules/features/quotes/actions/quote-actions.ts`
- Validación de capabilities: `src/modules/core/organizations/capabilities-registry.ts`
