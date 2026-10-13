# Base técnica del asistente v2

Implementada en `pixyrobotpet` mientras Gemini prepara contenido en `docs/1-product/help-library/drafts/`. La carpeta de borradores es exclusiva del trabajo delegado y no se modificó durante esta implementación.

## Entregado

- Contratos Zod para artículos, revisiones, permisos IAM y artefacto publicado. `js-yaml` es dependencia de desarrollo del validador; no se incorpora al chat del navegador.
- Comandos `help:validate` / `help:publish`, con validación de evidencia/rutas, unicidad de IDs, referencias de inventario/preguntas, límites, exclusión de HTML y enlaces externos del contenido, hashes del borrador y sus fuentes. La publicación rechaza evidencia cambiada y preserva el corpus anterior ante errores. Las notas internas no llegan al modelo.
- Biblioteca publicada inicialmente vacía. No se importa ni publica contenido de Gemini automáticamente. El runtime recibe el mismo corpus global versionado del build, sin copias por tenant.
- Búsqueda lexical con normalización del español, ranking por título/palabras/contenido y presupuesto de cinco artículos/16.000 caracteres. La pantalla puede mejorar el ranking, pero no autoriza documentos ni convierte una búsqueda sin coincidencias en evidencia. Esta etapa es una búsqueda local del corpus; todavía no usa índices de PostgreSQL ni embeddings.
- Filtros de audiencia, módulos, permisos y vertical aplicados antes de seleccionar contexto. El servidor verifica roles y permisos con IAM existente. Una membresía bloqueada no concede rol administrativo ni permisos. Usuarios jerárquicos sin membresía directa solo reciben guías generales sin restricciones administrativas, de manera conservadora.
- Ruta actual del navegador validada contra el corpus. Es una pista de contexto, no una afirmación de autorización. No se envían valores de formularios, registros, claves ni datos de clientes.
- Tarea independiente `help-assistant-v2`: documentos publicados, instrucciones proporcionales a la pregunta, historial con roles y hasta 12 mensajes completos/10.000 caracteres, fuentes agregadas como títulos por el servidor. Si no hay evidencia autorizada, se declara la limitación sin llamar al modelo. No se genera resumen de conversación todavía.
- Caché compartida deshabilitada para la tarea con contexto de sesión. Corregido el hash inconsistente del motor legacy: lectura/escritura conservan el payload anterior a la inyección de conocimiento. El adaptador Google transmite instrucciones de sistema por `systemInstruction` y conserva roles de historial. La migración al nuevo SDK permanece pendiente.
- Activación con master switch y lista explícita de tenants. Ambos controles se evalúan en servidor; por defecto se conserva la ayuda legacy. Ningún cambio de base de datos requerido para esta etapa.

## Verificación y límites

89 pruebas unitarias pasaron: filtros, búsquedas sin evidencia, seguimientos, normalización española, presupuesto, sesión verificada, activación por tenant, caché y roles del proveedor, junto a regresión de historial/mascota/gobernanza. `scripts/tests/help-library-pipeline.mjs` realiza siete comprobaciones con archivos sintéticos en una carpeta temporal validada y eliminada al terminar; no publica la biblioteca real. Vitest resuelve el marcador `server-only` a la implementación vacía de prueba incluida en Next; el guard del build de producción se conserva. ESLint del código nuevo y `git diff --check` pasaron.

Las comprobaciones estructurales no sustituyen revisión editorial ni evaluación de respuestas reales. Los borradores de Gemini no están aprobados, el corpus real está vacío y no se activó el piloto. Los errores de referencias detectados en `help:validate` deben corregirse en el trabajo de Gemini antes de publicar.

## Siguiente secuencia

1. Corregir referencias restantes y revisar el primer lote, incluida la semántica de sus preguntas y disponibilidad real de controles.
2. Preparar revisión explícita, publicar corpus y medir respuestas del piloto local. Mantener pruebas de navegador a cargo del usuario.
3. Añadir recuperación híbrida/índices y resolución interna de embeddings con el nuevo SDK. No reutilizar claves enmascaradas de acciones de UI.
4. Añadir resumen bajo presupuesto y herramientas de lectura acotadas para permisos/módulos/canales, límites distribuidos, observabilidad y streaming.
5. Panel de publicación en super admin y cobertura por módulos. Los bots de Inbox y otras tareas no se migran automáticamente.

La publicación detallada está documentada en `docs/1-product/help-library/reviews/README.md`.
