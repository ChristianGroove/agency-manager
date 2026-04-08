# Arquitectura del Módulo de Contactos (Clientes)

El módulo de Contactos (también llamado Clientes o Contactos Maestros) ha sido rediseñado bajo una arquitectura de **Seguridad de Identidad**. La premisa central es la separación física de la **Agenda Maestra** (`contact_type='client'`) frente a las **Tarjetas de Pipeline** (`contact_type='lead'`), permitiendo gestionar múltiples negocios con un solo contacto sin duplicidad visual ni pérdida de datos maestros al limpiar el embudo de ventas.

La filosofía central de este módulo es que debe **comportarse, lucir y cargar datos diferentes** dependiendo del `spaceType` (Ej. `platform`, `agency`, `inbox`, `resto`, etc.), utilizando el **Vertical Registry** para adaptar la terminología y las acciones disponibles.

## 1. Arquitectura de Archivos y Componentes

El módulo abandonó el patrón monolítico donde `ClientsView.tsx` manejaba miles de líneas. Ahora utiliza un flujo de Orquestador Principal -> Sub-componentes -> Contralor de Diálogos.

### Estructura Principal:
*   `clients-view.tsx` **(El Orquestador)**: Es el corazón del módulo. Solo se encarga de fetchear o recibir datos limpios, manejar estados locales básicos de UI profunda (Search, Filter, viewToggle) y orquestar llamadas de modales. NO renderiza tarjetas ni tablas manualmente.
*   `clients-context.tsx` **(El Estado Global de la Vistas)**: Inyecta variables críticas como `spaceType`, `searchQuery` o `activeFilter` a cualquier subcomponente de la jerarquía inferior de Clientes (ClientsGrid, Toolbar) para evitar prop-drilling excesivo de componentes fijos.
*   `clients-grid.tsx` **(Vista de Cuadrícula / Tarjetas)**: Mapea la vista densa/compacta. Condiciona los "bloques de estado" visuales basándose enteramente en si el contacto tiene deudas (`debt > 0`), pagos próximos (`futureDebt > 0`) o urgencias basadas en `daysToPay`, y si la vista es Compacta (`!isCompactView`).
*   `clients-table.tsx` **(Vista de Lista / Tabla)**: Representación de lista enfocada en acciones rápidas, optimizada con `Tooltip` e iconos sutiles.
*   `client-dialogs-manager.tsx` **(Contralor de Modales/Sheets)**: Mueve TODAS las ventanas flotantes y modales laterales (Gestión Completa, Portal Action, Connectivity, Cobros Rápidos) fuera del árbol de iteración de Clientes. Renderizar los modales individualmente por cada iteración del `.map()` creaba degradación de rendimiento masiva. 

## 2. El Role Fundamental del Vertical Registry (`VERTICAL_REGISTRY`)

El `VERTICAL_REGISTRY` (`src/modules/core/organizations/vertical-registry.ts`) dictamina la estructura de este módulo a nivel lógico y UI. **NUNCA** se deben hardcodear palabras como "Clientes" o "Facturación" dentro del código base de este módulo.

El `config` del espacio actual determina:
- **`config.terminology.clients` / `client`:** Define si la pantalla dice "Contactos", "Tenants" o "Clientes".
- **`config.management.visibleTabs`:** (Ej. `['info', 'activity', 'services', 'billing', 'hosting']`). Control estricto de **qué pestañas renderizar** dentro de la Hoja de Gestión Detallada (`ClientManagementSheet`) Y además, bloquea la carga silenciosa de componentes secundarios asíncronos (Modales crear servicios/facturas).
- **`config.management.actions`:** Para mostrar/ocultar botones primarios.
- **`config.insights`:** Especifica qué campo del objeto `client` (sea la metadata o propiedad de nivel 1) debe representarse visualmente en la UI como dato primario o secundario.

## 3. Data Transformation (Transformación Limpia en View)

La base de datos retorna un Join complejo (`clients`, con `services`, `invoices`, `hosting_accounts`, `subscriptions`). 
El `clients-view.tsx` usa un bloque de `useMemo` inicial **obligatorio** para parsear, calcular y unificar la data:
```javascript
// Parseo estricto del ViewMemo:
id: client.client_id || client.id, 
activeServicesCount: client.active_services_count || 0,
debt: client.debt || 0,
futureDebt: client.future_debt || 0,
nextPayment: Func(dates),
daysToPay: Func(diff),
```
Esta transformación debe ser inmutable y la única fuente de verdad validada que baja por Props a la Grilla y a la Tabla.

## 4. Diseño UI: Estandarización Minimalista
- **Internacionalización Obligatoria:** No usar strings directos en español/inglés para el contenido o badges. Usar la etiqueta oficial del sistema. Ej: `<span className="status">{t('clients.status.active')}</span>`.
- **Vista Compacta Universal:** La lógica `isCompactView` oculta masivamente componentes de densidad visual alta. Si el prop llega en `true` a las cards, NINGÚN bloque de estados (Status Block, Next Payment, Insights) debe renderizarse, limitándose estrictamente al Avatar, Name, y Bottom Actions.
- **Micro-interacciones Grises Sutiles:** Todos los íconos de acciones flotantes (Quick Actions) deben ser `text-slate-400 hover:text-{brandColor}-600`. Esto mantiene la regla corporativa de "apariencia limpia hasta que el usuario hace hover".

## 5. Hoja de Gestión Detallada (`ClientManagementSheet.tsx`)

Es el componente de detalle dinámico. Responde jerárquicamente al `spaceType`.
**Regla de Oro en Próximos Desarrollos:** Si vas a añadir una funcionalidad exclusiva (Ej. Tab "Reservas de Restaurantes"), DEBES:
1. Agregar el string de la 'visibleTab' (ej. `'reservations'`) al `VERTICAL_REGISTRY` en el key base del Vertical.
2. Renderizar el `TabsTrigger` solo si `config.management.visibleTabs.includes('reservations')`.
3. Validar botones estáticos de acción secundaria localizados en el **Footer de la Hoja de Gestión** con esa misma condición.
4. Asegurar que este componente NO carge API states o requests secundarios relacionados a las reservas si ese espacio NO incluye ese tab.
