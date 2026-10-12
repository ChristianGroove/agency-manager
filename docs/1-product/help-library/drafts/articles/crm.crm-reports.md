---
schema_version: 1
id: crm.crm-reports
title: Consultar reportes analíticos y rendimiento del CRM
module: crm-reports
status: draft
audience: tenant-admin
source_revision: 047fa7ee0cadc0f49d9ce08220f633885b0801a7
verified_on: 2026-10-12
verification: source-only
routes:
  - /crm/reports
keywords:
  - reportes
  - rendimiento
  - conversion
  - metricas
  - crm
  - analitica
  - pdf
  - ventas
  - informes
  - embudo
  - leads
requirements:
  - Módulo module_crm_reports activo en la organización
  - Acceso con rol de Dueño (owner) para visibilidad en el menú lateral
evidence:
  - path: src/app/(dashboard)/crm/reports/page.tsx
    symbol: ReportsPage
    claim: Presenta métricas analíticas de rendimiento comercial, embudo de conversión y exportación de reportes en PDF.
  - path: src/modules/features/crm/services/logic/analytics-actions.ts
    symbol: getAdvancedReports
    claim: Consulta agregados y estadísticas de rendimiento comercial mediante RPC get_advanced_crm_reports por organization_id.
  - path: src/modules/core/saas/module-config.ts
    symbol: MODULE_ROUTES
    claim: Configura la ruta /crm/reports bajo parentModule module_crm_reports y allowedRoles ['owner'].
---

# Consultar reportes analíticos y rendimiento del CRM

## Propósito
Ofrecer a la dirección comercial y propietarios una visión consolidada del rendimiento del CRM, tasas de conversión de prospectos, velocidad de respuesta del equipo, tratos cerrados y exportación ejecutiva de informes en formato PDF con el membrete de la empresa.

## Requisitos, visibilidad de menú y permisos
- **Disponibilidad de módulo:** Requiere que la organización tenga habilitado el módulo `module_crm_reports` en su suscripción SaaS.
- **Visibilidad en el menú lateral:** En el registro de navegación (`src/modules/core/saas/module-config.ts`), la opción **Reportes** dentro de **CRM** (`/crm/reports`) exige `allowedRoles: ['owner']` y pertenencia a `module_crm_reports`. Los usuarios con roles regulares (colaboradores o miembros) no ven este acceso directo en la barra lateral.
- **Autorización y ejecución efectiva:** En el backend actual (`src/modules/features/crm/services/logic/analytics-actions.ts`), la acción de servidor `getAdvancedReports` valida el identificador de la organización (`organization_id`) en la sesión y ejecuta la función Supabase `get_advanced_crm_reports`. No existe un guard de rol estricto a nivel de base de datos o middleware de ruta, existiendo una diferencia entre la visibilidad del menú y la ejecución de servidor (registrada en limitaciones y `gaps.md`).

## Ubicación en pantalla
- **Reportes analíticos:** `/crm/reports` (Menú lateral **CRM** → opción **Reportes**).

## Componentes y métricas analíticas
- **Tarjetas KPI superiores:**
  - *Leads Nuevos:* Total de prospectos captados en el intervalo seleccionado.
  - *Leads Activos:* Prospectos con conversaciones e intercambios recientes.
  - *Conversión:* Porcentaje de oportunidades cerradas con éxito respecto a las evaluadas.
  - *Valor Pipeline:* Sumatoria monetaria retenida en oportunidades comerciales en curso.
  - *Tiempo Respuesta:* Promedio de tiempo de primera atención por parte de los agentes (indicador SLA < 5m).
  - *Abandono >24h:* Alerta de prospectos críticos sin respuesta durante más de 24 horas.
- **Gráficas de tendencia y origen:**
  - *Tendencia de Actividad:* Gráfico de área comparativo de leads entrantes y mensajes enviados.
  - *Fuentes de Leads:* Gráfico circular de distribución de canales de captación.
- **Tabla de Rendimiento del Equipo de Agentes:**
  - Relación individual de asesores con leads asignados, tratos ganados (*Deals Won*), porcentaje de conversión, tiempo promedio de respuesta, tiempo de conexión activa y cumplimiento de acuerdos de nivel de servicio (SLA).
  - Botón para descargar el reporte individualizado de cada agente en PDF.
- **Leads en Abandono:**
  - Lista de prospectos desatendidos con tiempo transcurrido en espera y acceso rápido para su atención inmediata.

## Filtros temporales y exportación en PDF
1. **Filtros por periodos predefinidos:** Selección rápida de rangos (Hoy, Últimos 7 días, Últimos 15 días, Últimos 30 días, Últimos 60 días o Últimos 90 días).
2. **Selector de rango personalizado:** Menú desplegable con calendario (`Calendar`) para acotar fechas específicas de inicio y término.
3. **Actualización de datos:** Botón de recarga en tiempo real para refrescar métricas con la base de datos.
4. **Exportación ejecutiva en PDF:**
   - Botón **Exportar PDF** en la cabecera: Renderiza el reporte global con gráficos, membrete institucional (`CrmPdfTemplate`) y branding empresarial (`getEffectiveBranding`) vía `html-to-image` y `jsPDF`.
   - Exportación de agente: Icono de archivo en la tabla de rendimiento para generar el documento analítico individual.

## Resultado esperado
Diagnóstico cuantitativo inmediato sobre el desempeño comercial del equipo, identificación de cuellos de botella en la atención de clientes y generación ágil de informes gerenciales descargables.

## Problemas habituales y causas comprobadas
- **La opción Reportes no aparece en la barra lateral:**
  *Causa comprobada:* El usuario ha iniciado sesión con un rol diferente a Dueño (`owner`) o la organización no tiene contratado el módulo `module_crm_reports`.
- **Las métricas o gráficos aparecen vacíos:**
  *Causa comprobada:* No se registraron actividades, mensajes o leads dentro del rango de fechas establecido.
- **Fallo o demora al exportar el archivo PDF:**
  *Causa comprobada:* Las gráficas animadas aún se están renderizando en el DOM o el recurso del logotipo en base64 demoró en responder.

## Limitaciones conocidas
- La restricción de acceso en la barra lateral se gestiona mediante configuración de menú (`module-config.ts`), pero las acciones de servidor de analítica no rechazan peticiones si se accede directamente teniendo una sesión válida de la organización.
- La generación de PDF se ejecuta en el navegador mediante captura de nodo DOM (`html-to-image`), dependiendo del rendimiento del cliente local y la finalización de renders de Recharts.

## Temas relacionados
- [Gestionar el embudo de ventas y oportunidades (Pipeline)](crm.manage-pipeline.md)
- [Administrar contactos y prospectos en el CRM](crm.manage-contacts.md)
- [Configuración de marca y ADN del negocio](branding.manage-adn.md)

## Notas de verificación
- Página de reportes analíticos: `src/app/(dashboard)/crm/reports/page.tsx`
- Lógica y acciones de servidor: `src/modules/features/crm/services/logic/analytics-actions.ts`
- Configuración de rutas y permisos de menú: `src/modules/core/saas/module-config.ts`
