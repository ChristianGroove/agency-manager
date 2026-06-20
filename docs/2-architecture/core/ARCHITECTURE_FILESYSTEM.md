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
Contiene los "motores" del SaaS que son esenciales para el funcionamiento multitenant.
- **Database**: Clientes de Supabase (Server, Admin, Browser) y servicios base.
- **IAM**: Identidad y Acceso (Roles de plataforma, Permisos cacheados, Auth).
- **Organizations**: Gestión de Tenants (Configuración, Branding, Miembros, Billing interno).
- **SaaS**: Registro de aplicaciones, verticales y capacidades (Capabilities Engine).
- **Security**: Logger de auditoría, Cifrado (Vault) y Hardening.
- **UI**: Componentes transversales y layouts base del dashboard.

#### **B. Infrastructure (`/src/modules/infrastructure`)**
Capa de comunicación con el exterior y utilidades de bajo nivel.
- **AI**: Diagnóstico, Sanetización de datos y validación de intención.
- **Integrations**: Adaptadores para servicios externos (Meta, Evolution API).
- **Notifications**: Motor de Email (Resend) y notificaciones de sistema.
- **Resilience**: Circuit Breakers y reintentos exponenciales para APIs externas.
- **Utils**: Utilidades puras, formateadores y validadores globales.

#### **C. Features (`/src/modules/features`)**
El valor de negocio modular cargado según el "Space" del tenant.
- **CRM**: Gestión dinámica de Leads, Clientes y Pipeline Avanzado.
- **Attendance**: Control de atención y flujos de trabajo operativos.
- **Quotes**: Sistema de cotizaciones interactivas con branding dinámico.

#### **D. Módulos de Dominio Independientes**
Dominios extraídos a la raíz por su complejidad masiva o necesidades de seguridad.
- **`/src/modules/billing`**: Facturación recurrente, Proyectos y Pasarelas de Pago.
- **`/src/modules/auth`**: Sistemas avanzados de login (ej. Passkeys).
- **`/src/modules/assistant` & `/src/modules/flows`**: Agentes IA y flujos.
- **`/src/modules/admin`**: Panel de superadministrador.
- **`/src/modules/custom`**: Scripts e integraciones específicas experimentales.

---

## 📐 Reglas de Oro de Ubicación

Dentro de cada módulo (`modules/*`), se mantiene una sub-estructura estricta:

- `actions/`: Server Actions de Next.js (Punto de entrada de lógica de servidor).
- `services/`: Lógica de negocio pesada, servicios de dominio y ORM.
- `components/`: UI encapsulada (Hooks de UI y componentes atómicos).
- `types/`: Interfaces y enums exclusivos del dominio.

### 🚫 Prohibiciones Absolutas (Platinum Standard)
1. **DEPRECADO: No /src/lib**: La carpeta `src/lib` ha sido ELIMINADA. No se permite crear archivos de lógica fuera de `src/modules`.
2. **Aislamiento de Features**: Una feature no debe importar componentes de UI específicos de otra feature. Si se requiere compartir, debe promoverse a `core/ui`.
3. **Registry Mandatory**: Toda integración debe estar registrada en `infrastructure/integrations/registry.ts`.
4. **Resilience Mandatory**: Toda llamada a API externa debe estar envuelta en un `CircuitBreaker`.
5. **No Imports Relativos**: Prohibido el uso de `../../..`. Usar siempre alias `@/modules/*`.

---

## 🚀 Cómo añadir un nuevo Módulo

1. Identifica si es un motor del SaaS (**Core**) o una función para el cliente (**Feature**).
2. Crea la estructura base: `actions/`, `components/`, `services/`.
3. Registra el módulo en `ROADMAP_SCALABILITY.md` si es un cambio mayor.
