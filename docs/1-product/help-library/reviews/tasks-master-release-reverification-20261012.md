# Traslado de la ayuda a una base master sin Cartera

Fecha: 2026-10-12. Rama de entrega: `codex/pixyrobotpet-release`. Checkout: `G:\Pixy\agency-manager\tmp\pet-release`. Base: master local `fadd9ed7`, que conserva sus dos commits de onboarding. No se ha fusionado master, publicado la rama ni ejecutado migraciones remotas.

## Historia y alcance

El reflog de `pixyrobotpet` registra creación desde `4d94f323` el 11 de octubre a las 18:53. Ese commit ya incluía cinco commits de Cartera. Se trasladaron los 30 commits posteriores, `4d94f323..751aa83b`, usando cherry-pick con `-x` para preservar su procedencia. El resultado inicial es `4afcb519`, sin conflictos; Git combinó package/lock con los cambios que ya tenía master.

El diff contra master no contiene código, pruebas, seeds o migraciones de Cartera. Las tres migraciones nuevas son robot, historial dashboard e historial de portal. Sus versiones son únicas en este candidato. Las ramas y worktrees originales conservan sus referencias y el piloto de 3005 no se reinició ni cambió de rama.

## Revisión de biblioteca preservada

- Gemini conserva la autoría de la revisión editorial y de fuentes de los 48 artículos. No se repitió esa lectura completa.
- Al separar la base, dos evidencias difieren: `module-config.ts` pierde únicamente el import de Landmark y el registro de la ruta/módulo Cartera; `capabilities-registry.ts` pierde únicamente la capacidad Cartera y su inclusión en el preset retail. Los registros y filtros relevantes para las cinco guías afectadas permanecen iguales.
- Codex comprobó ese diff acotado y firmó la verificación técnica adicional de `billing.manage-invoices`, `crm.crm-reports`, `crm.manage-contacts`, `dashboard.overview` y `resto.manage-orders`. No modificó sus borradores ni filtros.
- El inventario activo deja de incluir la entrada Cartera, que tenía cero artículos y apuntaba a fuentes ausentes en master. El inventario original permanece en el historial de `pixyrobotpet`; el resto de entradas del candidato se conserva. Esta retirada no afirma que el módulo no exista en otros desarrollos.
- El nuevo checkout convierte CRLF/LF en borradores y cuatro evidencias. El snapshot nuevo declara `hash_encoding: utf8-lf`; normaliza únicamente CRLF a LF en textos y hashes. Las revisiones históricas no se sobrescriben ni cambian de contrato.

El script histórico `scripts/prepare-help-master-review-20261012.mjs` comprobó los hashes originales de los 48 borradores y 107 evidencias. Solo aceptó texto idéntico tras normalización de saltos de línea, o las dos eliminaciones literales anteriores. Rechaza cambios sustantivos inesperados y sobrescritura del snapshot; no sirve para refrescar hashes en próximas intervenciones.

Snapshot vigente: `tasks-master-release-reviewed-20261012.json`. La publicación produjo exactamente el mismo objeto JSON del corpus previo, incluidos contenido, filtros y revisiones individuales. SHA de revisión: `b4d8246f80785623dda03822d5bb7a9ad045c149b685ff413095d1ddb2b2fcea`.

## Verificación del candidato

- `npm ci` instaló 1342 paquetes en un directorio propio del nuevo worktree. Las dependencias resuelven dentro de ese directorio; no hay junction al root ni runtime Markdown auxiliar. Package y lock coinciden y preservan las dependencias/scripts de onboarding de master.
- Validación estructural: 48 artículos y referencias de las 65 preguntas originales correctos. Publicación portable correcta; corpus idéntico al piloto.
- Pipeline sintético: acepta CRLF/LF con contrato explícito y genera contenido idéntico; el contrato histórico sigue rechazando cambios de saltos. Ambos mantienen rechazo de cambios sustantivos, rutas inválidas, evidencia fuera del checkout y publicación de portal sin perfiles. Los fallos preservan el corpus previo.
- Vitest: 207 pruebas correctas en 27 archivos de robot, CAA, gobernanza de IA, proveedor Google simulado, roles del portal y privacidad del logger. Sin llamadas a modelos reales ni navegador automatizado.
- Recuperación offline: 56/56 dashboard original, 35/35 Tasks dashboard, 46/46 casos técnicos de portal y una política local; filtros de gestión y separación de superficies conservados. No mide respuestas reales, coste o latencia.
- Build estándar `npm run build`: correcto, exit 0; compilación, TypeScript, generación de páginas y trazas completados con dependencias propias. Sin mocks ni caché copiada del piloto. La configuración ignorada se copió únicamente después de verificar Supabase loopback en 55321/55322. Conserva advertencias locales preexistentes de clave Flows y raíz de tracing del worktree anidado; no se alteró configuración global para silenciarlas.

Las ejecuciones iniciales de Vitest y SWC encontraron bloqueos de rutas por el sandbox Windows; las ejecuciones autorizadas fuera del sandbox usan este checkout y no la aplicación de producción. El primer intento de build fuera del sandbox falló por timeout de Google Fonts. Una comprobación posterior de DNS/HTTPS de Node confirmó HTTP 200 y se repitió el build estándar, sin mocks ni modificaciones de fuentes tipográficas.

Pendientes de publicación: cuota compartida del dashboard, guards de mutación de Tasks, verificación del destino/historial SQL, variables y proveedores del entorno real, revisión manual del candidato y activación gradual. Ver [preparación de producción](../../../3-development/operations/pixy-help-production-readiness.md).
