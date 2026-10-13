# Encargo para Gemini: biblioteca oficial de ayuda de Pixy

## Objetivo y alcance

Construye borradores verificables de la biblioteca de ayuda de Pixy mediante lectura selectiva de documentación y código. La integración, contratos de recuperación, autorización, indexación y publicación están a cargo de Codex. Tu entregable es contenido y evidencia; no cambios funcionales.

Trabaja exclusivamente en `G:\Pixy\agency-manager\tmp\pet-workspace`, rama `pixyrobotpet`. El checkout raíz `G:\Pixy\agency-manager` pertenece a otro trabajo con cambios pendientes: no lo modifiques ni cambies su rama. Antes de empezar, comprueba la rama y registra `git rev-parse HEAD` como revisión de referencia. Lee las instrucciones AGENTS aplicables si existen.

Puedes leer los archivos de este checkout para comprobar comportamiento. Solo puedes escribir dentro de `docs/1-product/help-library/drafts/`. No modifiques `src`, configuraciones, dependencias, migraciones, bases de datos ni documentos existentes fuera de esa carpeta. No ejecutes servidores, navegadores, instalaciones, modelos/API externos ni comandos de Git que cambien estado. No hagas commit, push, reset, checkout, stash ni clean. No reviertas cambios ajenos. Codex se encarga de integrar y guardar el resultado.

## Fuentes y método

Empieza por `docs/2-architecture/modules/pixy-help-context-audit.md` y los índices de documentación. Usa `rg` para localizar módulos y leer únicamente secciones pertinentes. Prioriza:

- Rutas y componentes realmente presentes en `src/app/(dashboard)` y módulos relacionados.
- `src/modules/core/organizations/capabilities-registry.ts`, servicios de habilitación y permisos IAM.
- `src/modules/features/caa` y los documentos recientes de mascota/historial.
- Documentación de producto y arquitectura relevante, contrastada con el código actual de esta rama.

La documentación antigua no demuestra comportamiento actual. El código por sí solo tampoco demuestra disponibilidad en un despliegue ni buen funcionamiento en navegador. Distingue implementación, habilitación por tenant y verificación manual. No uses otras ramas como evidencia de funciones disponibles. No leas archivos secretos, `.env`, claves, dumps ni datos reales de clientes. No copies implementación interna al contenido que verá el usuario.

## Primera entrega: inventario, luego artículos

Entrega `inventory.json` con este formato inicial:

```json
{
  "schema_version": 1,
  "source_revision": "SHA de referencia",
  "modules": [
    {
      "id": "id estable basado en el módulo real",
      "name": "Nombre visible",
      "implementation_status": "implemented|partial|planned|retired|unknown",
      "routes": ["ruta comprobada"],
      "evidence_paths": ["archivo relativo al checkout"],
      "article_ids": [],
      "gaps": [],
      "manual_checks_pending": []
    }
  ]
}
```

Los valores separados por `|` son opciones: elige uno, no copies la lista literal. No inventes identificadores de permisos, módulos ni rutas. Si no existe una correspondencia estable, documenta la duda. Completa el inventario con módulos descubiertos en el checkout, incluidos los pendientes o retirados, sin convertir estos últimos en artículos que los presenten como disponibles.

Prioridad de artículos: dashboard, cambio de tema, mascota, historial de ayuda, ADN de marca y acceso a módulos/permisos. Después Inbox, CRM, facturación, automatizaciones y verticales que estén presentes. Avanza por lotes completos y registra la cobertura restante. Evita recorrer todo el repo repetidamente.

## Artículos

Un Markdown por tarea del usuario, dentro de `articles/`, con nombre estable `<module>.<topic>.md`. Usa este frontmatter inicial, conservando las claves:

```yaml
schema_version: 1
id: dashboard.change-theme
title: Cambiar entre tema claro y oscuro
module: dashboard
status: draft
audience: tenant-user
source_revision: SHA de referencia
verified_on: YYYY-MM-DD
verification: source-only
routes:
  - /dashboard
keywords:
  - tema
  - oscuro
requirements: []
evidence:
  - path: archivo/real/relativo.tsx
    symbol: función o componente comprobado
    claim: qué afirmación respalda
```

`audience` admite `tenant-user`, `tenant-admin` o `platform-admin`. Son clasificaciones editoriales iniciales, no autorización del runtime. Describe permisos exactos comprobados en `requirements` y en el artículo. Si no puedes verificarlos, registra esa carencia; no marques acceso universal. Todos los artículos quedan `draft` y `source-only`: la publicación y pruebas manuales se harán después. La fecha expresa la revisión de fuentes, no una prueba de navegador.

Contenido mínimo: propósito; requisitos; ubicación; pasos concretos; resultado esperado; problemas habituales y causas comprobadas; limitaciones; temas relacionados. Usa español claro y nombres visibles reales. Los detalles para revisión técnica pueden ir en una sección final `Notas de verificación`, que se excluirá de la publicación.

No inventes botones, rutas, estados, errores, mensajes ni causas. Una función con archivos pero sin conexión a la UI es parcial, no disponible. Cuando haya contradicción o duda, documenta el punto en `gaps.md`; omite pasos no comprobados. No conviertas inferencias en hechos.

