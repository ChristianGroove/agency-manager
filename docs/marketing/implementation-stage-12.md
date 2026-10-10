# Etapa 12: listas simples y declaración externa por lote

La preparación comercial deja de exigir evidencia individual en cada fila de una lista. Se separan el almacenamiento de contactos y el registro de una autorización obtenida fuera de Pixy. Importar una lista no envía mensajes, no concede permisos de marketing y no convierte contactos en oportunidades del pipeline.

## Flujo disponible

1. Importar un CSV con `telefono` obligatorio; `nombre` y `email` son opcionales. Se aceptan hasta 1.000 filas y 5 MB. El teléfono debe incluir país; no se inventa un código de país. Sin nombre se muestra inicialmente el número.
2. Revisar las filas: se seleccionan inicialmente las válidas, con selección general y revisión por páginas de 50. Los duplicados se excluyen. Un contacto con baja puede almacenarse, conservando esa baja.
3. Elegir la lista en Destinatarios. Si la empresa ya obtuvo autorización externa, puede registrarla una vez para la lista. Se requiere una declaración explícita; la referencia interna es opcional. Los contactos ya autorizados, las bajas y los datos no aptos quedan fuera de esa declaración.
4. Guardar y usar la revisión final de campaña existente. La declaración no activa campañas. La aprobación de plantillas y los controles de envío siguen vigentes.

El CSV anterior con evidencia por fila sigue disponible y conserva sus límites de 100 contactos / 1 MB. Su confirmación sigue requiriendo permiso para importar y registrar autorizaciones. No se reinterpretan esos archivos como listas sin evidencia cuando sus columnas están incompletas.

## Datos y permisos

- Importar solo requiere el permiso de importación; no otorga el permiso de ejecución. El indicador de acceso usado en la interfaz también los distingue.
- Contactos existentes conservan nombre, correo, etiquetas, asignación, tipo y etapa. Los nuevos son contactos de marketing (`prospect`, `marketing_contact`, origen `marketing_import`).
- La declaración requiere permiso de ejecución y consulta. El registro describe una declaración del responsable, no una verificación de Pixy ni una aprobación de Meta. Su fecha es la de declaración, no una fecha original de obtención inventada.
- No hay consentimiento automático al importar ni una opción oculta para enviar sin permiso. Se mantienen las bajas, la renovación independiente y la deduplicación.
- Organización y actor proceden de la sesión. Funciones SQL accesibles únicamente por el servicio y nuevamente autorizadas en la base; tickets limitados a organización, actor y operación.
- Confirmaciones atómicas e idempotentes. Se vuelve a comprobar el contacto, los permisos y la composición de la lista; si hay cambios, se requiere otra revisión. Los bloqueos por destinatario usan el mismo orden y clave de las operaciones existentes de consentimiento.

## Alcance y entrega

Se modificó la importación y el registro de autorizaciones en Marketing. No se modificaron los proveedores de envío, Inbox, estados de mensajes, multimedia, asignación de leads ni automatizaciones.

La migración `supabase/migrations/20261010070000_marketing_simple_lists.sql` es aditiva salvo la ampliación de tipos de ticket y requiere las migraciones anteriores de Marketing, incluida la de listas `20261010060000`. Se aplicó únicamente en Docker local. Este cambio no incluye despliegue ni activación de campañas reales.

El lote de 1.000 es un límite de trabajo síncrono; no se presenta como importación ilimitada. Para archivos mayores se necesitan lotes separados o una importación asíncrona futura.

## Validación

- Suite de Marketing: 231 pruebas en 25 archivos, más una prueba adicional de independencia de permisos (232 pruebas distintas en total). El archivo de acceso se volvió a ejecutar después de ese ajuste: sus 5 pruebas pasaron.
- Seis suites SQL en Docker con transacciones revertidas: seguridad, operaciones revisadas, workspace, controles del editor, listas y listas simples. Incluyen almacenamiento de 1.000 contactos, declaración de 999 con una baja excluida, reintentos, denegación de permisos y cambios de baja posteriores a la revisión. Sin solicitudes a proveedores.
- TypeScript y build local verificados; logs en `tmp/marketing-stage12-*` y `tmp/stage12-*`, ignorados por Git.
- La revisión visual autenticada no se declara: la herramienta de navegador de este entorno falla al inicializar. El preview actualizado queda disponible para revisión del usuario.
