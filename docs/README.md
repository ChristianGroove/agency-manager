# 📚 Documentación de PIXY Agency Manager

Bienvenido al directorio principal de documentación. Hemos estructurado estos documentos en un orden lógico para facilitar la curva de aprendizaje de cualquier desarrollador que se integre al proyecto, desde la visión del producto hasta los detalles arquitectónicos de cada módulo.

## 🧭 Índice de Contenidos

### [1. Producto y Negocio](./1-product/)
Aquí encontrarás el "Qué" y el "Por qué" construimos las cosas.
* **`bible/`**: Contiene la Biblia del Producto, reglas de nomenclatura y la visión general.
* **`features/`**: Especificaciones de producto y características (MVP de flujos, monitoreo, etc.).
* **`roadmap.md`**: La hoja de ruta de escalabilidad y futuras iteraciones.

### [2. Arquitectura de Software](./2-architecture/)
Aquí encontrarás el "Cómo" está diseñado el sistema.
* **`core/`**: Reglas globales, estándares modulares, mapa de bases de datos, UI y arquitectura del SaaS.
* **`modules/`**: Documentación técnica detallada de cada módulo (CRM, Billing, Inbox, Quotes, Automations, Locations, Work Orders, Catalog, Knowledge, Forms, Broadcasts, Resto).
* **`security/`**: Estrategia de seguridad de datos y cumplimiento.

### [3. Desarrollo y Operaciones](./3-development/)
Guías prácticas para el equipo técnico.
* **`development-guide.md` & `hermetic-architecture.md`**: Guías para correr el proyecto en entorno local.
* **`integrations/`**: Manuales de conexión de Webhooks, configuración de WhatsApp/Meta API y ejemplos de metadatos.
* **`operations/`**: Manuales de operaciones como la creación de nuevos espacios (tenants).

### [4. Histórico y Auditorías (Archive)](./4-history/)
Archivos que sirven de bitácora pero que no interfieren con el desarrollo activo.
* **`audits/`**: Reportes pasados sobre estabilización, reportes de salud de la arquitectura y auditorías de código.
* **`migrations/`**: Reportes sobre migraciones pasadas (ej. la refactorización a espacios SaaS, correcciones organizacionales).

---

> [!TIP]
> **Para nuevos desarrolladores (Devs Junior):**
> 1. Inicia leyendo la **Biblia del Producto** (`1-product/bible/`).
> 2. Pasa a los estándares de **Arquitectura Core** (`2-architecture/core/`) para entender cómo organizamos el código.
> 3. Finalmente, revisa la **Guía de Desarrollo** (`3-development/development-guide.md`) para levantar tu entorno local.
