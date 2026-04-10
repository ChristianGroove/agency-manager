# Documentación Técnica: Sistema de Reportes Avanzados CRM

Este documento detalla la arquitectura, lógica y configuración del sistema de reportes de rendimiento CRM implementado para **Pixy Spaces / Command Center**.

## 1. Núcleo de Datos (SQL RPC)
Toda la agregación de métricas ocurre en el servidor de base de datos para garantizar la precisión y velocidad.

- **RPC Principal**: `get_advanced_crm_reports(p_org_id, p_start_date, p_end_date)`
- **Ubicación del Código**: `supabase/migrations/20260410000002_optimize_rpcs.sql` (Optimización Phase 4.1.2)
- **Lógica de Agregación Unificada (Splicing)**:
    - **Leads & Wins**: Los conteos de "Deals Won" y leads asignados se extraen de la tabla `leads` (fuente de verdad del Pipeline).
    - **Eficiencia & SLA**: El tiempo promedio de respuesta y el cumplimiento de SLA se extraen de la tabla `conversations`.
    - **Unificación**: El sistema unifica ambas fuentes por `agent_id` garantizando que el reporte refleje tanto la efectividad en ventas como la eficiencia en atención.
- **Lógica de SLA**: El umbral de "Respuesta Rápida" está fijado en **300 segundos (5 minutos)**.
- **Abandono Crítico**: Leads en estado "pendientes" por más de **24 horas** sin respuesta inicial.

## 2. Generador de PDF (@/modules/features/crm/services/crm-report-generator.ts)

Utiliza `jsPDF` y `AutoTable` para crear documentos profesionales de múltiples páginas.

### Paginación Inteligente
- **Encabezados Dinámicos**: El título del reporte y el periodo se repiten en cada página.
- **Control de Huérfanos (`ensureSpace`)**: Esta función comprueba si queda suficiente espacio vertical antes de dibujar un título de sección. Si el espacio < el requerido, salta de página automáticamente.
- **Pies de Página**: Incluyen el nombre de la organización, la marca y el número de página.

### Estilo Visual
- **Métrica KPI**: Una barra de resumen inicial con iconos (conceptualmente representados por espaciado y estilo).
- **Subrayados Dinámicos**: Los títulos de sección tienen una barra de color primario que se ajusta automáticamente al ancho del texto (`doc.getTextWidth`).
- **Tablas**: Usan el color secundario/gris (`[241, 245, 249]`) para encabezados de ranking y el color primario para la tabla general.

## 3. Modularidad SaaS y Control de Acceso (Saas Engine)

El sistema de reportes está diseñado como un módulo premium opcional dentro del ecosistema SaaS.

- **Módulo Key**: `module_crm_reports`
- **Activación**: Se habilita o deshabilita desde el **SuperAdmin Centro de Mando / SaaS Engine Manager**. Su estado se almacena en la tabla `saas_app_modules` y se refleja en `manual_module_overrides`.
- **Restricción de Rol**: Por diseño de seguridad, este módulo es de acceso exclusivo para el rol **`owner`** (Dueño). Los administradores y agentes no tienen visibilidad de esta sección en el menú de navegación.
- **Enforcement**: La lógica de visibilidad reside en `@/modules/core/saas/module-config.ts`.

## 4. Sistema de Identidad e Imágenes (Deshabilitable)

Aunque el usuario solicitó una versión "Limpia", el código base soporta branding avanzado:

- **Bypass de CORS**: Se utiliza una *Server Action* (`getBase64Image` en `analytics-actions.ts`) que usa el **Admin SDK** de Supabase para descargar logos directamente del storage. Esto garantiza que el logo siempre se encuentre, sin importar la configuración de privacidad del bucket.
- **Rasterizador SVG**: El generador incluye un proceso que convierte SVGs a PNGs de alta densidad antes de la generación para evitar errores de firma de imagen en el PDF.
- **Activación**: Para volver a habilitar el logo, se debe pasar el parámetro `logoPlaceholder` a la función `generateCRMReportPDF`.

## 5. Configuración del Frontend

- **Archivo**: `src/app/(dashboard)/crm/reports/page.tsx`
- **Filtro Predeterminado**: El sistema carga siempre en **"Hoy"** (`startOfDay` - `endOfDay`).
- **Gestión de Fecha**: Utiliza `date-fns` para manejar los periodos y periodos relativos (Hoy, Ayer, 7d, 30d).

---
*Para futuras intervenciones: La lógica se ha diseñado para ser escalable. Si se agregan nuevas métricas, primero deben incluirse en el JSON de salida del RPC y luego mapearse en las tablas del generador de PDF.*
