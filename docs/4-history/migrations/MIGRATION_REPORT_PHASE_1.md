# Reporte de Migración: Sanitización del Core (Fase 1)

**Fecha**: 9 de Abril, 2026
**Estado**: ✅ COMPLETADO
**Objetivo**: Desacoplar el núcleo de Pixy y establecer las bases de una arquitectura en 3 capas (Core, Features, Infrastructure).

## 1. Reestructuración de Módulos
Se han movido los siguientes componentes desde `src/modules/core`:

| Módulo | Nueva Ubicación | Categoría |
| :--- | :--- | :--- |
| **Messaging** | `src/modules/features/messaging` | Feature (Dominio) |
| **Automation** | `src/modules/features/automation` | Feature (Dominio) |
| **Broadcasts** | `src/modules/features/broadcasts` | Feature (Dominio) |
| **Notifications** | `src/modules/features/notifications` | Feature (Dominio) |
| **Channels** | `src/modules/features/channels` | Feature (Dominio) |
| **Knowledge** | `src/modules/features/knowledge` | Feature (Dominio) |
| **CAA** | `src/modules/features/caa` | Feature (Dominio) |
| **Logging** | `src/modules/infrastructure/logging` | Infrastructure (Servicio) |
| **Storage** | `src/modules/infrastructure/storage` | Infrastructure (Servicio) |
| **Data-Vault** | `src/modules/infrastructure/data-vault` | Infrastructure (Servicio) |
| **AI Engine** | `src/modules/infrastructure/ai-engine` | Infrastructure (Servicio) |
| **Integrations** | `src/modules/infrastructure/integrations` | Infrastructure (Servicio) |
| **Audit/Backup/Usage** | `src/modules/infrastructure/[...]` | Infrastructure (Servicio) |
| **Trash/Tools/Comm** | `src/modules/infrastructure/[...]` | Infrastructure (Servicio) |

## 2. Logros Técnicos
- **Path Aliasing**: Implementación del alias `@/modules/infrastructure/*` para simplificar la importación de servicios técnicos.
- **Limpieza de Imports**: Refactorización global de más de 800 referencias directas y relativas (Fase A + B).
- **Resolución de Exportaciones**: Restauración de aggregators críticos en `messaging`, `automation`, `knowledge` y `ai-engine`.
- **Build Validado**: El proyecto compila correctamente bajo el motor Turbopack de Next.js.

## 3. Estado de la Arquitectura
La plataforma ahora respeta la jerarquía de dependencias:
- **Core**: Contiene solo el motor SaaS (Auth, Orgs, IAM). No depende de Features.
- **Features**: Consumen lógica del Core e Infraestructura.
- **Infrastructure**: Provee servicios agnósticos a la lógica de negocio.

## 4. Transición a Fase 2: Motor de Espacios (SaaS V2)
La sanitización realizada en la Fase 1 ha sido el cimiento para:
- **Activación Dinámica**: El desacoplamiento permitió que módulos como `billing` o `messaging` se activen vía configuración JSONB (`ui_config`) sin efectos secundarios.
- **Terminología**: Los componentes en `core` ahora inyectan el diccionario global, permitiendo verticalización instantánea.
- **Capabilidades**: Se ha eliminado la dependencia del "Slug" para la lógica de negocio, moviéndola a un `Capabilities Registry`.

## 5. Historial de Decisiones
| Decisión | Razón | Impacto |
| :--- | :--- | :--- |
| **JSONB ui_config** | Evitar migraciones de esquema constantes. | Alta flexibilidad. |
| **Auto-Sync Logic** | Reducir error humano en administración. | Mayor estabilidad. |

---
*Para detalles sobre el nuevo motor de configuración, ver:* [SAAS_SPACE_ENGINE_V2.md](file:///d:/Pixy/agency-manager/docs/architecture/SAAS_SPACE_ENGINE_V2.md)
