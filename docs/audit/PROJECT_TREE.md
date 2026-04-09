# MAPA ESTRUCTURAL TOTAL (Pixy)

Este documento representa la jerarquía absoluta de carpetas del repositorio Pixy. No se han omitido directorios con el fin de proporcionar un diagnóstico de "verdad absoluta".

## 1. Raíz del Repositorio (/)
Contiene la configuración global del proyecto y las capas de soporte.

- **Configuración y Build**
  - `.env.example`, `.env.local`, `.env.production`: Variables de entorno.
  - `package.json`, `package-lock.json`: Gestión de dependencias y scripts.
  - `next.config.ts`: Configuración de Next.js.
  - `tsconfig.json`, `tsconfig.tsbuildinfo`: Configuración de TypeScript.
  - `vitest.config.ts`: Configuración de pruebas unitarias.
  - `vercel.json`: Configuración de despliegue en Vercel.
  - `postcss.config.mjs`, `eslint.config.mjs`: Configuración de estilos y linting.
  - `next-env.d.ts`: Tipados de entorno Next.js.
- **Soporte y Auditoría (Archivos .md)**
  - `AI_COMPLIANCE_AUDIT.md`: Auditoría de cumplimiento de IA.
  - `DATA_SECURITY_STRATEGY.md`: Estrategia de seguridad de datos.
  - `DOC_AGENT_MONITORING.md`: Monitoreo del agente de documentación.
  - `FLOWS_MVP_SPEC.md`: Especificación del MVP de flujos.
  - `INTEGRATION_MANUAL.md`: Manual de integraciones.
  - `NOMENCLATURE.md`: Reglas de nomenclatura del sistema.
  - `PORTAL_METADATA_EXAMPLES.md`: Ejemplos de metadatos del portal.
  - `PRODUCT_VISION_FLOWS.md`: Visión de producto del motor de flujos.
  - `PWA_STATUS.md`: Estado de la aplicación web progresiva (PWA).
  - `SECURITY_STANDARDS.md`: Estándares de seguridad.
  - `SMOKE_TEST_README.md`: Guía de pruebas de humo.

## 2. Carpetas de Soporte e Infraestructura

### /infrastructure (Despliegue y Entorno)
- `docker/`: (Si existe, contenerización).
- `scripts/`: Scripts de despliegue automatizado.

### /supabase (Persistencia y Backend-as-a-Service)
- `migrations/`: Historial completo de cambios en el esquema de base de datos.
- `_manual_scripts/`: Scripts SQL o JS para mantenimiento manual de datos/esquema.

### /scripts (Mantenimiento y Herramientas del Desarrollador)
Contiene herramientas internas para tareas repetitivas y pruebas de validación rápida.
- `archived/`: Scripts en desuso (ej. `verify_voice_assistant.ts`).
- `perf/`: Scripts de análisis de performance y creación de índices SQL.
- `cleanup-workspace.ts`: Script para limpiar el entorno local.
- `publish-flows.ts`: Script para publicar flujos en producción.
- `setup-calling.ts`: Configuración del sistema de llamadas.
- `verify-bridge.ts`, `verify-permissions.ts`, `verify_activation.ts`, etc.

### /docs (Repositorio de Conocimiento)
- `architecture/`: Documentación de diseño original (Modularización, Maps).
- `audit/`: **[UBICACIÓN ACTUAL]** Reportes de auditoría técnica 2026.

### /bible (Referencia)
- Actualmente contiene subdirectorios/archivos de referencia para el equipo.

### /public (Assets)
- `images/`, `icons/`, `fonts/`: Recursos estáticos de la aplicación.

---

## 3. Código Fuente (/src)

### /src/app (Estructura de Rutas)
- `(auth)/`: Rutas de entrada (Login, Register).
- `(dashboard)/`: El núcleo de la aplicación de gestión.
- `(public)/`: Landings y Portal del cliente.
- `api/`: Endpoints de servidor (Webhooks, Integraciones).
- `auth/`: Lógica adicional de sesión.
- `data-deletion/`, `privacy-policy/`, `terms-of-service/`: Rutas legales.
- `onboarding/`: Primeros pasos del usuario.
- `globals.css`: Estilos globales de la aplicación.
- `layout.tsx`, `loading.tsx`, `page.tsx`: Entry points raíz.

### /src/components (Biblioteca Visual)
Lista exhaustiva de contenedores de componentes:
`account`, `admin`, `animate-ui`, `assistant`, `auth`, `dashboard`, `email`, `guards`, `integrations`, `layout`, `marketing`, `meta`, `onboarding`, `organizations`, `portal`, `portals`, `providers`, `shared`, `sheets`, `ui`.

### /src/modules (Capa de Lógica)
`admin`, `assistant`, `auth`, `billing`, `core`, `custom`, `features`, `flows`.

#### Detalle de /src/modules/core (34 Submódulos reales)
`admin`, `ai`, `ai-engine`, `apps`, `audit`, `auth`, `automation`, `backup`, `branding`, `broadcasts`, `caa`, `channels`, `communication`, `dashboard`, `data-vault`, `domains`, `iam`, `integrations`, `knowledge`, `layout`, `lifecycle`, `logging`, `messaging`, `notifications`, `organizations`, `payments`, `preferences`, `revenue`, `saas`, `settings`, `storage`, `tools`, `trash`, `usage`.

#### Detalle de /src/modules/features (Verticales)
`attendance`, `billing`, `catalog`, `crm`, `forms`, `hosting`, `locations`, `marketing`, `portal`, `quotes`, `resto`, `work-orders`.

### /src/lib (Infraestructura Técnica)
`ai`, `audio`, `auth`, `data`, `email`, `i18n`, `inngest`, `integrations`, `meta`, `permissions`, `security`, `state-engine`, `utils`.

---
*Este mapa representa la realidad absoluta del repositorio al cierre de la auditoría.*
