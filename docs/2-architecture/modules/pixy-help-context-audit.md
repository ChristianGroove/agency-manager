# Revisión del contexto del asistente de ayuda de Pixy

Fecha: 2026-10-12. Checkout inspeccionado: `pixyrobotpet`, `tmp/pet-workspace`.

## Dictamen

El asistente actual sirve para ayuda básica, pero no cumple todavía el objetivo de conocer de manera fiable todo Pixy. El diseño de recuperar información antes de generar una respuesta sigue siendo adecuado. Los límites principales son cobertura, vigencia, permisos, recuperación y construcción del contexto. Cambiar únicamente el modelo o alargar el prompt no resuelve estos problemas.

Esta revisión incluye código, documentación, migraciones y comprobaciones de existencia de objetos en la base Docker local `supabase_db_agency-manager`. No se inspeccionó la base remota ni se realizaron llamadas pagadas a modelos. No se modificó el runtime ni se aplicaron migraciones como parte de esta revisión.

## Flujo actual y evidencia

1. `caa/actions/ask-help-assistant.ts` valida sesión/organización, pregunta e historial, conserva cuatro mensajes para contexto y delega a `AIEngine.executeTask`.
2. `ai-engine/service.ts` comprueba gobernanza, caché, límites y credenciales. Para ayuda, intenta recuperar conocimiento con la pregunta actual, `spaceCategory` como filtro de categoría y audiencia `staff`.
3. `embedding.ts` intenta generar un vector y llamar a `match_knowledge_v2`, con umbral 0.65 y cinco resultados. Si no consigue resultados, consulta `knowledge_base` mediante `ILIKE`.
4. `tasks/registry.ts`, tarea `help-assistant`, incorpora resultados como preguntas/respuestas dentro del prompt. Añade descripciones generales y algunos hechos recientes del robot/tema. Solicita máximo dos o tres oraciones, máximo 500 tokens y temperatura 0.5.
5. La conversación se representa en el prompt como texto `U:` / `A:`, recortando cada uno de los cuatro mensajes a 150 caracteres. No utiliza el historial como una secuencia real de mensajes del proveedor.
6. Se devuelve texto sin fuentes. Aunque el motor puede devolver `context`, la acción de ayuda no lo expone al chat. No hay herramientas conectadas para diagnosticar permisos, módulos o configuraciones actuales.

## Hallazgos

| Prioridad | Hallazgo | Consecuencia |
|---|---|---|
| Alta | Localmente no existen `knowledge_base`, `match_knowledge`, `match_knowledge_v2` ni la extensión `vector`. El esquema antiguo está en migraciones archivadas, no en el baseline activo inspeccionado. | La ayuda local funciona sin recuperación real; existencia en remoto queda sin confirmar. |
| Alta | `EmbeddingService.generateEmbedding` llama a `getAICredentials`, que devuelve `api_key_encrypted` enmascarado para la UI. El servicio intenta descifrar ese valor. | Las credenciales del tenant no sirven a esta ruta de embeddings. La clave OpenAI de entorno constituye otra vía, si está configurada. Además, no comparte la resolución de claves maestras del motor de generación. |
| Alta | La misma base guarda FAQs del negocio, incluidas las extraídas de conversaciones de Inbox, y es consultada por la ayuda del producto. Solo se busca por tenant; no hay biblioteca global oficial de Pixy. | Preguntas sobre funcionamiento del software pueden recibir información del negocio o carecer de documentación general. |
| Alta | No hay publicación, versión de producto, fuente verificable, propietario editorial ni vigencia del documento en el contrato recuperado. `HelpRegistry` es una implementación vacía. | No hay mecanismo visible para saber qué es oficial, está actualizado o pertenece a una función retirada. |
| Alta | La recuperación usa `supabaseAdmin`; el fallback conserva el filtro de tenant pero ignora la audiencia solicitada y devuelve todos los resultados como `both`. | El aislamiento por tenant no sustituye los permisos por usuario y documento. No se observó una filtración real; el contrato actual no garantiza las restricciones de audiencia. |
| Media | Se pasa `spaceCategory` como `category_filter`, aunque la base usa categorías como `General` o categorías temáticas. | Un filtro exacto puede descartar documentos válidos. Deben ser metadatos diferentes. |
| Media | El fallback usa las primeras cinco palabras de más de tres caracteres, elimina caracteres españoles con una expresión ASCII, no ordena por relevancia y asigna similitud fija 0.8. | Recuperación débil; el número 0.8 no representa confianza ni calidad medida. |
| Media | El hash de caché se calcula al leer antes de recuperar documentos, pero al escribir después de mutar el payload con `knowledgeContext`. | Con recuperación no vacía, la siguiente petición equivalente puede no encontrar la entrada guardada. El TTL de ayuda es 24 horas y no incluye versión del conocimiento. |
| Media | `AssistantModal` lee `currentContext` pero no lo envía a `AIChatPanel` ni a la acción. Algunas páginas registran vistas, sin cobertura general. | El asistente desconoce pantalla, acciones visibles y contexto local de la pregunta. |
| Media | Cuatro mensajes, recortados a 150 caracteres cada uno; búsqueda basada solo en la pregunta actual. | Se pierden pasos previos y las preguntas de seguimiento como «¿y si no aparece?» recuperan poco contexto pertinente. Persistir historia no equivale a usarla adecuadamente. |
| Media | Se exige responder siempre en dos o tres oraciones. | Procedimientos y diagnósticos necesitan respuestas con longitud proporcional y pasos claros. |
| Media | El adaptador Google usa `@google/generative-ai` y convierte instrucciones `system` en mensajes de usuario del historial. | Hay que migrar el SDK y preservar roles/instrucciones de sistema; no basta actualizar el nombre del modelo. |
| Media | Rate limit en memoria por proceso y regex de temas prohibidos. No se encontró una batería específica de evaluación de calidad de recuperación/respuestas. | No escala como control distribuido ni demuestra calidad. Una regex no constituye protección completa frente a instrucciones maliciosas en documentos. |

