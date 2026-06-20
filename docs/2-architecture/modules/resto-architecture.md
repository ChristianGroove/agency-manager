# Arquitectura del Módulo de Restaurantes (Resto)

Este documento detalla la arquitectura técnica del módulo especializado para restaurantes y hospitalidad (`resto`).

## 1. Visión General
El módulo "Resto" es una especialización de la plataforma SaaS enfocada en el sector gastronómico. Permite a las organizaciones gestionar visualmente el plano de su restaurante, controlar el estado de las mesas, administrar sesiones de consumo (comensales) y facilitar pedidos vía códigos QR.

## 2. Modelo de Datos Central

El sistema opera sobre un modelo relacional de tres niveles físicos y temporales:

### Tabla: `resto_zones` (Zonas)
Define los espacios físicos del restaurante (ej: Terraza, Salón Principal, VIP).
- `grid_width` / `grid_height`: Dimensiones del lienzo virtual en el editor de planos.
- `visual_elements` (JSONB): Permite renderizar elementos decorativos o estructurales (muros, plantas, barras) en el plano.

### Tabla: `resto_tables` (Mesas)
Instancias interactivas dentro de una zona.
- `table_identifier`: Número o nombre de la mesa.
- `capacity`: Capacidad de comensales.
- Geometría: `shape` (cuadrada, redonda), `pos_x`, `pos_y`, `width`, `height`, `rotation`.
- `status`: Estado actual (`available`, `occupied`, `reserved`, etc.).
- `qr_token`: Token único autogenerado en BD para acceso a menús o pedidos desde la mesa.

### Tabla: `resto_table_sessions` (Sesiones)
Almacena la historia clínica de un servicio en una mesa.
- Registra cuándo se abre la mesa (`opened_at`), quién la abre (`opened_by`), la cantidad de comensales (`guest_count`) y el cierre de la misma.

## 3. Patrones de Diseño Implementados

### A. Persistencia Geométrica (Layout Editor)
El archivo `tables/actions.ts` contiene el motor de guardado del plano visual:
- **Batched Upserts**: La acción `saveLayout` guarda simultáneamente la metadata de la zona y un array de mesas. Separa eficientemente las mesas nuevas (`temp_` prefix) de las existentes para realizar `insert` y `update` por lotes, previniendo cuellos de botella al guardar planos complejos de más de 50 mesas.

### B. Tokens Desacoplados (QR)
En lugar de depender del UUID largo de la mesa para la vista del cliente (escaneo QR), la base de datos genera un `qr_token` hexadecimal corto mediante `extensions.gen_random_bytes(12)`. Esto mejora la estética de las URLs y añade seguridad ofuscando IDs internos.

## 4. Dependencias y Relacionamiento
- **Catálogo (`catalog`)**: El módulo Resto leerá los ítems (platillos) directamente desde el catálogo universal de la plataforma.
- **Cotizaciones / Facturación**: Las comandas generadas en una sesión de mesa (`resto_table_sessions`) se traducirán en facturas finales integrándose con el módulo de `billing`.