## Evaluación y cierre

Entrega `questions.json` con 50–100 preguntas sobre módulos cubiertos, incluyendo seguimientos, funciones retiradas, falta de permisos y preguntas sin evidencia. Por pregunta: `id`, `question`, `audience`, `view_id` si está verificado, `expected_article_ids`, `expected_points`, `must_not_claim`, `expected_behavior` (`answer`, `clarify` o `abstain`). Este archivo es una propuesta de evaluación, no una prueba ejecutada ni una certificación de calidad.

Entrega también `gaps.md` y `handoff.md`: archivos creados, cobertura, revisión de referencia, contradicciones, cuestiones que requieren revisión y siguiente lote. No afirmes cobertura total si hay módulos sin revisar.

Antes de terminar, comprueba enlaces locales, evidencia y coherencia entre IDs del inventario, artículos y preguntas. Verifica mediante `git status` que tus cambios están exclusivamente en la carpeta autorizada. No ajustes el código para que encaje con tus artículos; documenta el comportamiento que existe.

## Coordinación

Codex puede trabajar en código mientras elaboras contenido, con carpetas separadas. Toma la revisión inicial como referencia; si un archivo cambia durante la lectura, anótalo para revisión en la integración. Cuando termines cada lote, informa al usuario qué archivos están preparados. No solicites ni envíes mensajes automáticamente a otros chats.

El contrato editorial es inicial y podrá ajustarse mediante el validador de integración. Ningún borrador entra al contexto del chat hasta pasar los controles de publicación. La revisión editorial contra código corresponde a Gemini; Codex comprueba estructura, hashes, contratos de permisos y comportamiento técnico, sin repetir la lectura documental completa.

## Reparto actualizado por instrucción del usuario (2026-10-12)

Gemini es responsable de toda la lectura y verificación de código necesaria para mantener los artículos exactos, vigentes y alineados: descubrimiento de funciones, rutas, controles visibles, condiciones, permisos, estados, errores y procedimientos. También revisa y actualiza las preguntas de evaluación. Codex se concentra en recuperación, contexto de sesión, formato, publicación, autorización del runtime, rendimiento y pruebas técnicas. El usuario conserva la verificación manual en navegador.

No atribuyas tu revisión a Codex ni marques pruebas manuales como realizadas. Los artículos permanecen como borradores hasta publicarlos mediante el pipeline. La validación automática no certifica por sí sola sus afirmaciones. No publiques, cambies código o modifiques Git.

### Próxima entrega

1. Prioriza profundidad de Inbox/CRM: filtros, notas internas, respuestas guardadas frente a plantillas oficiales, asignación, canales, automatizaciones o bot cuando existan, estados y errores. Una guía general no equivale a cobertura completa. Conserva la entrega actual y añade guías por tarea solo donde puedas verificar implementación y condiciones.
2. Revisa los otros doce artículos no publicados y corrige también cualquier artículo ya publicado si descubres discrepancias. Codex realizó ajustes finales en varios borradores: parte del estado actual de la rama, no de una copia anterior.
3. Para cada artículo listo, mapea sus requisitos a `required_modules`, `required_permissions`, `verticals` y audiencia. Usa exclusivamente claves existentes. No inventes permisos ni rellenes arrays vacíos sin justificar que el procedimiento es general. Distingue leer una guía, ver el control y poder ejecutar una acción.
4. Entrega `drafts/publication-review.json` conforme al contrato `reviewSchema` de `src/modules/features/caa/library/schema.ts` y al ejemplo de `reviews/README.md`. Incluye SHA-256 del borrador UTF-8 completo y de todas sus evidencias, `reviewed_by` identificando a Gemini y fecha real de revisión. Lee y verifica las afirmaciones ANTES de calcular los hashes. Esta propuesta no activa ni publica contenido.
5. La propuesta representa la instantánea completa deseada del corpus: incluye artículos publicados que deben mantenerse y nuevos artículos revisados. No incluyas artículos incompletos solo para evitar perder cobertura. Registra cualquier retiro necesario explícitamente en `handoff.md` para que Codex pueda distinguirlo de una omisión.
6. En `handoff.md`, presenta por lote: artículos listos, correcciones, justificación de los filtros, fuentes revisadas, funciones parciales y verificaciones manuales pendientes. Añade cualquier discrepancia de código o seguridad a `gaps.md`; no arregles implementación para acomodar un artículo.
7. Ejecuta `npm run help:validate` y registra el resultado. No ejecutes `help:publish`, builds, servidores ni llamadas a modelos para evaluar respuestas.

La carpeta de escritura sigue siendo exclusivamente `docs/1-product/help-library/drafts/`. La propuesta de publicación vive allí, sin modificar los archivos de revisión/publicación de Codex. Codex valida mecánicamente la propuesta y los filtros, ejecuta pruebas técnicas y controla la integración. Si falta evidencia o hay una contradicción de autorización, el artículo se devuelve a Gemini con una incidencia concreta, en lugar de rehacer aquí su lectura.
