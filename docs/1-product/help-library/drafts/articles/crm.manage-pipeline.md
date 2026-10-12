---
schema_version: 1
id: crm.manage-pipeline
title: Gestionar el embudo de ventas y oportunidades (Pipeline)
module: crm-pipeline
status: draft
audience: tenant-user
source_revision: 047fa7ee0cadc0f49d9ce08220f633885b0801a7
verified_on: 2026-10-12
verification: source-only
routes:
  - /crm/pipeline
keywords:
  - pipeline
  - embudo
  - ventas
  - tratos
  - kanban
  - oportunidades
  - comercial
requirements:
  - Módulo core_crm activo
  - Permiso crm.leads.view para visualizar y crm.leads.edit para gestionar
evidence:
  - path: src/app/(dashboard)/crm/pipeline/page.tsx
    symbol: CRMPipelinePage
    claim: Despliega el tablero interactivo de oportunidades comerciales y etapas del embudo.
  - path: src/modules/features/crm/components/crm-dashboard.tsx
    symbol: CRMDashboard
    claim: Renderiza las etapas del embudo comercial, conteo de prospectos y filtros de emisores.
  - path: src/modules/features/crm/crm-actions.ts
    symbol: getPipelineViewDataAction
    claim: Obtiene los leads agrupados por etapas y canales del pipeline desde el servidor.
---

# Gestionar el embudo de ventas y oportunidades (Pipeline)

## Propósito
Ofrecer una vista gráfica tipo Kanban para dar seguimiento al avance de las oportunidades comerciales, desde el primer contacto hasta el cierre de la venta, permitiendo proyectar ingresos y priorizar esfuerzos comerciales.

## Requisitos y permisos
- Que la empresa cuente con el módulo principal de CRM (`core_crm`).
- Para consultar el tablero se requiere el permiso `crm.leads.view`.
- Para crear oportunidades, modificar valores o mover tarjetas de etapa se requiere el permiso `crm.leads.edit`.

## Ubicación en pantalla
- **Ruta web:** `/crm/pipeline`
- **Menú lateral:** Sección **CRM** → opción **Pipeline** (icono de tablero Kanban).

## Componentes del tablero
- **Columnas de etapas:** Cada columna representa una fase del ciclo de ventas (por ejemplo: *Nuevo Prospecto*, *En Calificación*, *Cotización Presentada*, *Negociación*, *Cerrado Ganado*, *Cerrado Perdido*).
- **Encabezado de etapa:** Muestra la cantidad de tratos activos en esa fase y la sumatoria del valor monetario acumulado.
- **Tarjetas de oportunidad (Deals):** Cada tarjeta sintetiza:
  - Título del trato o servicio cotizado.
  - Nombre del cliente o prospecto.
  - Valor económico proyectado.
  - Agente comercial asignado.
  - Días transcurridos en la etapa actual.

## Pasos para gestionar una oportunidad
1. Accede a **Pipeline** en el menú lateral.
2. **Crear una nueva oportunidad:**
   - Haz clic en el botón superior **Nuevo Trato** (o en el botón `+` de la primera columna).
   - Ingresa el título del negocio, selecciona el contacto existente, ingresa el valor económico estimado y selecciona la fecha estimada de cierre.
   - Presiona **Guardar**.
3. **Avanzar una oportunidad de etapa:**
   - Haz clic y mantén presionada la tarjeta deseada.
   - Arrástrala horizontalmente a la columna de la siguiente fase (por ejemplo, de *Contacto Inicial* a *Propuesta Enviada*) y suéltala.
   - Los totales financieros de ambas columnas se recalcularán de inmediato.
4. **Cierre de venta:**
   - Si la venta se concreta, arrastra la tarjeta a la columna **Cerrado Ganado**. Desde el deck de contexto podrás generar la factura correspondiente.
   - Si el negocio no prospera, arrástrala a **Cerrado Perdido** registrando el motivo de descarte.

## Resultado esperado
Visualización fluida del flujo de ingresos proyectados, facilitando el control comercial y la asignación equitativa de cuentas entre los agentes.

## Problemas habituales y causas comprobadas
- **No se pueden mover tarjetas entre columnas:**
  *Causa comprobada:* Tu usuario tiene asignado un rol con permiso de solo lectura (`crm.leads.view`), pero carece de `crm.leads.edit`. Contacta al administrador para elevar tus privilegios.
- **Las etapas no coinciden con el proceso de mi empresa:**
  *Causa comprobada:* Las etapas del embudo pueden configurarse de forma personalizada en `/crm/settings/pipeline` por usuarios administradores.
- **El total monetario de una columna no coincide:**
  *Causa comprobada:* Ocurre si existen tratos registrados en monedas diferentes o con el campo de valor en cero. Verifica las monedas configuradas en cada oportunidad.

## Limitaciones conocidas
- La reordenación vertical manual dentro de una misma columna no persiste un ordenamiento forzado; el listado se ordena por prioridad o fecha de modificación reciente.

## Temas relacionados
- [Administrar contactos y prospectos en el CRM](crm.manage-contacts.md)
- [Crear y emitir cotizaciones comerciales](quotes.create-quotes.md)

## Notas de verificación
- Ruta de página: `src/app/(dashboard)/crm/pipeline/page.tsx`
- Componente visual: `src/modules/features/crm/components/pipeline-kanban.tsx`
- Acciones de trato: `src/modules/features/crm/actions/deal-actions.ts`
