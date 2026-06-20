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
- **`@/modules/assistant/*` & `@/modules/flows/*`**: Motores especializados de agentes conversacionales e IA.
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
3.  La UI utiliza los **Slugs** (ej. `resto`) para habilitar pestañas y secciones.

> [!TIP]
> Al añadir un nuevo módulo en `features`, asegúrate de registrarlo en `system_modules` de la base de datos para que el SaaS Engine pueda verlo.
