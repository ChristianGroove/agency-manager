# Estándar de tablas de la plataforma

## Apariencia compartida

La referencia es la tabla del portal colaborador de Tasks. DataTable reutiliza su contenedor exacto: glass-card rounded-3xl border border-zinc-200/80 dark:border-white/10 overflow-hidden shadow-sm bg-card. La clase glass-card define el radio efectivo por la cascada y dibuja el borde con ::before, padding de 3px, degradado vertical blanco a transparente y máscara. No reemplazarlo por un borde sólido ni deducir el radio solo del nombre rounded-3xl.

DataTablePagination y DataTablePaginationFrame usan el mismo glass-card. La variante embedded se reserva para una tabla o un pie dentro de una tarjeta que ya dibuja el borde glass. Nunca anidar dos contenedores decorativos. Tampoco poner un `overflow-hidden` en el padre de la tabla y el paginador: recorta las esquinas, la sombra y el pie. El scroll horizontal pertenece al contenedor interno de `DataTable`. Los encabezados quedan por debajo del borde decorativo para no tapar el degradado.

El Table existente de ui/table delega en DataTable y conserva su ref y atributos. Las tablas HTML operativas se han integrado explícitamente con el mismo shell.

Tipografía: encabezados 10px/600 con mayúsculas y tracking-wider; cuerpo 12px/400; texto principal 12px/600; secundario 11px/400; metadatos 10px/500. DataTableText expone los roles principal, secundario y metadatos.

El layout carga Geist y Geist Mono desde `src/app/fonts/` con `next/font/local`, manteniendo las variables CSS existentes. Los archivos Latin proceden de los recursos Geist incluidos en Next.js 16.1.1. Esto evita que un build dependa de Google Fonts; conservar las variables y los pesos al actualizar esas fuentes.

## Paginación local

PaginatedDataTable se usa solamente sobre el conjunto local de filas ya filtradas y ordenadas. Pagina el contenido de tbody o TableBody con tamaños 25/50/100. Conserva props, handlers, keys, encabezados y TableFooter. Los Fragment con registro y detalle se mantienen juntos. El módulo sigue siendo dueño de sus datos y de sus acciones.

useClientTablePagination permite integrar directamente un arreglo de datos en componentes que ya tienen lógica propia. Una clave de filtros permite volver a la primera página incluso cuando cambia el contenido sin cambiar la cantidad. El adaptador usa las claves de las filas; se puede pasar resetKey explícitamente para fuentes que usan índices como key. Cotizaciones, Contratos (`/hosting`) y Hosting de plataforma (`/platform/hosting-accounts`) usan el hook directamente y renderizan `DataTablePagination` como hermano de `DataTable`, después de filtrar los datos. Su pie permanece visible incluso en estados vacíos o de carga.

Los estados vacíos con una celda expandida no cuentan como registros. Para cargas que mantienen filas de esqueleto puede pasarse loading. Los editores de variantes y líneas de documentos mantienen todas las filas visibles para editar y calcular totales; comparten la apariencia, sin paginación local automática.

## Paginación remota

DataTablePagination es controlado: no consulta ni recorta datos. Clientes y Organizaciones envían page y pageSize al servidor, preservan los demás parámetros URL y corrigen páginas fuera de rango. Auditoría y Correos usan useRemoteTablePagination, total exacto, orden estable y protección contra respuestas tardías. No aplicar el adaptador local a una página remota.

Marketing conserva sus contratos y cursores existentes y comparte DataTablePaginationFrame. No inventar totales ni introducir tamaños incompatibles con esos contratos estrictos. La revisión local de CSV usa el control completo 25/50/100 y conserva selección y confirmación de importación.

Los filtros locales preexistentes de Clientes siguen actuando sobre los registros cargados; la interfaz lo indica. Convertirlos en filtros globales de servidor es una modificación del contrato de consultas, separada del estándar visual.

## Selección múltiple y acciones

El adaptador no cambia el alcance de seleccionar todos. Cada pantalla conserva su handler, permisos, confirmaciones y barra flotante. La selección vive en el módulo por ID y sobrevive al cambio de página; no reconstruirla a partir de las filas visibles.

Clientes y Organizaciones remotas seleccionan la página visible y conservan IDs de otras páginas. Facturas, Cotizaciones y Hosting mantienen el alcance previo de sus encabezados sobre los resultados filtrados. Las acciones de cada fila mantienen el registro al que pertenecen, incluidos dropdowns y detalles desplegables.

## Cobertura y validación

Consultar table-migration-inventory.md para el inventario. Los listados operativos usan el estándar; las plantillas PDF y de correo conservan su formato de salida.

La suite focalizada cubre límites, parámetros URL, navegación, cambios de filtros y tamaño, respuestas tardías, reintentos, detalles agrupados, dropdowns, selección entre páginas y la acción flotante. Incluye el componente real de Facturas y una renovación de datos con selección activa, además de la página real de Hosting con 31 cuentas y cambio de página. Ejecutar los archivos de pruebas de table-pagination, data-table-pagination, use-table-pagination, paginated-data-table, clients-table, knowledge-list, invoices-table-pagination y `platform/hosting-accounts/page.test.tsx`, además de `npm run check:types` y `npm run build`.

Revisión manual por pantalla: verificar tipografía y degradado, un solo borde, rangos 25/50/100, registros de páginas siguientes, filtros, estados vacío/carga, dropdowns, selección y barra flotante. En tablas por cursor verificar Anterior/Siguiente sin modificar el contrato de consulta.
