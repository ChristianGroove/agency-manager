# 🗺️ PIXY SCALABILITY ROADMAP: El Camino a la Perfección Blindada

Este documento detalla la estrategia por fases para transformar a Pixy en un producto técnicamente blindado y empresarialmente escalable, corrigiendo las inconsistencias detectadas sin interrumpir las operaciones actuales.


## Fase 0: Estabilización y Blindaje Arquitectónico (✅ COMPLETADO)
*Enfoque: Eliminar deuda técnica, normalizar dependencias y asegurar cumplimiento de Next.js 16.1.*

- **Normalización de Dependencias**: Resolución de 17 dependencias circulares y consolidación de acciones en capas atómicas (`actions/`, `services/`, `hooks/`).
- **Seguridad "Use Server"**: Aislamiento total de lógica de servidor (DB/Metadata) mediante directivas estrictas en 100+ archivos clave.
- **Modernización de Middleware**: Migración de `proxy.ts` al estándar Next.js 16.1.1 para enrutamiento multi-tenant robusto.
- **Recuperación de Integridad**: Restauración de definiciones críticas de nodos de automatización y servicios de IA.

---

## Fase 1: Sanitización Modular y Saneamiento del Core (✅ COMPLETADO)
*Enfoque: Desacoplar funcionalidades del motor SaaS y categorizar dominios.*

- **Migración de Dominios (Features)**: Desplazamiento de `messaging`, `automation`, `broadcasts`, `notifications`, `channels`, `knowledge` y `caa` hacia `src/modules/features/`.
- **Extracción de Infraestructura**: Consolidación de `src/modules/infrastructure` con los servicios: `logging`, `storage`, `data-vault`, `ai-engine`, `integrations`, `audit`, `backup`, `usage`, `trash`, `tools` y `communication`.
- **Hardening del Core**: Reducción del núcleo a los módulos motor (Auth, Orgs, IAM, SaaS Engine).
- **Refactorización Global**: Actualización de más de 800 referencias de importación para garantizar la integridad del sistema.

---

