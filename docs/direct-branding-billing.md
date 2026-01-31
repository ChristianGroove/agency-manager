# Sistema de Cobro Directo de Branding Total (White Label)

Este documento describe la arquitectura y el flujo de implementación para que los Clientes (hijos de Resellers) puedan pagar directamente a Pixy por upgrades de branding, automatizando la activación y el reparto de comisiones.

## 🏗️ Arquitectura de Cobro

### 1. Modelo de Negocio
- **Costo**: $99 USD/mes (Tier White Label).
- **Procesador**: Wompi (Cuenta Global de Pixy).
- **Incentivo Reseller**: El sistema detecta automáticamente al Reseller padre y le acredita su comisión (25%/15%/10% según fase) a través del sistema de **Revenue Share**.

### 2. Flujo Técnico

#### A. Dashboard del Cliente
- Si el cliente no tiene el tier `whitelabel`, se habilitan botones de upgrade en `BrandCenter`.
- El componente `DirectUpgradeButton` invoca la Server Action `createBrandingUpgradeTransaction`.
- Se genera un registro en `payment_transactions` con la referencia `BRAND-UPGRADE-{ORG_ID}-{TIMESTAMP}`.

#### B. Checkout y Widget
- Se utiliza la llave pública global de Pixy: `NEXT_PUBLIC_WOMPI_PUBLIC_KEY`.
- El widget de Wompi procesa el pago y redirecciona al cliente.

#### C. Webhook de Fulfullment (`/api/wompi/webhook`)
Cuando el estado de la transacción es `APPROVED`:
1. **Detección**: Identifica el prefijo `BRAND-UPGRADE-`.
2. **Activación**: Llama a `performBrandingUpgrade` (en `tier-actions.ts`) para subir el nivel de branding instantáneamente.
3. **Revenue Share**: Llama a `registerBillableEvent` (en `revenue/actions.ts`) para registrar el ingreso a favor del Reseller padre.

## 🛠️ Archivos Clave
- `src/modules/core/branding/billing-actions.ts`: Gestión de transacciones de upgrade.
- `src/modules/core/branding/components/direct-upgrade-button.tsx`: Componente de checkout.
- `src/app/api/wompi/webhook/route.ts`: Handler de activación automática.
- `src/modules/core/branding/tier-actions.ts`: Lógica core de cambio de tiers.

## ⚠️ Consideraciones de Mantenimiento
- **Inmutabilidad**: Nunca cambiar manualmente el `acquired_by_reseller_id` de una organización, ya que de esto depende el pago automático al reseller.
- **Credenciales**: El sistema de cobro directo usa las credenciales de Pixy del `.env`, a diferencia de los cobros de facturas normales que pueden usar las credenciales de la Agencia.