Los hallazgos de caché, audiencia y credenciales pueden afectar otras tareas que comparten el motor. Su corrección debe tener pruebas de contrato y alcance explícito; no se recomienda reescribir todos los consumidores durante el piloto de ayuda.

## Arquitectura recomendada

### Conocimiento oficial del producto

Crear una biblioteca global de Pixy, separada del conocimiento comercial de cada tenant. Cada artículo debe describir un procedimiento o capacidad real: propósito, requisitos, permisos, ubicación verificada, pasos, errores habituales, limitaciones, funciones retiradas y pantallas relacionadas. Metadatos mínimos: ID estable, módulo, categoría temática, verticales compatibles, audiencia/roles, estado de publicación, versión o revisión, responsable, fecha de verificación, fuente y hash.

Empezar con artículos Markdown versionados en el repo y un manifiesto validado. Publicar solamente contenido aprobado. `docs/1-product` y `docs/2-architecture` son insumos útiles, pero contienen afirmaciones antiguas: contrastar con rutas, componentes y pruebas. No indexar indiscriminadamente `docs/4-history`, roadmaps, secretos, `.env`, logs, volcados ni código completo. No presentar desarrollo de otras ramas como disponible en la versión desplegada.

Cuando se modifique un módulo, su documentación de ayuda se revisa en el mismo cambio. El código puede generar inventarios de rutas/capacidades y borradores; los pasos de usuario requieren validación. Las conversaciones solo generan propuestas de FAQ para revisión, nunca nuevas verdades automáticamente.

### Contexto de la sesión y pantalla

Un contrato pequeño, tipado y validado: tenant activo, rol/permisos efectivos, módulos activos, capacidades, vertical, versión desplegada, ruta/view ID y acción/error pertinentes. Identidad, permisos y habilitaciones provienen del servidor; el navegador propone el view ID, pero no decide autorización. Reutilizar `capabilities-registry`, resolución de módulos y servicios IAM existentes.

No enviar datos completos de la página ni respuestas de consultas que el usuario no puede ver. Las instrucciones deben corresponder a esa versión y configuración, y distinguir una función inexistente de una función que requiere permisos o habilitación.

### Recuperación de documentación

Usar PostgreSQL/Supabase existente: búsqueda textual en español con índice GIN como base funcional; agregar búsqueda semántica con pgvector cuando la generación de embeddings sea fiable. Combinar rankings, en vez de elegir vectores o texto como vías excluyentes. Fragmentar por secciones conservando título, módulo, requisitos y referencia al artículo. Seleccionar pocos fragmentos bajo presupuesto de tokens. Reordenamiento adicional solo si mejora el conjunto de evaluación y compensa su coste.

Filtrar por publicación, versión, tenant cuando aplique y permisos ANTES de que el texto entre al contexto del modelo. Las mismas restricciones rigen búsqueda textual, semántica, caché y herramientas. Tratar los documentos recuperados como datos, no como instrucciones que puedan cambiar permisos o comportamiento del asistente.

Las fuentes del producto son compartidas y se indexan una sola vez por revisión; no duplicar los mismos embeddings para cada tenant. Versionar modelo y dimensiones de embeddings. No mezclar vectores de modelos distintos sin reindexación.

### Memoria de conversación

Mantener mensajes recientes completos bajo presupuesto de tokens, usando roles reales. Incorporar un resumen cuando la conversación lo necesite, no en cada pregunta. El resumen guarda objetivo, pasos intentados y decisiones, no sustituye a las fuentes oficiales ni autoriza acceso a datos. Reformular consultas de seguimiento con contexto relevante solo cuando sea necesario. Los historiales siguen siendo privados por usuario y tenant.

### Consultas a estado actual

Añadir gradualmente herramientas de lectura para preguntas como «¿por qué no veo este módulo?» o «¿está conectado mi canal?». Cada herramienta tiene contrato, filtros de tenant/usuario, permisos, límite de resultados y presupuesto de tiempo. Reutiliza servicios de negocio; no ofrece SQL arbitrario ni acceso general a la base. No retornar claves o datos personales innecesarios.

