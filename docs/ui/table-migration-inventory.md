# Cobertura del estándar de tablas

El estilo compartido vive en DataTable y DataTablePaginationFrame: mismo glass-card que el portal de Tasks.

## Listados con paginación local

- src/modules/infrastructure/data-vault/components/vault-settings-tab.tsx
- src/app/(dashboard)/hosting/page.tsx
- src/modules/custom/manifests/components/manifests-dashboard.tsx
- src/modules/core/settings/team-settings-tab.tsx
- src/modules/billing/platform/revenue/components/reseller-dashboard.tsx
- src/modules/features/work-orders/components/universal/work-orders-list.tsx
- src/modules/core/settings/ai-usage-analytics.tsx
- src/app/(dashboard)/crm/reports/page.tsx
- src/modules/features/quotes/components/quotes-view.tsx
- src/modules/features/work-orders/components/payroll/payroll-staff-grid.tsx
- src/app/(dashboard)/payments/page.tsx
- src/app/(dashboard)/platform/admin/_components/settlements-manager.tsx
- src/app/(dashboard)/platform/admin/_components/platform-subscription-manager.tsx
- src/app/(dashboard)/platform/admin/_components/platform-invoices-manager.tsx
- src/app/(dashboard)/platform/admin/_components/ai-governance-manager.tsx
- src/app/(dashboard)/platform/hosting-accounts/page.tsx
- src/modules/core/admin/components/tenant-billing-settings.tsx
- src/modules/features/billing/components/fiscal-status-view.tsx
- src/modules/features/billing/components/invoices-view.tsx
- src/modules/features/portal/insights/ads-dashboard.tsx
- src/modules/features/billing/components/service-detail-modal.tsx
- src/modules/features/billing/components/payments-view.tsx
- src/modules/features/attendance/components/admin/staff-management.tsx
- src/modules/features/attendance/components/admin/payroll-dashboard.tsx
- src/modules/features/tasks/components/portal/task-pm-operations-dashboard.tsx
- src/modules/core/organizations/components/dashboard/SpaceStatusBadge.tsx
- src/modules/features/tasks/components/modals/task-import-modal.tsx
- src/modules/features/portal/components/portal-invoice-list.tsx
- src/modules/features/crm/components/client-invoices-list.tsx
- src/modules/features/catalog/components/catalog-items-tab.tsx
- src/modules/features/tasks/components/collaborators/task-collaborators-manager.tsx
- src/modules/features/automation/components/automations-view.tsx
- src/modules/features/resto-orders/components/resto-orders-table.tsx
- src/modules/features/rentals/components/collections-tab.tsx
- src/modules/features/rentals/components/leases-tab.tsx
- src/modules/features/rentals/components/settlements-tab.tsx

Cotizaciones, Contratos y Hosting de plataforma usan `useClientTablePagination` + `DataTablePagination` explícitos; los demás listados de esta sección emplean el adaptador local. Los contenedores padres de tabla y paginador no deben recortar el contenido.

## Paginación controlada o por cursor

- src/modules/features/crm/components/clients-view.tsx (controla la tabla de Clientes)
- src/modules/admin/components/modules-table.tsx
- src/modules/infrastructure/audit/audit-logs-table.tsx
- src/modules/features/work-orders/components/staff/staff-list.tsx
- src/modules/features/work-orders/components/services/service-list.tsx
- src/app/(dashboard)/platform/organizations/organizations-client-view.tsx
- src/modules/features/knowledge/components/knowledge-list.tsx
- src/app/(dashboard)/platform/admin/_components/tenants-manager.tsx
- src/modules/core/admin/components/organizations-table.tsx
- src/modules/features/forms/form-list.tsx
- src/modules/features/tasks/components/portal/task-collaborator-portal.tsx
- src/modules/features/tasks/components/pacing/task-weekly-pacing-matrix.tsx
- src/modules/features/broadcasts/components/campaigns-list.tsx
- src/modules/features/broadcasts/components/campaign-import.tsx
- src/modules/features/broadcasts/components/campaign-history.tsx
- src/modules/features/tasks/components/list/task-list-view.tsx
- src/modules/features/notifications/components/email-logs-table.tsx
- src/modules/features/automation/components/analytics/recent-executions-table.tsx

## Editores y detalles con estilo compartido

- src/modules/features/billing/components/create-invoice-sheet.tsx
- src/modules/features/portal/components/modals/quote-detail-modal.tsx
- src/modules/features/catalog/components/variant-matrix-manager.tsx

## Documentos de impresión y correo (sin paginación de interfaz)

- src/modules/features/marketing/components/pdf-report-template.tsx
- src/modules/core/branding/components/email-signature-generator.tsx
- src/modules/features/tasks/components/pacing/task-pacing-pdf-modal.tsx
- src/modules/features/crm/components/agent-pdf-template.tsx
- src/modules/features/crm/components/crm-pdf-template.tsx

## Selección y acciones

El adaptador local solo pagina los elementos ya filtrados de tbody; conserva los handlers y keys de filas, los encabezados, TableFooter y las barras flotantes del módulo. Seleccionar todos mantiene el alcance definido por cada pantalla. Las filas de detalle agrupadas en Fragment se paginan junto con su registro. No usar el adaptador sobre una página remota: Clientes, Organizaciones, Auditoría y Correos usan total/consulta controlados; Marketing conserva sus cursores.

Los editores de variantes y líneas de factura mantienen sus filas visibles para editar y calcular totales; las plantillas PDF y firmas de correo conservan su representación de salida.
