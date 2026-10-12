---
schema_version: 1
id: crm.manage-pipeline
title: Gestionar el embudo de ventas, oportunidades y reportes de conversión
module: crm-pipeline
status: draft
audience: tenant-user
source_revision: 047fa7ee0cadc0f49d9ce08220f633885b0801a7
verified_on: 2026-10-12
verification: source-only
routes:
  - /crm/pipeline
  - /crm/reports
keywords:
  - pipeline
  - embudo
  - ventas
  - tratos
  - kanban
  - oportunidades
  - comercial
  - reportes
  - rendimiento
  - conversion
  - metricas
  - crm
  - analitica
  - pdf
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
  - path: src/app/(dashboard)/crm/reports/page.tsx
    symbol: ReportsPage
    claim: Presenta métricas analíticas de rendimiento comercial, embudo de conversión y exportación de reportes en PDF.
---

# Gestionar el embudo de ventas, oportunidades y reportes de conversión

## Propósito
Ofrecer una vista gráfica tipo Kanban para dar seguimiento al avance de las oportunidades comerciales y consultar reportes analíticos de rendimiento y conversión del CRM, permitiendo proyectar ingresos, evaluar el cierre de ventas y priorizar esfuerzos del equipo comercial.

## Requisitos y permisos
- Que la empresa cuente con el módulo principal de CRM (`core_crm`).
- Para consultar el tablero se requiere el permiso `crm.leads.view`.
- Para crear oportunidades, modificar valores o mover tarjetas de etapa se requiere el permiso `crm.leads.edit`.
- El acceso a reportes analíticos avanzados en `/crm/reports` está disponible para administradores o usuarios con privilegios analíticos asignados en su rol.

## Ubicación en pantalla
- **Tablero de Pipeline:** `/crm/pipeline` (Menú lateral **CRM** → opción **Pipeline**).
- **Reportes analíticos:** `/crm/reports` (Menú lateral **CRM** → opción **Reportes**).

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
1. Accede a **Pipeline** en el menú.
2. Para mover una oportunidad al siguiente estado, haz clic sostenido sobre la tarjeta y arrástrala hacia la columna de destino (drag and drop).
3. Al soltar la tarjeta, el sistema actualiza de inmediato la base de datos y recalcula los totales económicos de ambas columnas.
4. Si la negociación concluye exitosamente, arrastra la tarjeta a la columna **Cerrado Ganado**. Si no prospera, muévela a **Cerrado Perdido** para mantener las estadísticas depuradas.

## Reportes analíticos de rendimiento y conversión del CRM
Para organizaciones que requieren métricas consolidadas sobre la eficiencia de su ciclo de ventas:
- **Ubicación:** Menú lateral **CRM** → opción **Reportes** (ruta web `/crm/reports`).
- **Métricas analíticas disponibles:**
  - *Embudo y tasa de conversión:* Porcentaje de prospectos que avanzan satisfactoriamente entre etapas hasta el cierre ganado.
  - *Ingresos y valor proyectado:* Sumatoria económica acumulada y ticket promedio por oportunidad.
  - *Rendimiento por agente:* Desglose de tratos gestionados, tiempos de respuesta y ventas cerradas por cada miembro del equipo comercial.
- **Filtros temporales:** Permite segmentar el análisis por rangos predeterminados (últimos 30 días, 7 días) o mediante un calendario de fechas personalizado.
- **Exportación en PDF:** Botón para generar y descargar un informe formal imprimible con gráficos y datos de marca de la empresa (`CrmPdfTemplate`).

## Resultado esperado
Visualización fluida de las oportunidades en curso, actualización instantánea de los montos totales por fase y disponibilidad de estadísticas analíticas de conversión para la toma de decisiones directivas.

## Problemas habituales y causas comprobadas
- **No es posible arrastrar tarjetas entre etapas:**
  *Causa comprobada:* El usuario dispone de permiso de solo lectura (`crm.leads.view`) pero carece del permiso de modificación (`crm.leads.edit`).
- **Los totales de la columna no coinciden con las tarjetas visibles:**
  *Causa comprobada:* Hay un filtro de agente o fecha activo en la cabecera que oculta visualmente ciertos tratos mientras el contador conserva el total de la fase.

## Limitaciones conocidas
- Las etapas del pipeline se configuran a nivel organizacional en los ajustes del CRM; los usuarios regulares no pueden añadir o renombrar columnas desde la vista de tablero.

## Temas relacionados
- [Administrar contactos y prospectos en el CRM](crm.manage-contacts.md)
- [Crear y gestionar presupuestos comerciales](quotes.create-quotes.md)

## Notas de verificación
- Página principal de pipeline: `src/app/(dashboard)/crm/pipeline/page.tsx`
- Componente de tablero: `src/modules/features/crm/components/crm-dashboard.tsx`
- Página de reportes analíticos: `src/app/(dashboard)/crm/reports/page.tsx`
- Lógica de servidor: `src/modules/features/crm/crm-actions.ts`
