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
  - crm
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
Ofrecer una vista gráfica tipo Kanban para dar seguimiento al avance de las oportunidades comerciales a lo largo de las distintas etapas del ciclo de ventas, permitiendo proyectar ingresos, evaluar el cierre de negocios y priorizar esfuerzos del equipo comercial.

## Requisitos y permisos
- Que la empresa cuente con el módulo principal de CRM (`core_crm`).
- Para consultar el tablero se requiere el permiso `crm.leads.view`.
- Para crear oportunidades, modificar valores o mover tarjetas de etapa se requiere el permiso `crm.leads.edit`.

## Ubicación en pantalla
- **Tablero de Pipeline:** `/crm/pipeline` (Menú lateral **CRM** → opción **Pipeline**).

## Componentes del tablero Kanban
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
2. Para mover una oportunidad al siguiente estado, haz clic sostenido sobre la tarjeta y arrástrala hacia la columna de destino (drag and drop).
3. Al soltar la tarjeta, el sistema actualiza de inmediato la base de datos y recalcula los totales económicos de ambas columnas.
4. Si la negociación concluye exitosamente, arrastra la tarjeta a la columna **Cerrado Ganado**. Si no prospera, muévela a **Cerrado Perdido** para mantener las estadísticas depuradas.

## Resultado esperado
Visualización fluida de las oportunidades en curso, actualización instantánea de los montos totales por fase y claridad sobre el estado de cada prospecto en el embudo comercial.

## Problemas habituales y causas comprobadas
- **No es posible arrastrar tarjetas entre etapas:**
  *Causa comprobada:* El usuario dispone de permiso de solo lectura (`crm.leads.view`) pero carece del permiso de modificación (`crm.leads.edit`).
- **Los totales de la columna no coinciden con las tarjetas visibles:**
  *Causa comprobada:* Hay un filtro de agente o fecha activo en la cabecera que oculta visualmente ciertos tratos mientras el contador conserva el total de la fase.

## Limitaciones conocidas
- Las etapas del pipeline se configuran a nivel organizacional en los ajustes del CRM; los usuarios regulares no pueden añadir o renombrar columnas desde la vista de tablero.

## Temas relacionados
- [Consultar reportes analíticos y rendimiento del CRM](crm.crm-reports.md)
- [Administrar contactos y prospectos en el CRM](crm.manage-contacts.md)
- [Crear y gestionar presupuestos comerciales](quotes.create-quotes.md)

## Notas de verificación
- Página principal de pipeline: `src/app/(dashboard)/crm/pipeline/page.tsx`
- Componente de tablero: `src/modules/features/crm/components/crm-dashboard.tsx`
- Lógica de servidor: `src/modules/features/crm/crm-actions.ts`
