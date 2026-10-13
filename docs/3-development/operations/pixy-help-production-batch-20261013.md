# Migraciones de ayuda pendientes según el resultado de producción

Fecha: 2026-10-13. Resultado aportado por el usuario desde el SQL Editor; no es una consulta remota ejecutada por Codex. El proyecto debe ser el Supabase de **pixy CRM Backend**, `https://app.pixy.com.co`. Coolify despliega manualmente; este SQL no publica código ni dispara despliegues.

## Hallazgos

- Las cinco versiones de ayuda no están registradas. Faltan sus ocho tablas, cinco funciones, trigger y columna de configuración de mascota. Los valores null de privilegios corresponden a objetos ausentes, no a permisos aprobados.
- De las 37 columnas de baseline inspeccionadas, 36 están presentes; falta `organization_members.status`. La función de acceso del historial y la autorización de Tasks dependen de ella.
- Falta también la migración de onboarding `20261011000000` de la base master local y sus objetos. Es un cambio distinto; no se incorpora a este lote de ayuda. El candidato completo no debe desplegarse sin resolver por separado onboarding y sus dependencias.

## Archivo listo para ejecutar

[pixy-help-production-20261013.sql](../../../scripts/migrations/pixy-help-production-20261013.sql) es un lote completo generado desde seis migraciones canónicas del repositorio:

1. `20260619022610_add_member_status`: requisito previo. Añade status con default `active`, conforme al contrato existente; las membresías antiguas recibirán ese valor al añadir la columna. No suspende/reactiva organizaciones ni cambia roles.
2. `20261011000001_platform_robot_pet`.
3. `20261011000003_help_chat_history`.
4. `20261012000004_tasks_portal_help`.
5. `20261012000005_dashboard_help_quota`.
6. `20261012000006_help_function_privileges`.

El lote usa una sola transacción y registra las versiones junto con el SQL fuente. Incluye hashes SHA-256 UTF-8 LF de cada archivo, bloqueo de ejecución concurrente y comprobaciones de objetos/versiones/privilegios. Si los objetos nuevos ya existen o alguna versión de ayuda aparece registrada, se detiene en vez de sobrescribirlos. La dependencia de status puede estar registrada previamente con su nombre correcto; conserva ese registro y comprueba el tipo de columna. No aplicar un fragmento seleccionado del archivo ni repetirlo después de una ejecución correcta.

Ejecutar **todo el archivo** en el SQL Editor del proyecto de producción confirmado, contando con respaldo/restauración disponible. La salida correcta es `result: applied` con seis filas de versión/nombre. Si falla, conservar el error para revisar la causa; no continuar con otros fragmentos. Si se usa una sesión PostgreSQL persistente y queda abortada, ejecutar `ROLLBACK` antes de reintentar; no hay cambios parciales comprometidos.

Después, ejecutar [la consulta de esquema](../../../scripts/migrations/check-pixy-help-release.sql) para confirmar objetos, RLS, políticas y privilegios. El estado de onboarding seguirá pendiente porque este lote no lo instala. Robot, flags, configuración de tenant y despliegue manual se gestionan después; ver [runbook](pixy-help-release-runbook.md).

## Preparación y pruebas

Generador `scripts/migrations/prepare-pixy-help-production.mjs`: solo lee fuentes y genera el SQL, sin conexiones a bases. Pruebas `node scripts/tests/help-production-batch.mjs` con PGlite efímero: instalación sobre baseline sin status/ayuda, seis registros, ocho tablas con RLS, inserción de historial autenticada y funcionamiento del trigger pese a no tener EXECUTE directo, rechazo de segunda ejecución, tabla preexistente preservada, colisión de versión rechazada y error tardío con rollback completo. No usa bases reales, secretos, correo ni IA.

Preparado y probado; **no ejecutado en producción**. No requiere recompilar aplicación porque esta preparación solo añade herramientas/SQL/documentación, sin cambiar el runtime.
