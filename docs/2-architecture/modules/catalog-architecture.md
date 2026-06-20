# Arquitectura del Módulo de Catálogo (Catalog)

Este documento detalla la estructura y capacidades del módulo de Catálogo (`catalog`).

## 1. Visión General
El módulo de Catálogo permite a las organizaciones definir los productos o servicios que ofrecen. Es la fuente de verdad central que alimenta las cotizaciones, la facturación y las órdenes de trabajo, garantizando consistencia en los precios y descripciones en toda la plataforma.

## 2. Modelo de Datos Central
Las entidades principales son las categorías y los ítems del catálogo.

### Tabla: `service_categories`
| Campo | Tipo | Propósito |
|-------|------|-----------|
| `id` | UUID | Identificador de la categoría. |
| `organization_id` | UUID | Aislamiento por Tenant. |
| `name` | Text | Nombre de la categoría (ej: "Mantenimiento", "Software"). |

### Tabla: `service_catalog`
| Campo | Tipo | Propósito |
|-------|------|-----------|
| `id` | UUID | Identificador único del servicio/producto. |
| `organization_id` | UUID | Aislamiento por Tenant. |
| `category_id` | UUID | Referencia a `service_categories`. |
| `name` | Text | Nombre comercial del ítem. |
| `description` | Text | Descripción detallada. |
| `price` | Numeric | Precio base del servicio/producto. |
| `image_url` | Text | (Opcional) URL de la imagen representativa en el Storage. |

## 3. Patrones de Diseño Implementados

### A. Server Actions de Dominio
- **`actions.ts`**: Gestiona el CRUD principal de los ítems del catálogo (`service_catalog`).
- **`categories-actions.ts`**: CRUD separado para gestionar la taxonomía y agrupación visual de los servicios.
- **`image-actions.ts`**: Integración con Supabase Storage (bucket `catalog_images`) para la carga y actualización de imágenes manuales.

### B. Funcionalidades Premium / AI (`ai-actions.ts`)
El módulo incluye un generador de imágenes integrado que permite a las organizaciones crear fotos de producto profesionales de forma automática utilizando **DALL-E 3**.
- **Control de Cuotas**: Implementa un límite de 5 generaciones de imágenes por día por organización, validado directamente contra la tabla `ai_image_generation_logs`.
- **Ingeniería de Prompts**: Añade contexto automáticamente para que DALL-E produzca imágenes en estilo "Minimalist studio lighting, high resolution".

### C. Importador de Plantillas
- Contiene un `template-importer.tsx` para ayudar al "onboarding" de nuevas cuentas, permitiéndoles poblar rápidamente su catálogo basándose en plantillas predefinidas según su vertical de negocio.

## 4. Dependencias y Relacionamiento
- **Órdenes de Trabajo (`work-orders`)**: Dependen de los IDs de este catálogo para determinar qué servicio se prestará.
- **Cotizaciones (`quotes`)**: Los ítems de una cotización son reflejos de los precios definidos en este módulo.
- **Facturación (`billing`)**: Generación de facturas.
