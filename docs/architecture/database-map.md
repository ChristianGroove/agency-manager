# Mapa de Arquitectura de Base de Datos (Supabase)

Este documento describe la estructura de datos central del sistema, identificando las tablas "Hub", agrupaciones por dominio y las relaciones transversales que garantizan la integridad multi-tenant.

---

## 1. Tablas del Sistema (Hubs)

Las tablas Hub son aquellas que sirven como punto de unión para múltiples dominios o que contienen el identificador raíz para el aislamiento de datos.

| Tabla | Dominio | Propósito |
|---|---|---|
| `organizations` | **Core** | El pilar central del sistema. Todo dato operativo debe pertenecer a una organización. |
| `leads` | **CRM** | Entidad de contacto unificada. Tras la consolidación, centraliza clientes, prospectos y socios. |
| `conversations` | **Messaging** | El buzón de entrada. Agrupa mensajes de múltiples canales y los vincula a `leads`. |
| `users` | **Auth** | Referencia de identidad global (`auth.users`) vinculada a perfiles y membresías. |

---

## 2. Agrupación por Dominios (Ownership)

### Dominio: CRM & Entidades
- `leads`: Registro principal de entidades externas.
- `contacts`: Versión simplificada o secundaria de contactos.
- `pipelines` / `pipeline_stages`: Definición de procesos de venta.
- `deals`: Oportunidades comerciales vinculadas a un lead y etapa.
- `client_categories`: Clasificación de lealtad y nicho.

### Dominio: Mensajería (Omni-Channel)
- `messages`: Registro individual de chats (texto, archivos).
- `channels`: Conexiones técnicas (Meta APIs, WhatsApp).
- `broadcasts`: Envíos masivos a listas de difusión.
- `sender_profiles`: Identidades de agentes o bots que responden.

### Dominio: Facturación & SaaS
- `invoices`: Documentos comerciales de cobro.
- `quotes`: Documentos de propuesta económica.
- `payment_transactions`: Registro de transacciones en pasarela.
- `subscriptions`: Estado de la relación SaaS entre la Organización y Pixy.
- `plans` / `limits`: Definición técnica del nivel de servicio.

### Dominio: Automatización
- `workflows`: Definición de lógica condicional (disparadores → acciones).
- `workflow_jobs`: Cola de ejecución de tareas asíncronas.
- `automation_rules`: Filtros de lógica directa (ej. auto-reply).

---

## 3. Relaciones Transversales Críticas

1. **Aislamiento Global (`organization_id`)**: Casi todas las tablas del esquema `public` poseen una clave foránea hacia `organizations`. Las políticas de RLS dependen de este campo para evitar fugas de datos entre inquilinos.
2. **El Eje del Cliente (`lead_id`)**: La tabla `leads` es el conector natural entre **Messaging** (conversaciones), **Billing** (facturas) y **CRM** (oportunidades). Cualquier acción del sistema suele "aterrizar" en el registro de un lead.
3. **Identidad del Agente (`user_id`)**: Vincula las acciones del personal (mensajes enviados, facturas creadas) con su perfil de usuario dentro de una organización específica.

---

## 4. Riesgos de Arquitectura en Datos

- **Densidad de `leads`**: Dada la consolidación de `clients` en `leads`, esta tabla se ha convertido en un punto único de falla y objeto de alta contención de bloqueos.
- **Crecimiento de `messages`**: El registro de mensajes carece de una estrategia de archivado o particionamiento evidente en el esquema actual, lo que podría degradar el rendimiento con el tiempo.
- **Dependencia de `public.clients` (Legacy)**: Aunque se está migrando a `leads`, todavía existen referencias residuales que podrían causar inconsistencias si no se eliminan por completo.
