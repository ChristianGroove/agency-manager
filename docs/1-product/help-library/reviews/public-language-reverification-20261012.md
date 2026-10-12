# Revalidación técnica: lenguaje público de permisos

Se conserva la revisión editorial de Gemini, los 39 artículos y sus filtros de acceso. No se han corregido ni certificado de nuevo los procedimientos de Tasks. Snapshot completo sucesor: `public-language-reviewed-20261012.json`, basado en `tasks-portal-reviewed-20261012.json`.

La única evidencia existente afectada es `src/modules/features/caa/actions/help-history.ts`, usada por `help.chat-and-history`. Codex revalidó su diff: añade una transformación pura de mensajes del asistente después de la consulta. UUID, sesión autenticada, tenant, propietario, orden y límite de 200 mensajes permanecen comprobados en las consultas. No escribe ni modifica historial almacenado; las preguntas del usuario se conservan. Las pruebas del historial/transporte y los nuevos casos de presentación pasaron.

La capa `public-language.ts` conserva condiciones/negaciones y traduce identificadores de acceso conocidos. Se aplica en prompts, respuestas nuevas/persistencia, duplicados del portal y lectura/render de mensajes antiguos. No cambia claves de metadatos ni concede autorización; las decisiones de acceso continúan antes de la recuperación. El prompt prohíbe enumerar detalles internos. No se presenta esta barrera como detector universal de información sensible ni corrección de los gaps de autorización del módulo.

Los cuerpos editoriales deben sustituir códigos técnicos por lenguaje humano en una futura revisión de Gemini. Los campos internos de filtrado/evidencia y sus códigos canónicos se mantienen separados de los procedimientos para usuarios.
