# Respuestas legibles y cobertura de Inbox

Fecha: 2026-10-12. Cambios en `pixyrobotpet`, piloto local de Pixy en 3005.

## Presentación

Se retiró el pie automático «Guías consultadas» de la respuesta del servidor. Los mensajes antiguos conservan su contenido en base de datos, pero ese pie se oculta al mostrarlos y en la vista previa del navegador por preguntas. La evidencia sigue en el corpus y sus revisiones, sin repetirse al usuario.

Las respuestas del asistente se renderizan con Markdown: énfasis, párrafos, listas, encabezados discretos, citas y código. Las preguntas del usuario siguen como texto. El prompt pide negritas para controles, pasos numerados cuando sean útiles y títulos solo para respuestas con varias secciones. No exige una plantilla pesada a todas las respuestas.

`HelpMessageContent` utiliza `react-markdown` 10.1.0 con HTML omitido y una lista de elementos permitidos. No se permiten imágenes ni enlaces ejecutables; no se utiliza `dangerouslySetInnerHTML`. Las pruebas comprueban formato y bloqueo de scripts, imágenes y enlaces. Referencia primaria: https://github.com/remarkjs/react-markdown.

## Cobertura revisada

El corpus pasó de tres a seis guías: tema, mascota e historial, más Inbox, ADN de marca y administración de la mascota. Inbox requiere `module_messaging`, ADN está restringido a administradores de tenant y la administración de mascota a superadministradores de plataforma. Los otros doce artículos siguen como borradores.

La revisión de Inbox contrastó filtros, permisos de canales, nota interna, selector de respuestas, asignación y acciones de estado. Se corrigieron los nombres de filtros y la confusión entre resolver/archivar y entre arrastre de estado/asignación de agente. Se añadieron instrucciones sobre respuestas guardadas y su diferencia frente a plantillas oficiales. La guía no promete entrega instantánea ni afirma una causa única para una bandeja vacía.

Se corrigió la pestaña Operación de ADN: contiene configuración regional; no es una pestaña de redes sociales. La guía administrativa de mascota ahora refleja tamaño de escritorio predeterminado de 64 px y las ventanas diferentes de animación contextual.

## Preguntas expresadas de otra manera

La búsqueda textual sigue siendo la primera vía. Solo cuando no encuentra documentos se consulta un selector de guías con el catálogo previamente filtrado por permisos, audiencia, módulos y vertical. El selector devuelve un máximo de tres IDs; el servidor vuelve a cruzarlos con los documentos autorizados y aplica el presupuesto de contexto. IDs inventados o restringidos se descartan. No se añade acceso a datos del negocio ni ejecución de acciones.

Hay como máximo una llamada adicional de selección antes de generar la respuesta. Esa ruta puede aumentar latencia y consumo frente a una coincidencia textual; el selector está limitado a 250 tokens de salida y 40 entradas de catálogo y no utiliza caché compartida. Una selección vacía reconoce que falta evidencia. Un fallo del proveedor no se presenta como ausencia demostrada de documentación.

La selección asistida no sustituye un índice semántico ni demuestra cobertura completa de Inbox. El siguiente crecimiento del corpus deberá revisar el límite del catálogo y medir latencia/costo con tráfico real. Google recibe `responseMimeType: application/json` en tareas JSON, conforme al contrato de su SDK instalado.

## Verificación

- Evaluación offline: 23 de 23 preguntas de respuesta cubiertas recuperan alguna guía esperada; 28 siguen pendientes de cobertura y 9 son casos de clarificación/abstención. Este resultado solo mide recuperación, no calidad de respuestas generadas.
- Pruebas de regresión de historial, mascota, permisos, selección autorizada y renderer. La verificación visual y las respuestas reales se comprueban manualmente con el usuario.
- Dependencia instalada de forma aislada en el checkout local y enlazada para no reinstalar/prunar los módulos compartidos de Cartera. En instalaciones normales, el lockfile declara la dependencia. El audit consultado no reportó avisos en los nombres de paquetes añadidos; sí existen avisos en dependencias anteriores del proyecto, que no se actualizaron mediante `audit fix` en esta tarea.

## Prueba manual sugerida

Recargar 3005 y abrir una conversación nueva. Preguntar «¿Cómo dejo una nota interna en el Inbox?», «¿Cómo veo los chats asignados a mí?», «¿Cuál es la diferencia entre resolver y archivar?» y «¿Cómo uso una respuesta guardada?». Verificar pasos correctos, negritas/listas discretas y ausencia de pies de fuentes. Los permisos de canales y controles siguen rigiendo las operaciones reales.
