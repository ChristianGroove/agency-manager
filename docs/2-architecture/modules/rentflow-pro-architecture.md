# RentFlow Pro Architecture: Property Management & Rent Settlements

Este documento detalla la arquitectura técnica, modelo de datos y reglas de negocio del módulo **RentFlow Pro (`module_rentals`)** dentro del **Real Estate Space (`real_estate`)** de Pixy.

---

## 1. Visión General

RentFlow Pro es el motor de gestión de contratos de arrendamiento, control de cobranza mensual a inquilinos y liquidación/dispersión de rentas a propietarios inmobiliarios en Colombia.

### Objetivos Clave
1. **Aislamiento Multi-Tenant Estricto**: Todas las operaciones están protegidas por `organization_id` y RLS a nivel de base de datos.
2. **Cero Impacto en Otros Spaces**: No altera la estructura de tablas compartidas como `service_catalog` ni contamina la UI de agencias, restaurantes, retail o SaaS.
3. **Integración Transparente con el CRM**: Vincula inquilinos y propietarios directamente con el directorio de contactos maestros (`contact_type='client'`).

---

## 2. Modelo de Datos Relacional

### Tabla `public.property_leases`
Almacena los contratos de arrendamiento activos o históricos:
- `id`: UUID (Primary Key).
- `organization_id`: UUID (Foreign Key a `organizations`).
- `property_id`: UUID (Foreign Key a `service_catalog.id`).
- `tenant_id`: UUID (Foreign Key a `leads.id`, Contacto Maestro Inquilino).
- `owner_id`: UUID (Foreign Key a `leads.id`, Contacto Maestro Propietario).
- `co_signer_id`: UUID (Opcional, Codeudor).
- `monthly_rent`: Numeric(12,2) (Canon mensual pactado).
- `admin_fee`: Numeric(12,2) (Cuota de administración del conjunto/edificio).
- `admin_paid_by`: `'agency' | 'tenant'` (Si la agencia recauda y paga la administración o si la asume directamente el inquilino).
- `commission_percentage`: Numeric(5,2) (Porcentaje de comisión de la agencia, defecto: 8.00%).
- `vat_on_commission`: Boolean (Si aplica IVA del 19% sobre la comisión).
- `deposit_amount`: Numeric(12,2) (Depósito en garantía).
- `payment_day`: Integer (Día límite de pago del inquilino, 1-31).
- `payout_day`: Integer (Día pactado de liquidación al propietario, 1-31).
- `start_date` / `end_date`: Date.
- `status`: `'active' | 'pending' | 'expired' | 'defaulted' | 'terminated'`.
- `guarantee_type`: `'direct' | 'insurance' | 'bond' | 'deposit' | 'promissory_note'`.
- `guarantee_details`: JSONB.
- `bank_payout_details`: JSONB (`bank`, `account_type`, `account_number`, `account_holder`, `id_number`).

### Tabla `public.property_lease_settlements`
Almacena el registro financiero mensual y las liquidaciones a propietarios:
- `lease_id`: UUID (Foreign Key a `property_leases`).
- `period`: String (e.g. `"2026-09"`).
- `rent_amount`: Numeric(12,2).
- `admin_fee_amount`: Numeric(12,2).
- `gross_collected`: Numeric(12,2).
- `commission_amount`: Numeric(12,2).
- `vat_amount`: Numeric(12,2).
- `deductions_amount`: Numeric(12,2).
- `net_owner_payout`: Numeric(12,2).
- `tenant_payment_status`: `'pending' | 'paid' | 'partial' | 'late'`.
- `owner_payout_status`: `'pending' | 'paid' | 'held'`.
- `deductions`: JSONB (Lista de deducciones por reparaciones, plomería, servicios, etc. con comprobantes).

---

## 3. Motor de Cálculo Financiero (`settlement-calculator.ts`)

Las fórmulas financieras cumplen con el estándar contable inmobiliario colombiano:

- **Gross Collected** = Canon Mensual + (Admin Fee si la agencia recauda)
- **Commission** = Canon Mensual * (Commission Rate / 100)
- **VAT on Commission** = Commission * 0.19 (si vat_on_commission = true)
- **Total Agency Fee** = Commission + VAT
- **Net Owner Payout** = Canon Mensual - Total Agency Fee - (Admin Fee si la agencia paga) - Deducciones Aprobadas

---

## 4. Flujo de Navegación y UI (`/rentals`)

El espacio de trabajo en `/rentals` cuenta con 3 pestañas principales:
1. **Tab 1: Contratos Activos**: Grid/Lista de contratos con visualización de inmueble, inquilino, propietario, canon y días de pago. Incluye el drawer `LeaseFormSheet` con el diseño flotante estándar de la plataforma.
2. **Tab 2: Control de Cobranza (Inquilinos)**: Semáforo de estado de cobranza (*Al Día*, *Por Vencer*, *En Mora*, *Siniestro Aseguradora*) con recordatorios directos por WhatsApp y registro de pagos.
3. **Tab 3: Liquidaciones a Propietarios**: Libro mayor mensual con desglose de comisión, IVA, deducciones y botón para marcar como pagado y emitir extractos.
