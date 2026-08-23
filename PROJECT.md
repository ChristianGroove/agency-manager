# Project: Pixy Real Estate Space (`real_estate`) Integration

## Architecture
Pixy's multi-tenant architecture uses a modular Space category pattern (`SpaceCategory = 'agency' | 'resto' | 'cleaning' | 'platform' | 'retail' | 'saas' | 'real_estate'`). Each Space defines:
1. **Capabilities & Terminology Preset**: Registered in `capabilities-registry.ts` and resolved by `space-helpers.ts` to control dynamic UI labels, navigation tabs, channels, and atomic feature permissions.
2. **SaaS App & Module Bundles**: Registered in `saas_apps` and `saas_app_modules` with vertical icons (`Building2`), pricing models, and required modules (`core_crm`, `core_clients`, `module_messaging`, `module_quotes`, `module_catalog`, `module_automation`, `core_locations`).
3. **Tenant Provisioning Lifecycle**: Automated initialization in `provisioning.ts` seeding default PropTech categories into `service_categories`, initializing `portal_theme_config` in `organization_settings`, auto-assigning modules via `assign_app_to_organization`, and initializing the Real Estate sales pipeline in the CRM process engine.
4. **Workspace & Dashboard UI**: Dynamic metric computation and rendering in `dashboard-actions.ts` / `RealEstateDashboard`, plus dynamic PropTech terminology and search placeholders in `catalog-workspace.tsx` and `catalog-items-tab.tsx`.
5. **Quality Assurance**: Automated multi-tier E2E test runner (`tests/e2e/catalog/runner.ts`) verifying space resolution, provisioning, multi-tenant isolation, backwards compatibility, and zero TypeScript compilation errors (`tsc --noEmit`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Space Category & Helpers | Extend `SpaceCategory` in `space-helpers.ts`, `types/saas.ts`, `vertical-registry.ts`, and `use-space-policies.ts` to include `'real_estate'` | M1 (DONE) | Survey Miner 1 |
| 2 | Capabilities Registry Preset | Register `DynamicSpaceConfig` preset for `real_estate` with Spanish terminology, tabs, channels, and capabilities in `capabilities-registry.ts` | M1 (DONE) | Survey Miner 1 |
| 3 | Route & Module Config | Update `module-config.ts` ensuring `/portfolio` and CRM subroutes map correctly for `real_estate` | M1 (DONE) | Survey Miner 1 |
| 4 | Super Admin UI & App Slider | Add Real Estate space category to `create-app-dialog.tsx`, `app-details-sheet.tsx`, `create-app-sheet.tsx`, and add `Building2` icon to `app-slider.tsx` | M2 (DONE) | Survey Miner 1 |
| 5 | Seed `app_real_estate_pro` | Provide idempotent migration/seed registering `app_real_estate_pro` in `saas_apps` and linking 7 system modules in `saas_app_modules` | M2 (DONE) | Survey Miner 1 |
| 6 | Tenant Provisioning Action | In `provisioning.ts`, auto-seed default categories (*Apartamentos*, *Casas*, etc.), set `portal_theme_config` preset, auto-enable modules, and configure CRM pipeline | M3 (DONE) | Survey Explorer 1 |
| 7 | Dashboard & Workspace UI | In `dashboard-actions.ts`, compute `realEstateMetrics`, create `RealEstateDashboard`, and adapt `catalog-workspace.tsx` / `catalog-items-tab.tsx` terminology | M4 (DONE) | Survey Explorer 2 |
| 8 | E2E Test Suite & Zero Debt | Add Real Estate test suites across Tiers 1-5 in `tests/e2e/catalog/`, update `contracts.ts`, ensure 100% test pass rate and 0 `tsc --noEmit` errors | M5 (DONE) | Survey Explorer 2 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Core Space Architecture & Registry | `space-helpers.ts`, `types/saas.ts`, `capabilities-registry.ts`, `vertical-registry.ts`, `use-space-policies.ts`, `module-config.ts` | none | DONE |
| M2 | Super Admin & SaaS Engine App Provisioning | `create-app-dialog.tsx`, `app-details-sheet.tsx`, `create-app-sheet.tsx`, `app-slider.tsx`, `seed_real_estate_app.sql`, `seed-apps.ts` | M1 | DONE |
| M3 | Tenant Lifecycle & Automated PropTech Initialization | `provisioning.ts`, `templates-shared.ts`, default category seeding, `portal_theme_config` preset | M1, M2 | DONE |
| M4 | Workspace & Dashboard PropTech Adaptation | `dashboard-actions.ts`, `real-estate-dashboard.tsx`, `dashboard/page.tsx`, `catalog-workspace.tsx`, `catalog-items-tab.tsx` | M1, M3 | DONE |
| M5 | Comprehensive E2E Test Suite & Zero Tech Debt | `tests/e2e/catalog/`, `contracts.ts`, `tsc --noEmit` clean, 100% test pass rate | M1, M2, M3, M4 | DONE |

## Interface Contracts
### Space Helpers & Capabilities ↔ SaaS & Provisioning
- `SpaceCategory` includes `'real_estate'`.
- `CAPABILITY_PRESETS['real_estate']` provides:
  - Terminology: `client: 'Cliente / Comprador'`, `clients: 'Clientes / Prospectos'`, `project: 'Inmueble / Propiedad'`, `sale: 'Cierre / Negocio'`, `action_new: 'Nuevo Prospecto'`.
  - Visible tabs: `['info', 'activity', 'services', 'billing']`.
  - Enabled channels: `['whatsapp', 'email', 'sms']`.
  - Capabilities: `['crm.core', 'crm.advanced', 'crm.quotes', 'messaging.standard', 'messaging.ai_agent', 'billing.management', 'automation.engine']`.

### SaaS App Seeding ↔ Provisioning Action
- `saas_apps` entry: `id: 'app_real_estate_pro'`, `name: 'Real Estate & PropTech Pro'`, `slug: 'real-estate-pro'`, `category: 'real_estate'`, `icon: 'Building2'`, `price_monthly: 99.00`.
- Linked modules in `saas_app_modules`: `core_crm`, `core_clients`, `module_messaging`, `module_quotes`, `module_catalog`, `module_automation`, `core_locations`.

### Provisioning ↔ Catalog & Portal Theme
- Seeded default categories in `service_categories`:
  - *Apartamentos* (`slug: 'apartamentos'`, `icon: 'Building'`, `order_index: 0`)
  - *Casas* (`slug: 'casas'`, `icon: 'Home'`, `order_index: 1`)
  - *Oficinas & Locales Comerciales* (`slug: 'oficinas-locales'`, `icon: 'Briefcase'`, `order_index: 2`)
  - *Lotes & Fincas* (`slug: 'lotes-fincas'`, `icon: 'Trees'`, `order_index: 3`)
  - *Proyectos Sobre Planos* (`slug: 'proyectos-planos'`, `icon: 'FileSpreadsheet'`, `order_index: 4`)
- `portal_theme_config`: `{ industry_preset: 'real_estate', widget_config: { show_real_estate_filters: true, show_mortgage_calculator: true } }`.

## Code Layout
- Space Core: `src/modules/core/organizations/space-helpers.ts`, `src/types/saas.ts`, `src/modules/core/organizations/capabilities-registry.ts`, `src/modules/core/organizations/vertical-registry.ts`, `src/modules/flows/hooks/use-space-policies.ts`
- SaaS Routing: `src/modules/core/saas/module-config.ts`
- Super Admin UI: `src/app/(dashboard)/platform/admin/apps/_components/create-app-dialog.tsx`, `src/app/(dashboard)/platform/admin/apps/_components/app-details-sheet.tsx`, `src/modules/core/saas/create-app-sheet.tsx`, `src/modules/core/lifecycle/components/onboarding/app-slider.tsx`
- Database Migrations / Seeds: `supabase/migrations/20260822000001_seed_real_estate_app.sql`
- Provisioning: `src/modules/core/organizations/actions/provisioning.ts`, `src/modules/features/crm/services/logic/templates-shared.ts`
- Dashboard: `src/modules/core/dashboard/dashboard-actions.ts`, `src/modules/core/dashboard/components/real-estate-dashboard.tsx`, `src/app/(dashboard)/dashboard/page.tsx`
- Catalog Workspace: `src/modules/features/catalog/components/catalog-workspace.tsx`, `src/modules/features/catalog/components/catalog-items-tab.tsx`
- E2E Tests: `tests/e2e/catalog/`
