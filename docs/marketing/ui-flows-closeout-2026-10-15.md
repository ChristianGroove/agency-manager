# Campañas: cierre de interfaz y flujos

15 de octubre de 2026. Trabajo local sobre `master`, a partir de `372884cb` y `44afadce`, sin modificar los commits anteriores. Este cierre se incluye en el commit local solicitado por el usuario; no hace push, deploy, migraciones ni habilita envíos reales. El [estado del módulo](module-state-2026-10-15.md) reúne los flujos, requisitos operativos y pendientes vigentes.

Comprobación posterior: [verificación integrada local](integrated-verification-2026-10-15.md), con ocho suites SQL, ensayo de concurrencia, worker apagado y build aislado completo. Incluye la corrección de la detección de cambios en borradores antiguos sin audiencia; la suite actual pasa 295 pruebas.

## Recorrido principal

1. **Crear campaña:** elegir WhatsApp o email. Si falta un emisor, el formulario explica cómo configurarlo y enlaza al lugar correcto. La ausencia de emisor no se confunde con un fallo al consultar SMTP.
2. **Preparar:** nombre, emisor, contenido y audiencia. El primer mensaje puede prepararse localmente antes de crear el registro. Abrir/cerrar el formulario o el editor no crea un borrador. Importar conserva los permisos correctos con canales precargados.
3. **Guardar o iniciar:** guardar persiste el borrador. «Iniciar campaña» (o «Programar campaña» si tiene fecha) guarda nombre, configuración, audiencia y contenido pendientes, prepara un ticket actualizado y activa en una sola acción explícita. Se eliminó la confirmación visual repetida. El servidor sigue validando permisos, ejecución habilitada, consentimiento, diseño, vigencia del ticket y cambios concurrentes. Un fallo parcial conserva el mismo ID y el contenido; no crea otro borrador al reintentar.
4. **Preparación compacta:** nombre y emisor juntos; mensaje con vista previa y destinatarios en el cuerpo principal. Se retiró el resumen lateral duplicado. Horario, zona, ventana, ritmo y espera entre campañas se conservan en «Envío», con un resumen visible. Filtros y selecciones guardadas permanecen accesibles sin ocupar el flujo principal. La autorización de lista aparece si hay contactos sin permiso. Errores de validación se explican dentro del formulario. Doble clic bloqueado; una respuesta incierta de activación obliga a actualizar el estado antes de otro intento.
5. **Actividad:** métricas y avance compactos, incidencias visibles e historial directo con filtros y exportación según permisos. Actualizar resultados también actualiza el historial conservando filtros. El diagnóstico técnico se despliega bajo demanda. Activar/reanudar actualiza el listado al cerrar. Pausar conserva el avance; «Reanudar campaña» valida y retoma sin otra confirmación.

El cierre del formulario, la recarga y el descarte de un mensaje modificado tienen confirmación dentro de la aplicación. El nombre ya no depende de guardar al perder el foco. Los controles de cierre y de confirmación se revisaron en escritorio y en pantalla móvil de 390 px.

## Resultados por canal

- Aceptaciones totales: WhatsApp y SMTP identificados por separado.
- Entregas y tasa: WhatsApp, con denominador de aceptaciones WhatsApp.
- Sin aceptaciones WhatsApp: tasa no disponible; no se presenta 0% como si fuera una medición de entrega email.
- Email: aceptación SMTP, pendientes, fallos e incertidumbre; sin atribuir entrega, lectura o apertura.
- El filtro mantiene la selección SMTP visible y normaliza su identificador antes del RPC.
- El estado del worker también se consulta y muestra para email. Un error al consultar ese dato se distingue de la ausencia de ejecuciones.

## Laboratorio de ejemplos

URL local: `http://localhost:3001/crm/marketing/examples`. En desarrollo también está enlazado al pie del dashboard de campañas. En producción la ruta devuelve `notFound()` y no hay enlace de navegación.

