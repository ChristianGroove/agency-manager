# CRM Architecture: Master Contacts (Entity Safety)

Esta documentación detalla la arquitectura de **"Contactos Maestros"** (Master Contacts) implementada para resolver problemas de integridad de datos y duplicidad visual en el CRM.

## El Problema: "Leads vs Clientes"
Anteriormente, el sistema no distinguía físicamente entre un "Lead" (una oportunidad en el embudo) y un "Cliente" (un contacto en la agenda). Esto causaba dos problemas graves:
1. **Duplicidad en UI**: Los selectores de clientes (en Hosting, Cotizaciones, etc.) mostraban el mismo nombre múltiples veces si el contacto tenía varios leads en el pipeline.
2. **Riesgo de Borrado**: Si se limpiaba el embudo de ventas eliminando leads viejos, se borraba accidentalmente el contacto maestro del cliente, perdiendo su historial en otros módulos.

---

## La Solución: Contactos Maestros

### 1. Discriminador `contact_type`
La tabla `public.leads` funciona ahora como una entidad unificada con un discriminador obligatorio:
- `client`: **Contacto Maestro (Agenda)**. Es el registro persistente que contiene la identidad real del cliente (NIT, Dirección, Email oficial).
- `lead` / `prospect`: **Tarjeta de Pipeline (Negocio)**. Es una oportunidad transaccional en el embudo de ventas.

### 2. Relación `master_contact_id` y Limpieza Pipeline
Se introdujo una relación de auto-referencia en la tabla `leads`:
- Cada `lead` de pipeline puede (y debe) apuntar a un **Master Contact** (`contact_type='client'`) mediante el campo `master_contact_id`.
- **Protección de Datos**: Al realizar un borrado de leads (limpieza de pipeline), el sistema ahora distingue estos registros. Borrar un `lead` no afectará al registro `client` maestro, preservando la identidad, facturas y configuraciones de hosting asociadas.

### 3. Blindaje en la Capa de Servicios (3-Layers)
Para evitar errores futuros de integridad, se ha estandarizado el acceso a datos:
- **RPC `get_paginated_leads`**: Es la fuente única de verdad para el Kanban y Listas. Soporta el parámetro `p_contact_type` para filtrar entre prospectos y clientes.
- **Repositorios**:
    - `LeadsRepository`: Pasa automáticamente filtros para mostrar solo `lead` y `prospect`.
    - `ContactRepository`: Filtra estrictamente por `contact_type = 'client'`.
- **Servicios de Módulo (Quotes/Hosting/Billing/Briefings)**: Todos deben usar la función `getContactOptions()` que invoca al repositorio de contactos con el filtro de cliente activo. Esto elimina la duplicidad de nombres en los selectores.

---

## Gestión de Borrados: La Papelera (Trash Bin)

El sistema utiliza un mecanismo de **Eliminación Suave (Soft-Delete)**:
- Los registros no se borran físicamente al primer clic; se marca el campo `deleted_at`.
- **Papelera Multi-Módulo**: Centraliza elementos de Clientes, Organizaciones, Briefings, Cotizaciones y Facturas.
- **Gestión Masiva**: Permite seleccionar múltiples elementos para restaurar o purgar de golpe.
- **Vaciar Papelera**: Realiza un borrado físico (`HARD DELETE`) de todos los registros con `deleted_at` para liberar espacio y limpiar la base de datos de forma irreversible.

---

## Reglas de Oro para Desarrolladores

> [!CAUTION]
> **NUNCA** hagas una consulta directa a la tabla `leads` desde un componente de UI sin filtrar por `contact_type`. Si necesitas una lista de clientes para un selector, usa siempre las **Server Actions** del módulo correspondiente (ej: `getContactOptionsAction`).

> [!IMPORTANT]
> **LIMPIEZA DE PIPELINE**: Siempre que se realice un barrido o limpieza de leads viejos, filtrar estrictamente por `contact_type != 'client'`. El uso de `master_contact_id` es obligatorio para vincular oportunidades a la agenda sin duplicar la identidad del cliente.

---

## Flujo de Datos Recomendado (Safety First)
1. El usuario crea un **Contacto Maestro** en la Agenda (`contact_type='client'`).
2. Cuando surge una oportunidad, se crea un **Lead** (`contact_type='lead'`) vinculado al `master_contact_id` de ese cliente.
3. El Pipeline avanza el Lead. Los módulos de Hosting/Cotizaciones consumen los datos del **Master Contact** para asegurar consistencia.
