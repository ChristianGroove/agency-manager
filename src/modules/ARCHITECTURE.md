# Arquitectura Modular: Core vs Features

Este documento describe la estructura de módulos implementada para garantizar la escalabilidad y mantenibilidad de **Agency Manager**.

## 1. División de Capas

El sistema se divide en dos grandes categorías de módulos ubicados en `src/modules/`:

### Core (`@/modules/core/*`)
Contiene los "motores" esenciales que permiten que el SaaS funcione independientemente de la industria del cliente.
- **Identidad e IAM:** Auth, Roles, Permisos.
- **SaaS Engine:** Planes, Suscripciones, Organizaciones.
- **Motores Transversales:** CRM base, Messaging, Notificaciones, Billing.
- **Infraestructura:** API Layout, Dashboard dinámico, Logging.

### Features (`@/modules/features/*`)
Contiene las funcionalidades verticales y específicas de cada nicho o industria. No son esenciales para que el sistema arranque, pero aportan el valor de negocio final.
- **Resto:** Gestión de mesas y comandas.
- **Attendance:** Marcación y nómina.
- **Work-Orders:** Mantenimiento y limpieza.
- **Hosting:** Gestión de servidores.
- **Catalog:** Catálogos interactivos.
- **Forms:** Generador de formularios.

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
