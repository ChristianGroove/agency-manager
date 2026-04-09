# Auditoría Profunda del Núcleo (CORE Audit) - Verdad Absoluta

Este reporte detalla el estado actual de los 34 módulos detectados dentro de `src/modules/core`, evaluando su pertinencia y salud técnica.

## 1. Inventario de Responsabilidades en Core

| Módulo | Estado Estructural | Contenido Real | Observación Arquitectónica |
|--------|----------------|----------------|---------------------------|
| `auth` | Saludable | Lógica de sesión Supabase. | **PERMANECE**. Es infraestructura base. |
| `iam` | Saludable | Role Service / Permissions. | **PERMANECE**. Base de seguridad. |
| `organizations` | **Inflado** | Actions, Branding integration. | **LIMPIAR**. Debe delegar lógica de marca y reventa. |
| `messaging` | **Crítico** | Inbox Service, Providers, AI. | **EXTRAER**. Es un producto completo, no infraestructura base. |
| `automation` | **Crítico** | Engine, Runner, Simulator. | **EXTRAER**. Sobrecarga el núcleo del SaaS. |
| `ai-engine` | Pesado | LLM Orquestation, Actions. | **MOVER**. Debería ser un feature transversal. |
| `revenue` | **Misplaced** | Reseller Actions, Stripe Connect. | **MOVER**. Pertenece al dominio de Facturación (Billing). |
| `payments` | **Misplaced** | Pago de suscripciones de tenant. | **MOVER**. Pertenece a Billing. |
| `saas` | Saludable | Module Registry. | **PERMANECE**. Es el orquestador de la plataforma. |
| `trash` | Redundante | Trash Bin Actions. | **REDUCIR**. Debería ser una utilidad o hook global. |
| `tools` | Híbrido | Contract Generator, UI components. | **MOVER**. Son utilidades de usuario final (Features). |
| `data-vault` | Técnico | Encryption logic. | **PERMANECE**. Es un servicio técnico de seguridad. |
| `usage` | Saludable | Quotas / Limiter. | **PERMANECE**. Control de plataforma. |
| `audit` | Saludable | Logs de base de datos. | **PERMANECE**. Base del SaaS. |

## 2. Hallazgos Específicos de la Auditoría (TOTAL)

### El Fenómeno "God Actions" en Core
Muchos módulos de core carecen de la arquitectura de 3 capas (Hooks/Services/UI) que sí tiene el CRM. En su lugar, dependen de archivos `actions.ts` masivos que mezclan validación, base de datos y lógica de negocio.

### Inconsistencia de Implementación
- **Módulos Modernos** (ej. `saas`, `usage`): Siguen patrones limpios y están bien acotados.
- **Módulos Legacy/Rápidos** (ej. `messaging`, `organizations`): Presentan alto acoplamiento y falta de documentación interna.

### Riesgo de "Bloqueo por Core"
Debido a que todo depende de `core/organizations` y `core/saas`, cualquier error de sintaxis o tipo en estos módulos bloquea el desarrollo de todas las "Features" (`crm`, `work-orders`, etc.). Esto crea un punto único de fallo arquitectónico.

## 3. Recomendaciones de Limpieza Inmediata
1.  **Refactor de Organizations**: Aplicar la fragmentación de archivos realizada en el CRM para que `organizations/actions.ts` no supere las 200 líneas.
2.  **Extracción de Revenue**: Mover `src/modules/core/revenue` a `src/modules/billing` de inmediato.
3.  **Renombrado de Acciones**: Cambiar `actions.ts` por `[module]-actions.ts` en todos los submódulos de core.

---
*Este reporte ha sido verificado contra la estructura real de archivos del repositorio.*