Primeras herramientas candidatas: módulos habilitados, permisos de la acción solicitada, estado público de configuración de marca y estado de conexión del canal. Escrituras, pagos y cambios operativos quedan fuera del piloto y requieren una fase propia.

### Respuesta y experiencia

Responder con pasos breves o explicaciones amplias según la pregunta; reconocer cuando falta evidencia y pedir el contexto mínimo. Mostrar referencias discretas a guías verificadas y enlaces solo a rutas permitidas. El modelo no inventa enlaces ni citas: resolver IDs contra documentos realmente recuperados. Si se usa Markdown, renderizarlo de forma segura y sin HTML arbitrario.

Streaming mejora la percepción de espera, pero no la exactitud. El pet puede reflejar búsqueda/consulta y redacción sin mostrar detalles internos sensibles. Conservar un fallback útil a documentación/soporte cuando no haya IA o haya evidencia insuficiente.

## Mantenimiento y control

Super admin: revisión y publicación de artículos globales, módulos cubiertos, documentos pendientes de verificar, sincronización/errores de indexación, revisión activa y reversión, preguntas sin respuesta, feedback y métricas. No convertir el panel global en lector de historiales privados. Tenant admin: contenido de su organización y configuración permitida, separado del manual global.

Publicación e indexación incrementales por hash, fuera del camino de cada pregunta. Clave de caché canónica e inmutable que incluya versiones de prompt/corpus/modelo y ámbito autorizado. Al introducir datos dinámicos, incorporar usuario/permisos y versión del estado o desactivar caché de respuesta; no reutilizar respuestas privadas por tenant solamente. Cachear embeddings de consulta de forma acotada y conforme a la política de datos.

Métricas: documentos recuperados, revisión, ausencia de resultados, proveedor/modelo, tokens, latencia de búsqueda y generación, fuente elegida y feedback. Guardar metadatos, evitando preguntas completas o datos privados por defecto. Establecer rate limit compartido, tiempos máximos, presupuesto de tokens y fallback controlado.

## Fases y criterios

| Fase | Alcance | Criterio de salida |
|---|---|---|
| 1. Fuentes y piloto | Contrato de artículos globales, inventario real, ayuda versionada de dashboard/tema/pet, ADN, permisos y acceso a módulos. Búsqueda textual y referencias. | Preguntas del piloto responden con procedimientos vigentes y fuentes; fuera de cobertura se reconoce el límite. |
| 2. Recuperación y sesión | Corregir embeddings/SDK/roles y contratos de caché; búsqueda híbrida; conectar vista/permisos y memoria por tokens. | Mejora medible sobre fase 1 en preguntas de seguimiento y recuperación; pruebas de privacidad pasan en todas las vías. |
| 3. Diagnóstico | Herramientas de lectura para permisos, módulos y canales; respuestas por streaming y feedback. | Diagnósticos se sustentan en estado autorizado real, con tiempos y costes acotados. |
| 4. Cobertura y publicación | Inbox, CRM, facturación, automatizaciones y verticales por entregas; panel editorial global y revisión de contenido. | Cada módulo publicado tiene responsable, documentación vigente y conjunto de preguntas verificadas. |

Antes del piloto, preparar 50–100 preguntas representativas con respuesta/ fuente esperada, preguntas sin respuesta, funciones retiradas, varios roles/tenants y seguimientos. Medir recuperación, exactitud de pasos, citas válidas, abstención, aislamiento, latencia y coste. Un objetivo inicial propuesto es al menos 90% de respuestas correctas en el conjunto cubierto y cero accesos indebidos en las pruebas de permisos; no son resultados obtenidos ni una garantía sobre preguntas arbitrarias.

Despliegue mediante un control del asistente v2 independiente del pet visual, primero local y después tenant piloto, con reversión inmediata a la ayuda anterior. No migrar los bots de Inbox ni otras tareas compartidas automáticamente.

## Fuentes técnicas consultadas

- [Supabase: búsqueda híbrida con texto, vectores y fusión de rankings](https://supabase.com/docs/guides/ai/hybrid-search).
- [Supabase: recuperación con permisos y RLS](https://supabase.com/docs/guides/ai/rag-with-permissions).
- [Anthropic: contextual retrieval y fragmentos con contexto](https://www.anthropic.com/engineering/contextual-retrieval).
- [Anthropic: ingeniería de contexto y selección de información](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents).
- [Anthropic: diseño de herramientas y evaluación](https://www.anthropic.com/engineering/writing-tools-for-agents).
- [Google: SDKs mantenidos y migración desde bibliotecas legacy](https://ai.google.dev/gemini-api/docs/libraries).

Estas fuentes sustentan las técnicas sugeridas. La elección de arquitectura y las fases son recomendaciones específicas para Pixy, no resultados de una comparación experimental de modelos.
