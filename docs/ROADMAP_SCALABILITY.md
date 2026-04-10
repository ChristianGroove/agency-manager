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

### 2.2 Papelera de Reciclaje B2B (Safety Net)
- **Acción**: Reforzar el `soft-delete`. Todo elemento "borrado" va a una tabla de auditoría/papelera por 30 días.
- **Acción**: Función de `restore()` disponible para el Admin.
- **Resultado**: Blindaje total contra errores humanos o sabotajes internos.

### 2.3 Circuit Breakers para Integraciones
- **Acción**: Implementar un monitor de salud para integraciones (Meta, Wompi, SMTP). Si una API externa falla repetidamente, el sistema entra en "Modo Degradado" con aviso al usuario, en lugar de lanzar errores 500.
- **Resultado**: Estabilidad percibida del 99.9%.

---

## Fase 3: Inteligencia y Gobernanza (Medio Plazo)
*Enfoque: Autogestión y Blindaje Proactivo.*

### 3.1 Auditoría de RLS en Tiempo Real
- **Acción**: Implementar logs de acceso denegado por RLS en Supabase para detectar intentos de "data-leakage" o bugs de permisos proactivamente.
- **Resultado**: Seguridad de grado bancario.

### 3.2 Smoke Tests Automatizados de Facturación
- **Acción**: Crear un suite de pruebas que simule un pago de $10 USD y verifique que el balance del Reseller suba exactamente $2.50 USD (según su regla), ejecutándose cada vez que hay un despliegue.
- **Resultado**: Certeza económica absoluta.

---

## 🛠️ Próximos Pasos Recomendados

Tras la estabilización del núcleo, el siguiente movimiento estratégico es:

1. **Fase 2.1: Sistema de Capacidades (Capabilities Registry)**: Migrar de un sistema rígido de "Verticales" a uno modular basado en capacidades. Esto permitirá activar/desactivar funciones (CRM Avanzado, Automatización, IA) por tenant de forma dinámica.
2. **Auditoría de Smoke Tests de Facturación**: Implementar la verificación automatizada de repartición de ingresos (Reseller vs Platform) ahora que la arquitectura está limpia.
3. **Validación en Entorno Linux/Docker**: Confirmar que el build de producción pasa sin errores en un entorno real de despliegue.

¿Deseas que procedamos con el **Diseño del Systema de Capacidades (Fase 2.1)** o prefieres reforzar la **Seguridad de RLS (Fase 3.1)**?
