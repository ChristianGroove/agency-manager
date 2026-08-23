# Original User Request

## Initial Request — 2026-08-22T21:09:00-05:00

Implement and integrate the new dedicated **Real Estate Space (`real_estate`)** into Pixy's multi-tenant architecture, Super Admin management, tenant onboarding & provisioning lifecycle, SaaS Engine operational module bundles, and default PropTech catalog & storefront presets.

Working directory: g:/Pixy/agency-manager
Integrity mode: development

## Requirements

### R1. Core Space Architecture & Registry (`real_estate`)
- Extend `SpaceCategory` in `src/modules/core/organizations/space-helpers.ts` and `src/types/saas.ts` to include `'real_estate'`.
- Register the full `DynamicSpaceConfig` preset for `real_estate` in `src/modules/core/organizations/capabilities-registry.ts`:
  - **Terminology**: `client: 'Cliente / Comprador'`, `clients: 'Clientes / Prospectos'`, `project: 'Inmueble / Propiedad'`, `sale: 'Cierre / Negocio'`, `action_new: 'Nuevo Prospecto'`.
  - **Policies**: Visible tabs (`['info', 'activity', 'services', 'billing']`), enabled channels (`['whatsapp', 'email', 'sms']`), default dashboard `real_estate`.
  - **Capabilities**: `['crm.core', 'crm.advanced', 'crm.quotes', 'messaging.standard', 'messaging.ai_agent', 'billing.management', 'automation.engine']`.
- Update module and route mappings in `src/modules/core/saas/module-config.ts` ensuring `/portfolio` (Propiedades & Inmuebles), `/crm/*`, and PropTech tools are accessible and properly categorized.

### R2. Super Admin & SaaS Engine Vertical App Provisioning
- Integrate `real_estate` into Super Admin Space management:
  - Add Real Estate option to `src/app/(dashboard)/platform/admin/apps/_components/create-app-dialog.tsx` and `src/modules/core/saas/create-app-sheet.tsx`.
  - Provide an idempotent seeding script/action registering `app_real_estate_pro` (*"Real Estate & PropTech Pro"*, slug `real-estate-pro`, category `real_estate`, icon `Building2`, price model, and linked system modules: `core_crm`, `core_clients`, `module_messaging`, `module_quotes`, `module_catalog`, `module_automation`, `core_locations`).
  - Verify `getAvailableApps`, `getSaaSProducts`, and `getAllAppsAdmin` correctly display the Real Estate Space in Super Admin galleries, usage stats, and Onboarding sliders (`AppSlider`).

### R3. Tenant Lifecycle & Automated PropTech Initialization
- In `src/modules/core/organizations/actions/provisioning.ts` (`createOrganization` / `createClientOrganization`):
  - When provisioning an organization under the Real Estate App or space category `real_estate`:
    - Automatically seed default Real Estate categories (*Apartamentos*, *Casas*, *Oficinas & Locales Comerciales*, *Lotes & Fincas*, *Proyectos Sobre Planos*).
    - Automatically initialize `portal_theme_config` with default `industry_preset: 'real_estate'` and mortgage calculator enabled.
    - Guarantee seamless module auto-enabling via `assign_app_to_organization`.

### R4. Workspace & Dashboard PropTech Adaptation
- In `src/modules/core/dashboard/dashboard-actions.ts`, recognize `spaceCategory === 'real_estate'` and adapt dashboard KPI widgets (Propiedades Activas, Leads de Compradores, Visitas / Contactos por Propiedades).
- In `src/modules/features/catalog/components/catalog-workspace.tsx` and `src/modules/features/catalog/components/catalog-items-tab.tsx`, display dynamic Real Estate terminology (*"Propiedades & Inmuebles"*, search placeholders for sector/city/barrio).

### R5. Comprehensive Automated E2E Test Suite & Zero Technical Debt
- Expand `tests/e2e/catalog/runner.ts` with dedicated automated test suites covering:
  - Space category resolution and capability registry lookup for `real_estate`.
  - Super Admin app configuration and module linking for Real Estate.
  - End-to-end tenant provisioning with Real Estate template, default categories, and preset initialization.
  - Multi-tenant isolation and 100% backwards compatibility with legacy spaces (`agency`, `resto`, `cleaning`, `retail`, `saas`).
- Ensure zero TypeScript errors (`tsc --noEmit`) and 100% test pass rate.

## Acceptance Criteria

### Space Architecture & Super Admin
- [ ] `SpaceCategory` includes `'real_estate'` across all TypeScript definitions and capability presets.
- [ ] Super Admin (`/platform/admin/apps`) can create, view, and edit Real Estate Spaces.
- [ ] The database has `app_real_estate_pro` properly registered with all required modules linked in `saas_app_modules`.

### Tenant Provisioning & Defaults
- [ ] Creating a new organization with the Real Estate template provisions all default categories (*Apartamentos*, *Casas*, etc.) and sets the default preset to `real_estate`.
- [ ] Navigating to `/portfolio` in a Real Estate tenant automatically displays the Real Estate interface and terminology without requiring manual configuration.
- [ ] Navigating to `/dashboard` in a Real Estate tenant renders the PropTech dashboard metrics.

### Quality, Security & Compatibility
- [ ] Zero cross-tenant data leakage and strict multi-tenant isolation enforced.
- [ ] Zero TypeScript compilation errors (`tsc --noEmit`).
- [ ] 100% of automated test suites in `tests/e2e/catalog/runner.ts` pass with 0 errors.
