# Mapa de Arquitectura de Base de Datos (Supabase)

Este documento describe la estructura de datos central del sistema, identificando las tablas "Hub", agrupaciones por dominio y las relaciones transversales que garantizan la integridad multi-tenant.

---

## 1. Tablas del Sistema (Hubs)

Las tablas Hub son aquellas que sirven como punto de unión para múltiples dominios o que contienen el identificador raíz para el aislamiento de datos.

| Tabla | Dominio | Propósito |
|---|---|---|
| `organizations` | **Core** | El pilar central del sistema. Todo dato operativo debe pertenecer a una organización. |
| `leads` | **CRM** | Entidad unificada para la Agenda Maestra (`client`) y Tarjetas de Pipeline (`lead`). Soporta recursividad vía `master_contact_id`. |
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
2. **Estrategia de Borrado (`deleted_at`)**: Estandarización de soft-delete en `leads`, `quotes`, `invoices` y `briefings`. Esto alimenta la Papelera de Reciclaje centralizada.
3. **El Eje del Cliente (`lead_id` / `master_contact_id`)**: La tabla `leads` es el conector natural entre **Messaging** (conversaciones), **Billing** (facturas) y **CRM** (oportunidades). La recursividad permite que un "Master Contact" agrupe múltiples historiales de negocio.
4. **Identidad del Agente (`user_id`)**: Vincula las acciones del personal (mensajes enviados, facturas creadas) con su perfil de usuario.

---

## 4. Riesgos de Arquitectura en Datos

- **Densidad de `leads`**: Tras la consolidación, esta tabla es el punto único de falla. Se han implementado índices parciales y una Capa de Seguridad de Identidad para mitigar riesgos de borrado accidental y colisiones de datos.
- **Crecimiento de `messages`**: El registro de mensajes carece de una estrategia de archivado o particionamiento, lo que podría degradar el rendimiento con el tiempo.
- **Transición de `clients` (Legacy)**: Se ha completado la migración lógica a la tabla `leads` mediante el discriminador `contact_type='client'`. Las tablas residuales deben ser removidas físicamente para higiene total del esquema.
