---
schema_version: 1
id: crm.manage-contacts
title: Administrar contactos y prospectos en el CRM
module: crm-contacts
status: draft
audience: tenant-user
source_revision: 0e5706d2f235ee40698ded73cc14e161e908e292
verified_on: 2026-10-12
verification: source-only
routes:
  - /crm/contacts
keywords:
  - crm
  - contactos
  - clientes
  - prospectos
  - leads
  - exportar
  - base de datos
requirements:
  - Módulo core_clients activo
  - Permiso granular crm.leads.view para visualizar
evidence:
  - path: src/app/(dashboard)/crm/contacts/page.tsx
    symbol: CRMContactsPage
    claim: Carga la vista de gestión integral de contactos y clientes del CRM.
  - path: src/modules/core/saas/module-config.ts
    symbol: MODULE_ROUTES
    claim: Protege la ruta /crm/contacts exigiendo el permiso crm.leads.view y la vincula al módulo core_clients.
  - path: src/modules/core/iam/actions/permissions.ts
    symbol: PERMISSIONS.CRM
    claim: Segrega las acciones de ver (crm.leads.view), editar (crm.leads.edit), borrar (crm.leads.delete) y exportar (crm.data.export).
---

# Administrar contactos y prospectos en el CRM

## Propósito
Organizar y centralizar el directorio de clientes y prospectos de la organización, registrando su información de contacto, etapa comercial, etiquetas de segmentación e historial de interacciones.

## Requisitos y permisos
- Que la organización tenga habilitado el módulo de clientes (`core_clients`).
- Permisos requeridos según la acción:
  - *Visualizar directorio:* Permiso `crm.leads.view`.
  - *Crear o editar contacto:* Permiso `crm.leads.edit`.
  - *Eliminar registros:* Permiso `crm.leads.delete`.
  - *Exportar a archivo CSV:* Permiso `crm.data.export`.

## Ubicación en pantalla
- **Ruta web:** `/crm/contacts`
- **Menú lateral:** Sección **CRM** → opción **Contactos** (icono de libreta o usuario).

## Información registrada por contacto
- **Datos básicos:** Nombre y apellidos, correo electrónico, teléfono móvil con indicativo de país, y nombre de la empresa u organización.
- **Segmentación:** Etiquetas (*tags*) para clasificar clientes (por ejemplo: VIP, Mayorista, Nuevo, Referido).
- **Seguimiento comercial:** Origen del lead (web, WhatsApp, campaña de marketing), etapa actual en el embudo y agente asignado.
- **Historial vinculado:** Conversaciones previas de Inbox, cotizaciones enviadas y facturas asociadas.

## Pasos para crear un nuevo contacto
1. Navega a **Contactos** en el menú de CRM.
2. Haz clic en el botón superior derecho **Nuevo Contacto** (o **Nuevo Cliente**).
3. Se desplegará el panel lateral de creación (*Create Client Sheet*).
4. Diligencia los campos requeridos:
   - Nombre completo (obligatorio).
   - Teléfono móvil (fundamental para vincular con WhatsApp en el Inbox).
   - Correo electrónico.
   - Empresa o notas iniciales.
5. Haz clic en **Guardar Contacto**. El registro se agregará de inmediato a la lista general.

## Pasos para consultar o editar la ficha de un contacto
1. En la tabla de contactos, haz clic sobre la fila del cliente o en el botón de edición.
2. Se abrirá la ficha completa del cliente (*Client Drawer*) mostrando su resumen, notas y actividad.
3. Actualiza los campos deseados y presiona **Guardar**.

## Pasos para exportar la base de datos
1. En la parte superior de la tabla de contactos, haz clic en el botón **Exportar** (icono de descarga).
2. Si tu usuario cuenta con el permiso `crm.data.export`, el navegador descargará inmediatamente un archivo `.csv` con todos los contactos filtrados en pantalla.
3. Si el botón no aparece o la descarga es rechazada, solicita a un administrador que habilite la capacidad de exportación en tu rol.

## Resultado esperado
Mantener una base de contactos limpia, accesible y sincronizada con el resto de módulos de la plataforma (Inbox, Pipeline y Facturación).

## Problemas habituales y causas comprobadas
- **El botón de exportar datos no aparece en la interfaz:**
  *Causa comprobada:* Tu usuario no tiene asignado el permiso granular `crm.data.export`. Esta restricción existe para evitar filtraciones de bases de datos por personal no autorizado.
- **Un contacto no enlaza con la conversación de WhatsApp:**
  *Causa comprobada:* El número telefónico ingresado carece del código de país (ejemplo: `+57` para Colombia) o tiene caracteres no numéricos que impiden la coincidencia exacta con el identificador del canal de mensajería.
- **No se puede eliminar un contacto:**
  *Causa comprobada:* El usuario carece del permiso `crm.leads.delete`, o el contacto tiene facturas o documentos tributarios formalizados que impiden el borrado físico directo para preservar la integridad contable.

## Limitaciones conocidas
- La importación masiva mediante archivo de hoja de cálculo debe ajustarse estrictamente a la estructura de columnas requerida por el asistente de importación.

## Temas relacionados
- [Atender y gestionar conversaciones en Inbox](inbox.manage-conversations.md)
- [Gestión de embudo de ventas y pipeline](crm.manage-pipeline.md)

## Notas de verificación
- Página principal: `src/app/(dashboard)/crm/contacts/page.tsx`
- Acciones de cliente: `src/modules/features/crm/actions/contact-actions.ts`
- Verificación de ruta y permisos: `src/modules/core/saas/module-config.ts` (línea 87).
