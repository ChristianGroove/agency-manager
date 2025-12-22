# Nomenclatura del Sistema

Este documento define la terminología usada en diferentes capas del sistema para evitar confusiones durante el desarrollo.

## Capa Backend / Base de Datos

**Término técnico: `services`**
- Tabla: `services` (servicios contratados por clientes)
- Tabla: `service_catalog` (plantillas de servicios ofrecidos)
- Funciones: `addService()`, `deleteService()`, `updateService()`
- **NO CAMBIAR** - Estos son nombres técnicos estables

## Capa Frontend - Panel Admin

### Módulo: `/hosting` (Contratos)
**UI Display: "Contratos"**
- **Concepto:** Servicios YA vendidos/contratados a clientes
- **Descripción:** "Servicios contratados y proyectos en curso de tus clientes"
- **Nav Label:** "Contratos"
- **Botones:** "Nuevo Contrato", "Pausar Contrato", "Eliminar Contrato"
- **Mensajes:** "Contrato eliminado", "Cargando contratos..."

#### Archivos clave:
- `src/app/(dashboard)/hosting/page.tsx`
- `src/components/layout/sidebar.tsx`

### Módulo: `/portfolio` (Catálogo)
**UI Display: "Catálogo"**
- **Concepto:** Plantillas/oferta de servicios que la agencia ofrece
- **Descripción:** "Servicios y plantillas de briefing que ofrece tu agencia"
- **Nav Label:** "Catálogo"
- **Botones:** "Nuevo Servicio" (correcto, es una plantilla)

#### Archivos clave:
- `src/app/(dashboard)/portfolio/page.tsx`
- `src/components/layout/sidebar.tsx`

### Vista de Cliente Individual
**UI Display: "Contratos"**
- Insight card muestra cantidad de "Contratos" del cliente
- Sección "Servicios Activos & Facturación" (mantiene "servicios" por contexto)

#### Archivos clave:
- `src/app/(dashboard)/clients/[id]/page.tsx`

## Capa Frontend - Portal Cliente

### Módulo: Servicios del Cliente
**UI Display: "Mis Servicios"** (recomendado)
- **Concepto:** Los servicios que ESE cliente tiene contratados con la agencia
- **Descripción:** "Tus servicios activos con nosotros"
- **Usuario:** Cliente final (no admin)
- **Lenguaje:** Más amigable, menos formal que "Contratos"

#### Archivos clave:
- `src/app/(public)/portal/[token]/page.tsx`

## Resumen Rápido

| Contexto | Término UI | Significado |
|----------|-----------|-------------|
| **Backend** | `services` | Término técnico (NO cambiar) |
| **Admin: /hosting** | "Contratos" | Servicios vendidos/activos |
| **Admin: /portfolio** | "Catálogo" | Oferta de servicios |
| **Admin: Cliente Detail** | "Contratos" | Servicios del cliente |
| **Portal Cliente** | "Mis Servicios" | Sus contratos activos |

## Reglas para Desarrollo

1. **Backend/DB:** Siempre usar `services` (técnico)
2. **Admin UI:** Usar "Contratos" para instancias vendidas, "Catálogo" para oferta
3. **Portal Cliente:** Usar "Mis Servicios" (user-friendly)
4. **Comentarios:** Siempre documentar cuando uses estos términos en código nuevo

## Ejemplo de Comentario en Código

```typescript
// NOMENCLATURA: "Contratos" en UI = servicios vendidos (tabla: services)
const contracts = await fetchServices()

// NOMENCLATURA: "Catálogo" en UI = plantillas de servicios (tabla: service_catalog)
const serviceCatalog = await fetchServiceTemplates()
```
