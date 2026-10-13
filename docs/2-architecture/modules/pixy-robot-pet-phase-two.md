# Pixy pet: primera integración operativa y prueba IA local

Fecha: 11 de octubre de 2026. Rama: `pixyrobotpet`.

## Guardado del ADN de marca

`BrandCenter` incorpora `usePetOperation`: marca `working` al iniciar el guardado, `happy` tras la respuesta exitosa y `error` ante una excepción. Los toasts, autorización, escritura y eventos de branding conservan su flujo. El observador es opcional y funciona sin proveedor de mascota. Requiere activar reacciones a operaciones/avisos críticos; master off sigue dejando ayuda simple.

El coordinador conserva una operación actual, identifica cada inicio y rechaza finalizaciones antiguas. La limpieza del hook cancela señales pendientes al desmontarse; una respuesta posterior no las reactiva. Caducidad: trabajo 15 segundos, éxito 2,5 segundos, error 8 segundos. Prioridad: aviso crítico, chat activo, operación. No se incorporó una cola global de toasts ni instrumentación de todos los módulos.

## Disponibilidad de IA

La consulta de metadata local encontró Pixy con `status:suspended`, `ai_mode:saas`, `ai_status:active`, Google/Groq activos y OpenAI agotado. La suspensión explicaba el rechazo antes de llamar al proveedor. El usuario autorizó **reactivar únicamente Pixy local**; se actualizó solo `organizations.status` para el ID y slug verificados en `supabase_db_agency-manager` (API 55321, DB 55322). No se cambiaron credenciales, límites ni base remota.

Se corrigió la consulta de gobernanza antes de caché: una respuesta almacenada ya no evita suspensión/desactivación. Si la organización o su estado no pueden verificarse, se rechaza la operación. El chat recibe mensajes públicos fijos para estos casos y no devuelve diagnósticos privados del proveedor. La ausencia de una entrada de caché usa `maybeSingle`, evitando un falso error por cero filas.

La primera petición real autenticada a `askHelpAssistant`, vía HTTP en localhost:3005, retornó un error: Google `gemini-1.5-flash` y Groq `llama-3.3-70b-versatile` respondieron 404. La copia local también carece de `knowledge_base`, y OpenAI no tiene una credencial activa para embeddings. El motor conserva su recuperación sin RAG; no se inventó una tabla ni se aplicaron migraciones adicionales.

Se consultaron los catálogos con las claves existentes, sin imprimirlas. Ambos respondieron 200. La tarea de ayuda dispone ahora de selección propia: Google `gemini-3.5-flash-lite` y Groq `openai/gpt-oss-20b`. Estar en un catálogo no basta: Google 2.5 Flash Lite figuraba, pero la generación real devolvió 404 para esta cuenta y recomendó 3.5; una generación mínima por el proveedor Google con 3.5 retornó éxito y contenido. El enrutamiento de otras tareas permanece pendiente de una revisión independiente. Documentación de los endpoints: [Gemini models](https://ai.google.dev/api/models) y [Groq API](https://console.groq.com/docs/api-reference).

La primera respuesta real exitosa del chat, por Groq, tardó unos 1,6 s, pero inventó la ruta `Configuración > Preferencias` para cambiar el tema. Se incorporaron hechos verificados del dashboard al contexto sellado: toggle de sol/luna en el borde del sidebar, sin guardar ni menú expandible; robot/botón de ayuda directo; retiro de los accesos antiguos. El payload de ayuda tiene una versión de interfaz para evitar reutilizar la respuesta antigua de su caché de 24 horas. Esto corrige el caso observado; no demuestra precisión general de todas las respuestas sin una base de conocimiento actualizada.

La petición HTTP real después de corregir modelo/contexto retornó **200**, `success:true`, en aproximadamente **1,5 s**. La respuesta explicó el botón de sol/luna del borde del sidebar y que no requiere guardar. La sesión de prueba se creó mediante auth local de un solo uso y se cerró solo para esa sesión; no se cambiaron contraseñas ni se automatizó navegador.

## Recuperación de Admin

El usuario reportó que no podía entrar a Admin desde Pixy. El fallo era de renderizado de la bitácora: la entrada global `add_master_ai_key` tenía `organization_id:null`, y `/platform/admin/page.tsx` ejecutaba `organization_id.split('-')`. La base local confirmó esa fila. Se cambió únicamente su presentación: las entradas sin tenant muestran **Plataforma**. La autorización `isSuperAdmin` y los datos de auditoría permanecen intactos.

El build que incluye la corrección completó correctamente y localhost:3005 quedó iniciado. La comprobación HTTP adicional de Admin no se ejecutó (autorización rechazada); la validación de acceso/presentación queda para la revisión manual del usuario. No se afirma haber validado esa página en navegador.

## Rendimiento y alcance de las comprobaciones

El chunk dinámico del renderizador del build inspeccionado mide **35.267 bytes**, **13.815 bytes gzip**. Se localizó por el código de inicialización de canvas; incluye su wrapper y es solo un chunk, no el coste total del dashboard ni un presupuesto alcanzado de INP/CPU/batería. No se automatizó navegador. La evaluación visual, teclado móvil, zoom, CPU y fluidez continúa manualmente por el usuario.

Las pruebas de código cubren gobernanza antes de caché, consulta fallida, selección por tarea, operaciones concurrentes, caducidad, prioridad y limpieza tras desmontaje. Los proveedores están simulados en esas pruebas. La petición HTTP real es evidencia separada; no equivale a verificar la presentación en navegador.

60 pruebas en 8 archivos aprobadas. TypeScript del código fuente y builds de producción completados; los archivos nuevos del pet/errores/pruebas pasan ESLint. Los módulos antiguos de branding/IA conservan reglas/advertencias preexistentes de `any` y variables sin uso; la revisión acotada de estos archivos excluye esas dos reglas. No se aplicaron migraciones nuevas.

## Limpieza posterior

El menú flotante viejo ya no importa ni monta Meta Control y el asistente anterior. La búsqueda actual en `src` encuentra definiciones de `MetaControlSheet`, `AssistantOverlay` y `useAssistant`, más el import interno del hook en el overlay, sin consumidores del dashboard. Antes de borrar esos módulos se debe rastrear también rutas API, registros, imports dinámicos, pruebas y posibles consumidores externos. No se eliminaron sus servicios internos en esta fase.
