# Inventario Exhaustivo de Módulos y Subsistemas (Pixy)

Este documento detalla cada pieza funcional detectada en el repositorio, proporcionando su ubicación exacta y una descripción de su rol real.

## 1. Módulos de Lógica de Negocio (/src/modules)

### Capa de Features (Verticales Finales)
| Módulo | Estado Estructural | Contenido Detectado | Rol |
|--------|----------------|---------------------|-----|
| `crm` | **Óptimo** | Actions, Components, Context, Services, Hooks, Types. | Gestión de leads y contactos (Arquitectura 3 capas). |
| `locations` | **Bueno** | Actions, Components, Context, Services, Hooks, Types. | Gestión de sedes (Migrado de core). |
| `marketing` | **Bueno** | Actions, Components, Services, Hooks. | Auditoría de captación y formularios. |
| `quotes` | **Bueno** | Specific Actions, Components, Types. | Sistema de presupuestos y proformas. |
| `hosting` | **En Refactor** | Generic Actions, Components. | Gestión de servicios y contratos activos. |
| `resto` | **Vertical** | Components (PWA). | Solución para menús y pedidos digitales. |
| `work-orders` | **Modular** | Components, Services, Payroll, Staff. | Gestión de órdenes de trabajo y personal técnico. |

### Capa Core (Núcleo Plataforma - 34 Submódulos)
| Categoría | Módulos Incluidos | Rol Real |
|-----------|------------------|----------|
| **SaaS Foundation** | `auth`, `iam`, `organizations`, `saas`, `apps`, `branding`, `usage`. | Gestión de inquilinos, permisos, identidad y registro de módulos. |
| **Messaging Engine** | `messaging`, `broadcasts`, `channels`, `communication`. | Chat multicanal, Webhooks de Meta, envíos masivos y notificaciones. |
| **Automation & AI** | `automation`, `ai`, `ai-engine`, `knowledge`, `lifecycle`. | Motor de flujos (triggers/actions), orquestación de LLMs y base de conocimiento. |
| **Infra & Ops** | `audit`, `backup`, `logging`, `storage`, `settings`, `layout`, `dashboard`. | Tareas administrativas, persistencia de archivos, logs de sistema y UI base. |
| **Business Logic** | `payments`, `revenue`, `data-vault`, `domains`, `preferences`. | Lógica financiera de reventa, almacenamiento cifrado y dominios personalizados. |
| **Utilities/Misc** | `caa`, `tools`, `trash`, `notifications`. | Registro de apps custom, herramientas (generador contratos) y papelera. |

## 2. Subsistemas de Persistencia (/supabase)
No son solo datos, contienen lógica de backend distribuida.
- **`migrations/`**: Define la integridad referencial y las reglas RLS (Row Level Security).
- **`_manual_scripts/`**: Subsistema de curación de datos y "hotfixes" SQL para producción.

## 3. Subsistemas de Mantenimiento (/scripts)
Herramientas críticas que operan fuera de la ejecución de Next.js.
- **`/perf`**: Subsistema de optimización de base de datos (Índices y RPCs pesados).
- **`publish-flows.ts`**: Orquestación de despliegue de lógica lamatizada.
- **`verify-*.ts`**: Suite de validación de integridad (Permisos, Producción, Activación).

## 4. Subsistemas de Infraestructura (/infrastructure)
- **`/docker`**: Orquestación de contenedores para desarrollo local.
- **Configuración Vercel**: Orquestación de despliegue y variables de entorno del pipeline.

---
### Conclusión del Inventario
El sistema es un ecosistema complejo donde la lógica está distribuida pero fuertemente atraída hacia `src/modules/core`. Se confirma la presencia de lógica de negocio en 3 capas distintas: SQL (Supabase), Scripts de soporte y el Módulo de Aplicación.
