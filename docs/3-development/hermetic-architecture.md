# Arquitectura de Desarrollo Hermético (Pixy Local)

Este documento describe la infraestructura de seguridad implementada para permitir el desarrollo con datos de alta fidelidad (clon de producción) sin riesgo de afectar el entorno real.

## 1. El Concepto de "Hermeticidad"
El entorno se considera **hermético** porque, si bien los datos de negocio son reales, los **puntos de comunicación (Endpoints)** son 100% locales. La aplicación se comunica exclusivamente con la infraestructura dentro de tu Docker.

## 2. Aislamiento de Capas

### Capa de Base de Datos
- **Instancia**: Base de datos local ejecutándose en Docker (Supabase CLI).
- **Endpoint**: `127.0.0.1:54321` (URL local gestionada por Supabase).
- **Seguridad**: El servidor local no tiene configurada la replicación hacia la nube. Cualquier cambio (`INSERT`, `UPDATE`, `DELETE`) permanece dentro del contenedor Docker.

### Capa de Autenticación (Auth)
- **Instancia**: GoTrue local.
- **Secretos**: Se utilizan la `ANON_KEY` y `SERVICE_ROLE_KEY` generadas por el CLI local (visibles con `supabase status`).
- **JWT**: Las firmas de los tokens JWT solo son válidas dentro del entorno local. Un token generado en local no tiene validez en producción y viceversa.

## 3. Gestión de Secretos (`.env.local`)

El archivo `.env.local` es el corazón de esta arquitectura y se divide en dos secciones críticas:

| Sección | Origen | Propósito |
| :--- | :--- | :--- |
| **Infraestructura Local** | `supabase status` | Apunta a DB, Auth, Storage y Redis locales. |
| **Integraciones Externas** | Producción | Permite probar envíos de Email (Resend), Pagos (Wompi) o Meta Ads usando llaves reales, pero dirigiendo el flujo lógico a tu código local. |

## 4. Verificación de Seguridad
Para garantizar que estás en modo seguro, verifica siempre que:
1. El archivo `.env.local` tenga `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`.
2. Las llaves de Supabase NO correspondan a las de producción (las locales suelen empezar por `sb_...` según la versión).

> [!CAUTION]
> **Regla de Oro**: Nunca copies datos de `.env.production` a `.env.local` de forma masiva sin verificar que los Endpoints de Supabase permanezcan en `127.0.0.1`.