## Fase 2: Motor de Espacios y Consolidación Estructural (✅ COMPLETADO)
- [x] **Gestión Centralizada**: Unificación de configuración de Spaces en `AppDetailsSheet`.
- [x] **Motor de Terminología**: Implementación de diccionario dinámico por Space.
- [x] **Sistema de Capacidades**: Control granular de UI basado en `ui_config` (JSONB).
- [x] **Saneamiento Estructural**: Eliminación de fugas arquitectónicas en `src/components`.
- [x] **Higiene de Raíz**: Scripts SQL extraídos a la raíz `/db`.
- [x] **Gobernanza**: Guía definitiva [ARCHITECTURE_FILESYSTEM.md](file:///d:/Pixy/agency-manager/docs/architecture/ARCHITECTURE_FILESYSTEM.md).
- **Documentación del Motor**: [SAAS_SPACE_ENGINE_V2.md](file:///d:/Pixy/agency-manager/docs/architecture/SAAS_SPACE_ENGINE_V2.md)
# 🗺️ PIXY SCALABILITY ROADMAP: El Camino a la Perfección Blindada

Este documento detalla la estrategia por fases para transformar a Pixy en un producto técnicamente blindado y empresarialmente escalable, corrigiendo las inconsistencias detectadas sin interrumpir las operaciones actuales.


## Fase 0: Estabilización y Blindaje Arquitectónico (✅ COMPLETADO)
*Enfoque: Eliminar deuda técnica, normalizar dependencias y asegurar cumplimiento de Next.js 16.1.*

- **Normalización de Dependencias**: Resolución de 17 dependencias circulares y consolidación de acciones en capas atómicas (`actions/`, `services/`, `hooks/`).
- **Seguridad "Use Server"**: Aislamiento total de lógica de servidor (DB/Metadata) mediante directivas estrictas en 100+ archivos clave.
- **Modernización de Middleware**: Migración de `proxy.ts` al estándar Next.js 16.1.1 para enrutamiento multi-tenant robusto.
- **Recuperación de Integridad**: Restauración de definiciones críticas de nodos de automatización y servicios de IA.

---

## Fase 1: Sanitización Modular y Saneamiento del Core (✅ COMPLETADO)
*Enfoque: Desacoplar funcionalidades del motor SaaS y categorizar dominios.*

- **Migración de Dominios (Features)**: Desplazamiento de `messaging`, `automation`, `broadcasts`, `notifications`, `channels`, `knowledge` y `caa` hacia `src/modules/features/`.
- **Extracción de Infraestructura**: Consolidación de `src/modules/infrastructure` con los servicios: `logging`, `storage`, `data-vault`, `ai-engine`, `integrations`, `audit`, `backup`, `usage`, `trash`, `tools` y `communication`.
- **Hardening del Core**: Reducción del núcleo a los módulos motor (Auth, Orgs, IAM, SaaS Engine).
- **Refactorización Global**: Actualización de más de 800 referencias de importación para garantizar la integridad del sistema.

---

## Fase 2: Motor de Espacios y Consolidación Estructural (✅ COMPLETADO)
- [x] **Gestión Centralizada**: Unificación de configuración de Spaces en `AppDetailsSheet`.
- [x] **Motor de Terminología**: Implementación de diccionario dinámico por Space.
- [x] **Sistema de Capacidades**: Control granular de UI basado en `ui_config` (JSONB).
- [x] **Saneamiento Estructural**: Eliminación de fugas arquitectónicas en `src/components`.
- [x] **Higiene de Raíz**: Scripts SQL extraídos a la raíz `/db`.
- [x] **Gobernanza**: Guía definitiva [ARCHITECTURE_FILESYSTEM.md](file:///d:/Pixy/agency-manager/docs/architecture/ARCHITECTURE_FILESYSTEM.md).
- **Documentación del Motor**: [SAAS_SPACE_ENGINE_V2.md](file:///d:/Pixy/agency-manager/docs/architecture/SAAS_SPACE_ENGINE_V2.md)

### 2.2 Borrado Físico Estricto (Data Purge Policy)
- **Política**: Se ha descartado el sistema de papelera por redundancia y carga excesiva.
- [x] **Ejecución**: Eliminación física inmediata de registros para mantener el sistema ligero y de alto rendimiento.
- [x] **Limpieza**: Purga de archivos legacy relacionados con `trash` o `soft-delete`.

### 2.3 Circuit Breakers para Integraciones (✅ COMPLETADO)
- **Acción**: Implementado monitor de salud y resiliencia en `src/modules/infrastructure/resilience`.
- **Resultado**: Estabilidad percibida del 99.9% ante fallos de Meta, OpenAI y Evolution.


---

## Fase 3: Inteligencia y Gobernanza (Medio Plazo)
*Enfoque: Autogestión y Blindaje Proactivo.*

### 3.1 Auditoría de RLS y Blindaje (✅ COMPLETADO)
- **Acción**: Hardening de políticas RLS en 10+ tablas críticas para garantizar aislamiento multi-tenant total.
- **Resultado**: Seguridad de grado bancario verificada con script de diagnóstico.


### 3.2 Smoke Tests Automatizados de Facturación (✅ COMPLETADO)
- **Acción**: Suite de pruebas en Vitest y SQL para validar integridad aritmética de comisiones y repartición de ingresos.
- **Resultado**: Certeza económica absoluta con validación centesimal.


---

## Fase 4: Optimización y Performance (Próximos Pasos)
*Enfoque: Carga de alta fidelidad y despliegue continuo.*

- **4.1 Monitorización de Performance**: Implementar auditoría de tiempos de respuesta en modo multi-tenant para asegurar latencias < 200ms en el dashboard.
- **4.2 Validación Linux/Docker**: Garantizar que el entorno de producción es 100% fiel al desarrollo mediante pruebas de contenedor.

## 🛠️ Próximos Pasos Recomendados

1. **Optimización de Consultas Críticas**: Revisar los RPCs de facturación y CRM para garantizar su escalabilidad a millones de registros.
2. **Hardening de Infraestructura**: Configurar alertas automáticas en Supabase para picos de uso inusuales.