Los ejemplos usan los mismos componentes de creación, edición, importación, revisión y actividad con un adaptador de operaciones en memoria. Ninguna operación del adaptador recurre a acciones reales como alternativa: las acciones no implementadas fallan de forma explícita. Cambiar el caso o reiniciarlo descarta solo sus datos ficticios.

Casos incluidos:

| Caso | Qué revisar |
|---|---|
| Crear WhatsApp | Emisor, plantilla, variables y mensaje local antes de guardar |
| Crear email | Asunto, personalización, vista previa y primer guardado |
| Lista para revisar | Destinatarios, exclusiones e inicio directo simulado |
| Email programado | Inicio futuro, zona horaria y ventana diaria |
| En ejecución | Métricas, progreso, pausa e historial |
| Pausada | Diseño protegido y reanudación directa con validación del servidor |
| Completada | Resultados finales y detalle por destinatario |
| Email sin confirmar | Incidencia visible e historial filtrado, sin reenvío automático |
| WhatsApp con fallos | Fallos y pendientes conservando el avance |
| Error recuperable al guardar | Fallo temporal explícito y conservación de los cambios |
| Sin emisor | Explicación y enlace de configuración |
| Sin autorización | Exclusiones y error de validación en el mismo formulario |
| Motor deshabilitado | Guardado disponible, inicio bloqueado |
| Solo lectura | Consulta sin modificaciones ni ejecución |

Hay CSV de ejemplo visibles en la página para probar el importador. El parser de CSV y los componentes de revisión son los reales; la escritura y activación del laboratorio se simulan. Los datos no se insertan en Supabase.

## Validación

- Suite de Marketing, rutas y configuración SMTP: **295 pruebas aprobadas en 30 archivos** tras la verificación integrada posterior.
- TypeScript con `--noEmit --incremental false`: correcto.
- Se verifican creación desde precarga, mensaje local, recuperación parcial sin duplicados, guardado previo al inicio, actualización tras activar, descarte, permisos, flag de ejecución e aislamiento de ejemplos. Se añadieron casos de inicio directo nuevo, programación y reanudación, doble clic, ticket caducado, rechazo por audiencia cambiada, respuesta incierta y flag del servidor cambiado tras cargar el formulario.
- Recorrido visual autenticado local: preparación y revisión de WhatsApp, vista móvil, activación simulada, actividad y pausa conservando destinatarios. La suite automatizada también recorre la creación y guardado email.
- `git diff --check` correcto. Los componentes nuevos y la revisión/dashboard se revisan con ESLint de forma acotada.

El build posterior se ejecutó en una copia aislada, sin tocar la salida `.next` del servidor local. Las pruebas iniciales de interfaz usan base/proveedores simulados; las ocho suites SQL posteriores sí consultan la base local con fixtures y rollback. El laboratorio y la carga SQL no acreditan recepción real, entregabilidad ni límites del proveedor.

## Pendientes operativos que esta interfaz no sustituye

El entorno local real sigue necesitando emisores, destinatarios con autorización y ejecución habilitada de manera controlada. Antes de producción: verificar esquema/despliegue y programador actuales, y realizar una campaña pequeña con destinatarios propios autorizados, comprobando recepción, baja, pausa/reanudación y recuperación.

Los resultados SMTP inciertos se conservan sin reenvío. La interfaz permite encontrarlos en el historial y explica qué datos contrastar con el proveedor. **No se añade una acción para declarar aceptación o reenviar sin evidencia**, ni una conciliación automática: la resolución administrativa del outbox requiere un procedimiento separado con evidencia y trazabilidad. Rebotes/quejas y recepción de respuestas email en Inbox siguen fuera del alcance implementado.

La consola local conserva una discrepancia de hidratación del sidebar general, ya observada antes de esta intervención. No se atribuye a esta actualización ni se modifica el shell global como parte de Marketing.
