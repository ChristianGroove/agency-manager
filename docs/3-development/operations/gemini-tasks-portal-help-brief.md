# Encargo editorial: ayuda del portal Tasks

Preparado el 2026-10-12. Este documento no envía un mensaje ni inicia un agente. El usuario lo entrega a Gemini cuando comience el siguiente tramo.

Leer [mantenimiento](pixy-help-maintenance.md) y [plan Tasks](../../2-architecture/modules/pixy-help-tasks-portal-plan.md). Trabajar en `G:\Pixy\agency-manager\tmp\pet-workspace`, rama `pixyrobotpet`. No cambiar el root de Cartera, configuración, dependencias, base, servidores ni Git. Navegador reservado al usuario.

## Alcance y escritura

Revisar en modo lectura código/documentación que respalde el uso real de `/portal/tasks/[token]`, sus componentes, acciones, seguridad PIN y decisiones de capacidades. Escribir exclusivamente en `docs/1-product/help-library/portal-preparation/tasks/`. No leer secretos, tokens reales, `.env`, dumps o datos de usuarios. No llamar modelos de la aplicación ni servicios externos, instalar paquetes, publicar o hacer commits.

Esta es una entrega preparatoria: el contrato actual solo soporta dashboard. No falsificar audiencia `tenant-user` ni ruta `/operations/tasks` para hacer pasar guías del portal por el publicador existente. Codex definirá el contrato publicable después de esta revisión.

## Entregables

- `inventory.json`: vistas/acciones del portal y variantes, estado implementado/parcial/retirado, fuentes/símbolos, perfiles con acceso, condiciones y pruebas manuales pendientes.
- `capability-matrix.json`: por función, cómo se decide visibilidad, cómo se autoriza ejecución, perfiles/capacidades reales, parámetros/contexto necesarios y evidencia. No inventar claves IAM ni equiparar «QA/PM» con permisos globales del dashboard. Distinguir roles, propiedad/asignación y pertenencia a workspaces/proyectos.
- `articles/<id>.md`: una guía por tarea/condiciones homogéneas. IDs propuestos `tasks-portal.<topic>`, título, superficie propuesta `portal.tasks`, patrones de ruta sin token concreto, perfiles/capacidades verificadas, requisitos, pasos/controles reales, resultado, errores y límites, evidencia archivo/símbolo/afirmación, fecha, SHA de referencia y `verification: source-only`. Marcar preparatorio: no es el frontmatter vigente del publicador.
- `questions.json`: 50–100 casos de respuesta, aclaración y abstención, incluyendo seguimientos, cambio de tema, perfiles, funciones ajenas (CRM/facturación/admin), PIN, funciones ocultas y variantes. Por caso: ID, texto, perfil/capacidades, vista, guías esperadas, puntos requeridos, afirmaciones prohibidas y comportamiento esperado.
- `gaps.md`: contradicciones entre UI/backend, controles parciales, funciones que no deben presentarse disponibles y cuestiones técnicas. No arreglar código para acomodar una guía.
- `handoff.md`: archivos, fuentes y revisión de referencia, cobertura por variante/perfil, lo pendiente y pruebas manuales. No certificar navegación ni IA con una validación de archivos.

## Reglas editoriales

Ayuda exclusivamente Tasks y uso del portal. Generalidades permitidas: navegación, acceso/PIN y controles del propio portal comprobados. Excluir procedimientos de gestión global del tenant, CRM, facturación y administración de otros módulos.

No copiar la guía del dashboard como guía del colaborador. No describir como disponible una función que existe en dashboard pero no está expuesta/autorizada en portal. Separar guías si cambian condiciones de acceso. Un control oculto no demuestra que una acción backend esté protegida: verificar y registrar ambas cosas.

No incluir datos personales, tokens/PIN, payloads reales, detalles secretos ni instrucciones de implementación en el contenido para el usuario. Las notas internas pueden ir al final en `Notas de verificación`.

## Cierre

Comprobar IDs cruzados, archivos/símbolos y coherencia de variantes/capacidades. Registrar las comprobaciones que realmente ejecutaste; no ejecutar `help:publish` ni afirmar que `help:validate` acepta este contrato preparatorio. Entregar conteos de `answer`, `clarify`, `abstain` separados. Si Codex cambia una fuente mientras trabajas, marcarla para reverificación. Informar al usuario al terminar, sin enviar mensajes automáticamente a otros chats.
