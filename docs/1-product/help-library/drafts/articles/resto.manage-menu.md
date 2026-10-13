---
schema_version: 1
id: resto.manage-menu
title: Administrar el menú digital, categorías y horarios de restaurante
module: resto
status: draft
audience: tenant-user
source_revision: 047fa7ee0cadc0f49d9ce08220f633885b0801a7
verified_on: 2026-10-12
verification: source-only
routes:
  - /menu
keywords:
  - restaurante
  - menú
  - carta
  - platos
  - categorías
  - horarios
  - pedidos
  - comida
requirements:
  - Módulo module_resto_menu activo
  - Permiso operations.resto_menu.view para consultar y operations.resto_menu.manage para editar
evidence:
  - path: src/app/(dashboard)/menu/page.tsx
    symbol: MenuPage
    claim: Carga en paralelo la configuración de temas, horarios de atención y el catálogo de platos y categorías.
  - path: src/modules/features/menu/actions/theme-actions.ts
    symbol: savePortalThemeConfig
    claim: Gestiona la persistencia de categorías, dobles turnos de atención y bloqueo manual de pedidos.
  - path: docs/2-architecture/modules/portal-theme-architecture.md
    symbol: "Arquitectura de Personalización de Portal, Horarios y ADN de Marca"
    claim: Detalla horarios de doble jornada (1=Lun a 0=Dom y 7=Festivos) y evaluación de estado ABIERTO/CERRADO en tiempo real.
---

# Administrar el menú digital, categorías y horarios de restaurante

## Propósito
Permitir a los restaurantes y negocios de gastronomía estructurar su carta digital interactiva, organizar categorías de alimentos y bebidas, definir horarios de atención con doble jornada y controlar la disponibilidad de pedidos en el portal público B2C.

## Requisitos y permisos
- Que la empresa tenga habilitado el módulo de menú de restaurante (`module_resto_menu`).
- Permisos requeridos:
  - *Consultar la carta:* Permiso `operations.resto_menu.view`.
  - *Crear, editar platos y configurar horarios:* Permiso `operations.resto_menu.manage`.
- Por defecto, disponible para roles de Administrador (`admin`) y Dueño (`owner`).

## Ubicación en pantalla
- **Ruta web:** `/menu`
- **Menú lateral:** Sección **Operaciones** → opción **Menú Digital** (icono de cubiertos).

## Estructura de la carta gastronómica
1. **Categorías:** Agrupaciones temáticas de platos (por ejemplo: *Entradas*, *Platos Fuertes*, *Pizzas*, *Bebidas*, *Postres*). Permite definir orden de visualización en la navegación por pestañas o pills del portal.
2. **Platos y Productos:**
   - Nombre comercial y descripción detallada de ingredientes.
   - Precio de venta al público (con o sin impuestos incluidos).
   - Imagen fotográfica del plato (con fondo transparente o encuadre optimizado).
   - Indicadores de alérgenos o etiquetas dietéticas (vegetariano, sin gluten, picante).
   - **Modificadores y adicionales:** Opciones de personalización con o sin costo adicional (por ejemplo: término de la carne, tipo de salsa, o adición de tocineta).
3. **Horarios de atención y doble turno:**
   - Configuración de turnos para cada día de la semana (Lunes a Domingo) y bloque especial para **Días Festivos**.
   - Soporte de **doble jornada diaria** (por ejemplo: turno de Almuerzo 11:30 - 15:00 y turno de Cena 18:30 - 22:30).
   - Conmutador de **bloqueo de emergencia de pedidos**: permite cerrar temporalmente la recepción de pedidos en línea ante saturación de cocina.

## Pasos para agregar un nuevo plato
1. Navega a **Menú Digital** (`/menu`).
2. En la sección de la categoría correspondiente, haz clic en **Agregar Plato** (o en el botón superior `+`).
3. Diligencia los campos:
   - Nombre del plato y descripción atractiva.
   - Precio de venta.
   - Carga la fotografía del producto.
   - Añade modificadores o guarniciones si el plato lo requiere.
4. Presiona **Guardar Plato**. El nuevo producto estará disponible de inmediato en el portal web y en las terminales de comandas.

## Pasos para configurar los horarios de atención
1. En la parte superior de la página del menú, haz clic en **Horarios de Atención** (o pestaña de Horarios).
2. Para cada día de la semana que el local opere, enciende el interruptor del día.
3. Especifica la hora de apertura y cierre del **Turno 1**.
4. Si el negocio cierra en la tarde y reabre por la noche, haz clic en **Añadir turno** para configurar el **Turno 2**.
5. Si requieres suspender pedidos de inmediato por alta demanda, enciende la opción **Bloqueo manual de pedidos**.
6. Haz clic en **Guardar Horarios**.

## Resultado esperado
El portal público para comensales (`/portal`) evaluará en tiempo real el reloj del servidor: si el local está dentro del horario configurado mostrará el distintivo verde **ABIERTO** permitiendo añadir platos al carrito; si está fuera de turno mostrará **CERRADO** y deshabilitará el checkout.

## Problemas habituales y causas comprobadas
- **Los clientes no pueden hacer pedidos aunque el restaurante esté abierto:**
  *Causa comprobada:* El conmutador de *Bloqueo manual de pedidos* quedó encendido por error, o la zona horaria del tenant (`agency_timezone`) no coincide con la hora local real.
- **Un plato agotado sigue apareciendo para ordenar:**
  *Causa comprobada:* Debes abrir el editor del plato y marcar el interruptor de disponibilidad en estado *Agotado* o desactivar el producto para que no se pueda añadir al carrito.
- **Los cambios de precios no se reflejan en el teléfono del comensal:**
  *Causa comprobada:* El navegador del cliente puede tener la versión previa en memoria. El sistema utiliza revalidación paralela en el servidor; basta con que el cliente actualice el menú deslizando hacia abajo.

## Limitaciones conocidas
- El bloqueo automático de pedidos aplica al portal público B2C para clientes; los meseros que utilicen terminales internas de toma de pedidos pueden seguir registrando comandas manualmente si sus permisos lo autorizan.

## Temas relacionados
- [Gestión de pedidos y comandas de restaurante](resto.manage-orders.md)
- [Personalizar el ADN de marca del negocio](branding.manage-adn.md)

## Notas de verificación
- Página principal: `src/app/(dashboard)/menu/page.tsx`
- Acciones de servidor: `src/modules/features/menu/actions/theme-actions.ts`
- Documentación de arquitectura: `docs/2-architecture/modules/portal-theme-architecture.md`
