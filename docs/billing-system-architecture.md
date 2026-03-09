# Arquitectura del Sistema de Billing - Pixy Platform

Este documento detalla la implementación del sistema de facturación de Nivel 0 (Suscripciones de Plataforma) diseñada para ser ultra-escalable, desacoplada y con cero deuda técnica.

## 1. El Concepto de Dos Capas
Para evitar confusión, el sistema se divide en:
- **Capa 0 (Platform Billing)**: Cobro de Pixy a las Agencias/Organizaciones por el uso del software (Spaces, Módulos). Este es el sistema implementado.
- **Capa 1 (Client Billing)**: Sistema de facturación que las Agencias usan para cobrarle a sus propios clientes finales (Invoicing).

## 2. Infraestructura de Datos
Se introdujo la tabla `saas_subscriptions` para centralizar el control de acceso.

### Tabla: `saas_subscriptions`
| Campo | Tipo | Propósito |
|-------|------|-----------|
| `organization_id` | UUID | Relación 1:1 con la organización. |
| `status` | Enum | `active`, `trialing`, `past_due`, `canceled`, `legacy_manual`. |
| `current_period_end` | Timestamp | Fecha de vencimiento del acceso actual. |
| `payment_gateway` | Enum | `wompi`, `stripe`, `manual`. |
| `gateway_token` | Text | Token de la tarjeta (Wompi) o ID de suscripción (Stripe). |

## 3. Flujo de Automatización (Wompi)
Wompi no soporta suscripciones nativas de forma flexible para nuestro modelo, por lo que se implementó un motor propio:

1.  **Tokenización**: Cuando el usuario paga por primera vez, el webhook captura el `payment_method_id` de Wompi.
2.  **Motor Recurring (Inngest)**: Una función programada en `src/inngest/billing.ts` se ejecuta diariamente.
    - Busca suscripciones activas cuya `current_period_end` sea hoy o menor.
    - Invoca al `WompiSaasAdapter` para realizar un cargo automático.
3.  **Webhook Reconciliation**: Al recibir `APPROVED`, se adelanta el `current_period_end` 30 días automáticamente.

## 4. Integración con Resellers (Cero Deuda)
El sistema está conectado al motor de ingresos existente:
- Cada pago exitoso registra un `Billable Event` de tipo `platform_subscription`.
- El `SettlementsManager` detecta estos eventos y calcula las comisiones para los Resellers automáticamente.
- **Trazabilidad**: Todo pago genera una transacción en `payment_transactions` con metadata { type: 'subscription_payment' }.

## 5. Configuración Global de Pasarelas (SuperAdmin)
Ubicación: **Centro de Mando > SaaS Engine > Pagos**.

El sistema utiliza la tabla `payment_gateway_config` para gestionar las pasarelas activas en la plataforma:
- **Wompi**: Habilitado por defecto para manejar Suscripciones y Facturas.
- **Gestión de Claves**: Las claves públicas se gestionan desde la UI, mientras que las privadas se mantienen en variables de entorno (Vercel) por seguridad.
- **Modo de Ambiente**: El SuperAdmin puede alternar entre Sandbox y Producción de forma global para toda la plataforma.

## 6. Panel de Control de Suscripciones
Ubicación: **Centro de Mando > SaaS Engine > Plataforma**.

- **Visibilidad Total**: Lista de todas las organizaciones y su estado real de suscripción.
- **Acciones Manuales**: Capacidad de "Activar Acceso" manualmente para clientes legacy o excepciones comerciales, evitando bloqueos por fallos técnicos.

## 6. Sincronización de UI
Se eliminaron todos los valores **hardcoded**.
- El **nombre del Space** y el **precio** se obtienen dinámicamente del catálogo de productos.
- Si una organización se cambia de "Resto Space" a "Agency Space", su panel de billing reflejará el nuevo nombre y precio automáticamente.

### 8. Ciclos de Cobro y Precios Pro
- **Multi-Ciclo**: Soporte para `monthly`, `quarterly`, `semi_annual` y `annual`. Inngest calcula la próxima fecha basándose en este campo.
- **Bypass Administrativo**: Campo `bypass_until` que permite omitir cobros automáticos mientras mantiene el acceso activo. Ideal para periodos de cortesía o resolución de disputas.
- **Precios Personalizados**: Prioridad de cobro al campo `custom_price` en `saas_subscriptions` sobre el precio base del producto.

### 9. Experiencia de Usuario (Dashboard)
- **SpaceStatusBadge**: Componente ubicado en el Header que muestra el nombre del Space, días restantes y estado (Activo, Bypass, etc.).
- **Detalle de Plan**: Modal dinámico que lista los beneficios específicos configurados en `saas_apps.features`.
