# 🗺️ PIXY SCALABILITY ROADMAP: El Camino a la Perfección Blindada

Este documento detalla la estrategia por fases para transformar a Pixy en un producto técnicamente blindado y empresarialmente escalable, corrigiendo las inconsistencias detectadas sin interrumpir las operaciones actuales.


## Fase 0: Estabilización y Blindaje Arquitectónico (✅ COMPLETADO)
*Enfoque: Eliminar deuda técnica, normalizar dependencias y asegurar cumplimiento de Next.js 16.1.*

- **Normalización de Dependencias**: Resolución de 17 dependencias circulares y consolidación de acciones en capas atómicas (`actions/`, `services/`, `hooks/`).
- **Seguridad "Use Server"**: Aislamiento total de lógica de servidor (DB/Metadata) mediante directivas estrictas en 100+ archivos clave.
- **Modernización de Middleware**: Migración de `proxy.ts` al estándar Next.js 16.1.1 para enrutamiento multi-tenant robusto.
- **Recuperación de Integridad**: Restauración de definiciones críticas de nodos de automatización y servicios de IA.

---

## Fase 1: Sanitización Modular y Saneamiento del Core (🚀 PRÓXIMO PASO)
*Enfoque: Desacoplar funcionalidades del motor SaaS y categorizar dominios.*

- **Migración de Dominios**: Mover módulos funcionales (`messaging`, `automation`, `tools`, `integrations`) del Core hacia la capa de `features/`.
- **Extracción de Infraestructura**: Crear `src/modules/infrastructure` para servicios transversales (Logging, Data-Vault, Storage).
- **Hardening del Motor**: Reducir el Core a <10 carpetas esenciales (Auth, Orgs, IAM, SaaS Engine).
- **Mapeo de Capacidades**: Preparar la estructura para que los SPACES activen Features en lugar de depender de la vertical hardcodeada.

---

## Fase 2: Abstracción y Resiliencia (Corto Plazo)
*Enfoque: Dejar de ser una "App de Agencias" para ser una "Plataforma de Verticales".*

### 2.1 Sistema de Capacidades (Capabilities vs. Verticals)
- **Acción**: Eliminar los `if (vertical === 'agency')`.
- **Acción**: Crear un `CAPABILITIES_REGISTRY`. Las rutas y lógica se activan por flags (ej: `has_advanced_crm`, `has_white_label`, `has_automation`).
- **Resultado**: Pixy puede lanzar verticales de "Salud", "Real Estate" o "Legal" en días, no en meses.

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
