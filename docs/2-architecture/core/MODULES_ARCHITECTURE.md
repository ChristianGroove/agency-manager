# Arquitectura Modular: Core vs Features

Este documento describe la estructura de módulos implementada para garantizar la escalabilidad y mantenibilidad de **Agency Manager**.

## 1. División de Capas

El ecosistema de módulos en `src/modules/` ha evolucionado y actualmente se organiza en varias áreas de dominio de alto nivel para separar responsabilidades de forma estricta:

### Core (`@/modules/core/*`)
Contiene los "motores" esenciales que permiten que el SaaS funcione independientemente de la industria del cliente.
- **SaaS Engine & IAM:** Auth base, Roles, Permisos, Organizaciones.
- **Infraestructura Core:** Layout, Dashboard dinámico, Logging, Routing.

### Features (`@/modules/features/*`)
Contiene las funcionalidades verticales (ej. CRM, Messaging, Automation, Quotes) que componen la propuesta de valor para el usuario final.

### Infrastructure (`@/modules/infrastructure/*`)
Servicios técnicos transversales que dan soporte al sistema (ej. conectores de Meta/WhatsApp API, AI engine).

### Módulos de Dominio Independientes
Además de la triada principal (Core/Features/Infrastructure), existen módulos extraídos por su alta complejidad o aislamiento de dominio:
- **`@/modules/billing/*`**: Todo el sistema financiero, suscripciones SaaS, pasarelas de pago y facturación.
- **`@/modules/auth/*`**: Sistemas de autenticación avanzados (ej. Passkeys).
- **`@/modules/assistant/*`**: Motor especializado de agentes conversacionales e IA gobernada.
- **`@/modules/admin/*`**: Funciones exclusivas para el Super Admin de la plataforma.
- **`@/modules/custom/*`**: Integraciones o scripts específicos y experimentales.

---

## 2. Reglas de Dependencia

Para evitar el acoplamiento y la deuda técnica, se han establecido las siguientes reglas:

1.  **Core-to-Core:** Permitido.
2.  **Features-to-Core:** Permitido. Los módulos de features pueden usar el Billing, Auth y CRM del Core.
3.  **Core-to-Features:** **PROHIBIDO.** El Core nunca debe saber nada sobre un módulo de `features`. Esto garantiza que el sistema base sea transportable.
4.  **Feature-to-Feature:** Desaconsejado. Si dos features comparten mucha lógica, esa lógica debería moverse a un servicio en el `core`.

---

## 3. Registro de Módulos (SaaS Engine)

La activación de módulos se realiza dinámicamente mediante el sistema de **Active Modules**:
1.  Cada organización tiene un `active_app_id` (Space).
2.  El sistema resuelve la unión de: `Core Modules + App Modules + Subscription Modules + Manual Overrides`.
3.  La UI utiliza los **Slugs** y el catálogo `MODULE_ROUTES` ([`src/modules/core/saas/module-config.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/saas/module-config.ts)) para habilitar pestañas, rutas y secciones de acuerdo tanto con los módulos activos como con los permisos IAM V2 del usuario.

---

## 4. Gobernanza Obligatoria al Incorporar un Nuevo Módulo o Feature

> [!IMPORTANT]
> **REGLA DE ORO (DISABLED-BY-DEFAULT + REGISTRO IAM V2)**:
> Todo módulo nuevo o feature nueva que se registre en el sistema **entra desactivado por defecto** y **debe pedir confirmación explícita** antes de activarse para las organizaciones o roles operativos.

Cuando se añade un nuevo módulo en `src/modules/features/*` o se amplía un módulo existente, es **obligatorio** cumplir los siguientes 5 pasos antes del commit:

1. **Estado Inicial Desactivado (`Disabled-by-Default`)**:
   - Registrar el módulo en `system_modules` / `saas_app_modules` con `auto_enable = false` para tenants existentes, requiriendo confirmación explícita para su activación.
2. **Registro en `module-config.ts`**:
   - Añadir la definición en `MODULE_METADATA` y sus rutas protegidas en `MODULE_ROUTES` dentro de [`src/modules/core/saas/module-config.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/saas/module-config.ts).
3. **Registro en el Sistema de Roles y Permisos IAM V2 (`permissions.ts` y `default-roles.ts`)**:
   - Definir las claves de permisos en `PERMISSIONS.<DOMINIO>` y agruparlas en `PERMISSION_GROUPS` con su respectivo `moduleKey` en [`src/modules/core/iam/actions/permissions.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/actions/permissions.ts).
   - Registrar el estado por defecto en [`src/modules/core/iam/services/default-roles.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/services/default-roles.ts) (en `false` por defecto para el rol `Miembro` y sujeto a activación confirmada desde **SuperAdmin $\rightarrow$ Roles & Permisos IAM**).
4. **Internacionalización (`es.ts` y `en.ts`)**:
   - Registrar etiquetas y descripciones en [`es.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/i18n/dictionaries/es.ts), [`en.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/i18n/dictionaries/en.ts) y [`use-localized-iam.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/actions/use-localized-iam.ts).
5. **Protección con `requirePermission`**:
   - Proteger todas las Server Actions del módulo invocando `await requirePermission(PERMISSIONS.DOMINIO.ACCION, orgId)` de [`src/modules/core/iam/services/role-service.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/services/role-service.ts).

Para mayor detalle arquitectónico, consultar [`SECURITY_STANDARDS.md`](file:///G:/Pixy/agency-manager-mejorasuxui/docs/2-architecture/security/SECURITY_STANDARDS.md) y [`settings-and-iam-overhaul.md`](file:///G:/Pixy/agency-manager-mejorasuxui/docs/ui/settings-and-iam-overhaul.md).

