# 🏛️ Estándares Modulares de Pixy: Core, Features e Infraestructura

Este documento define la jerarquía y las reglas de organización del código para transformar a Pixy en una plataforma modular y altamente escalable.

---

## 1. Categorías de Organización

Para mantener un entorno libre de deuda técnica y acoplamiento circular, todo código debe pertenecer a una de estas tres categorías:

### A. MOTOR (Core Engine)
Es el "Sistema Operativo" de Pixy. Sin estas carpetas, la plataforma no puede arrancar ni gestionar usuarios.
- **Propósito**: Gestión de identidad, multitenancy, seguridad base y lógica de plataforma SaaS.
- **Ubicación**: `src/modules/core/`
- **Ejemplos**: `auth`, `iam` (permisos), `organizations` (tenants), `saas` (billing de plataforma), `layout`.
- **Regla**: El Core **nunca** puede depender de una Feature.

### B. CAPACIDADES (Domain Features)
Son los "Módulos de Negocio" opcionales. Todo lo que es monetizable y opcional para el cliente vive aquí.
- **Propósito**: Resolver problemas específicos del usuario (CRM, Chat, Automatización).
- **Ubicación**: `src/modules/features/`
- **Ejemplos**: `crm`, `messaging`, `automation`, `resto`, `quotes`.
- **Regla**: Deben ser lo más independientes posible. Se activan mediante el "Capabilities Registry".

### C. INFRAESTRUCTURA (Technical Services)
Servicios técnicos transversales que dan soporte tanto al Motor como a las Features.
- **Propósito**: Utilidades de bajo nivel, conectores de API y servicios de persistencia técnica.
- **Ubicación**: `src/modules/infrastructure/`
- **Ejemplos**: `logging`, `storage`, `data-vault`, `ai-engine`, `integrations`.
- **Regla**: Deben ser agnósticos a la lógica de negocio.

---

## 2. Definición de Conceptos Operativos

- **MÓDULO (Dominio)**: Una carpeta de alto nivel (ej: `messaging`). Contiene toda la lógica de un dominio de negocio.
- **FEATURE (Capacidad)**: Funcionalidad específica dentro de un módulo que se puede prender/apagar (ej: `smart_replies`).
- **SPACE (Preset)**: Configuración predefinida de múltiples *Features* para una industria (ej: `Agency Space` activa CRM + Messaging).

---

## 3. Reglas de Implementación

1. **Aislamiento de Servidor**: Todo archivo que realice operaciones de DB o lectura de headers debe usar `"use server"`.
2. **Jerarquía de Importación**: 
   - `Core` puede importar de `Infrastructure`.
   - `Features` pueden importar de `Core` e `Infrastructure`.
   - `Core` **NUNCA** importa de `Features`.
3. **Aggregators**: Usar archivos `*-actions.ts` atómicos para exponer funcionalidades al cliente, evitando carpetas `actions/index.ts` si causan circularidad.

## 4. Patrones de Alto Desempeño y Seguridad (Enterprise Grade)

### A. Capa de Infraestructura (Integraciones)
- **Resiliencia**: Todas las llamadas externas deben estar envueltas en un `CircuitBreaker` (`globalCircuitBreaker`) para evitar fallos en cascada.
- **Eficiencia (Token Caching)**: Para integraciones con APIs externas (ej: Meta Graph API), se debe implementar un mecanismo de caché en memoria (Singleton/Map) para evitar latencia duplicada en cada request.
- **Seguridad**: Las credenciales sensibles deben ser decodificadas lo más tarde posible y nunca exponerse en logs.

### B. Capa de Datos (Seguridad Certificada)
- **RLS (Row Level Security)**: Toda tabla nueva debe nacer con RLS activado. Las políticas deben validar pertenencia a la organización vía `organization_members`.
- **Global Catalogues**: Las tablas de catálogo global (ej: `service_catalog`) deben ser de solo lectura para usuarios y protegidas por rol `platform_admin`.

---
**Estado**: Certificación Platinum (Enterprise Ready) - 10 de Abril, 2026.
