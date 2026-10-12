# Cierre de las dos entregas Tasks

Fecha: 2026-10-12. Rama `pixyrobotpet`. Snapshot vigente: `tasks-combined-reviewed-20261012.json`. Corpus: 48 artículos, 26 dashboard (6 Tasks) y 22 exclusivos del portal. Revisión compilada: `b4d8246f80785623dda03822d5bb7a9ad045c149b685ff413095d1ddb2b2fcea`.

Gemini realizó la revisión editorial/fuentes y entregó los originales de dashboard bajo `dashboard-preparation/tasks/`, más los borradores revisados del portal. Codex validó contratos, IDs, hashes, filtros, combinación, recuperación y regresiones. No se certifica navegación ni exactitud del modelo por comprobar archivos o hits léxicos.

## Decisiones de integración

- Se conserva la base `public-language-reviewed-20261012.json` para artículos no afectados. El snapshot final de Gemini del portal heredó el hash anterior de `help-history.ts`; no se acepta ni se recalcula ese hash. La revisión técnica más reciente ya válida sustituye esa herencia al combinar.
- Dashboard: se copia la propuesta de seis guías, sustituyendo `tasks.manage-tasks` y añadiendo reuniones, ciclo/vistas, colaboradores/portales, sprints/ritmo e importación. Se eliminan solo campos preparatorios como `replaces` de las entradas del snapshot formal, preservando originales.
- Las guías mixtas de ciclo/vistas y sprints/ritmo requieren también `operations.tasks.manage` de forma conservadora, de acuerdo con la matriz editorial de gestión y sus requisitos. La navegación general sigue disponible con `operations.tasks.view`. Es un filtro de lectura del bot; no corrige ni acredita autorizaciones de mutación del producto.
- Portal: 22 guías reemplazan las 18 anteriores; el artículo técnico combinado queda fuera del snapshot. VCS, diseño, monitoreo y costos exigen su capacidad individual. Soporte colaborativo tiene guía propia, manteniendo el panel exclusivo de soporte restringido.
- La pregunta original Q31 conserva texto, ID y guía esperada. La nueva guía ya explica eliminación en grupo, pero faltaba vocabulario de búsqueda; se añadió únicamente a sus keywords («elimino», «varias tareas», «lista», «eliminar tareas en grupo»). Se conservó su cuerpo y revisión de fuentes de Gemini; Codex firma el cambio de indexación.
- Se corrigió el punto obsoleto de Q31 que trataba el flag del portal como un permiso IAM del dashboard, según el GAP-D01 auditado por Gemini. Se exige lenguaje de autorización de gestión y se conserva la prohibición de afirmar acceso universal. Ninguna pregunta fue eliminada para mejorar tasas.
- Los 70 textos/perfiles/comportamientos originales del portal permanecen intactos respecto al commit `cca18a6a`; cambian referencias de guías cuando corresponden a la división técnica y soporte colaborativo.

## Evaluación separada

| Suite offline | Respuesta con guía esperada | Otras categorías |
|---|---|---|
| Biblioteca dashboard anterior | 56/56 | 4 aclaración, 5 abstención |
| Tasks dashboard | 35/35 | 10 aclaración, 10 abstención |
| Tasks portal | 46/46 técnicos | 1 política casual, 12 aclaración, 11 abstención |

Recuperación en perfiles sintéticos compatibles, con permisos/capacidades explícitos. El evaluador dashboard comprueba que las cinco guías de gestión no sean accesibles con solo lectura y que no entre contenido del portal. Las pruebas del chat verifican además sesión, perfiles, privacidad, persistencia y lenguaje público. Aclaración/abstención, calidad factual, costo y latencia necesitan evaluación del proveedor o prueba manual. No se hicieron llamadas a IA ni navegación automatizada para estos reportes.

Reportes: `pilot-retrieval-report.json`, `tasks-dashboard-retrieval-report.json`, `tasks-portal-retrieval-report.json`. Comandos: `scripts/evaluate-help-retrieval.mjs`, `scripts/evaluate-tasks-dashboard-help.mjs`, `scripts/evaluate-tasks-portal-help.mjs` mediante `tsx`; pipeline sintético y tests CAA antes del build.

## Operación y siguiente paso

Pilotos locales: dashboard V2 en Pixy y Movilservicios; portal Tasks solo Movilservicios. Sin migraciones nuevas ni cambios en acciones de Tasks, organización, módulos, colaboradores o PIN. Compilar y reiniciar con los flags documentados en mantenimiento. El importador/merge fechado es histórico y rechaza sobrescrituras; las próximas entregas necesitan otro snapshot completo revisado.

Prueba manual en Movilservicios: nueva conversación en dashboard y preguntar «¿Cómo crear una reunión?» y «¿Sabes algo del módulo tareas?». Comprobar pasos/nombres de controles y los requisitos de Meet sin afirmar que todas las cuentas estén conectadas. Después, portal de un colaborador: preguntar por su función técnica disponible, repetir un agradecimiento/recomendación y comprobar que facturación conserva el límite de alcance. Confirmar lenguaje humano sin códigos internos y persistencia al cerrar/abrir.

Pendiente separado: los gaps de backend de `dashboard-preparation/tasks/gaps.md` y `portal-preparation/tasks/gaps.md`, especialmente controles de mutación/borrado. La biblioteca y sus filtros no reparan esos hallazgos. No convertir el cierre de esta integración en certificación de seguridad del módulo.
