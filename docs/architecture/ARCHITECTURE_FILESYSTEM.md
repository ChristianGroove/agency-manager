# 📂 Pixy Filesystem Architecture Guide

Este documento es la **fuente de verdad definitiva** sobre la organización del código en Pixy. Todo nuevo archivo debe seguir estas reglas para mantener la integridad modular y la escalabilidad del sistema.

---

## 🏛️ Estructura de Raíz

| Carpeta | Propósito |
| :--- | :--- |
| `/db` | Scripts SQL de diagnóstico, migraciones y seeds (fuera del código fuente). |
| `/docs` | Documentación técnica, roadmap y guías de arquitectura. |
| `/public` | Activos estáticos (imágenes, fuentes, favicons, animaciones JSON). |
| `/src` | Código fuente principal de la aplicación Next.js. |

---

## 🏰 Organización /src

### 1. `/src/modules` (El Corazón Modular)
Pixy utiliza una arquitectura de 3 capas para separar responsabilidades:

#### **A. Core (`/src/modules/core`)**
Contiene los "motores" del SaaS que son compartidos por toda la plataforma.
- **Admin**: Gestión global del sistema.
- **Auth**: Autenticación y recuperación de credenciales.
- **IAM**: Gestión de identidad, perfiles y usuarios.
- **Organizations**: Gestión de tenants, branding y límites.
- **UI**: Componentes de UI transversales (Search, Toggles, Layouts).

#### **B. Infrastructure (`/src/modules/infrastructure`)**
Integraciones con el mundo exterior y servicios de bajo nivel.
- **AI**: Motores de inteligencia artificial.
- **Logging**: Auditoría y seguimiento.
- **Meta**: Integración con APIs de WhatsApp/Facebook/Instagram.
- **Integrations**: Marketplace y gestión de conectores.
- **Resilience**: Capa de protección y Circuit Breakers para APIs externas.

#### **C. Features (`/src/modules/features`)**
El valor de negocio específico. Cada feature es un dominio aislado.
- **CRM**: Gestión de contactos y flujos de ventas.
- **Billing**: Facturación, pagos y suscripciones.
- **Quotes**: Sistema de cotizaciones.
- **Messaging**: Inbox unificado y centro de mensajes.

---

## 📐 Reglas de Ubicación de Archivos

Dentro de cada módulo (`modules/*`), se debe seguir este patrón:

- `components/`: UI específica del módulo. No debe haber lógica de negocio pesada, solo presets de visualización.
- `services/`: Lógica de negocio, controladores y procesamiento de datos.
- `actions/`: Server Actions de Next.js.
- `hooks/`: Custom hooks reutilizables para ese dominio.
- `types/`: Definiciones de interfaces exclusivas del módulo.

### 🚫 Prohibiciones Estrictas
1. **No Componentes Huérfanos**: No se permiten carpetas de funciones (ej. `marketing`, `meta`) dentro de `src/components`. Esa carpeta solo es para componentes UI transversales (Shadcn/UI, Layouts base).
2. **No Lógica en /src/db**: Los scripts SQL solo viven en la raíz `/db`.
3. **No Imports Relativos Profundos**: Prefiere siempre alias `@/modules/...` en lugar de `../../../../`.

---

## 🚀 Cómo añadir un nuevo Módulo

1. Identifica si es un motor del SaaS (**Core**) o una función para el cliente (**Feature**).
2. Crea la estructura base: `actions/`, `components/`, `services/`.
3. Registra el módulo en `ROADMAP_SCALABILITY.md` si es un cambio mayor.
