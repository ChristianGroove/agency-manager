# Preflight de integración y migraciones de Marketing

13 de octubre de 2026. Candidato: `codex/marketing-campaign-hardening` en `99b6aa6e`; `master` y `origin/master` en `c5918870`.

## Veredicto

La rama contiene el master actual, no tiene archivos pendientes y conserva las validaciones de la segunda sincronización: build/TypeScript y 733 casos comprobados, incluida la repetición aislada de un timeout. Está preparada técnicamente para integrarse. La revisión visual autenticada y el envío controlado con proveedor siguen pendientes: publicar el código no equivale a habilitar masivos.

El diff incorpora también las correcciones de Inbox documentadas en `docs/operations/whatsapp-inbox-fixes-20261009.md` y los cambios previos de Marketing/CRM. No se presenta como un cambio exclusivamente visual ni se afirma ausencia absoluta de impacto. No contiene migraciones ni código de Cartera.

## Comprobaciones reales del destino

Proyecto `Pixy control`, referencia `amwlwmkejdjskukdfwut`, activo y saludable. Consultas de solo lectura, sin extraer mensajes, contactos o credenciales:

- 78 migraciones registradas. Las siete versiones de prerrequisitos, tenants, robot y ayuda ya aparecen aplicadas.
- Exactamente 16 archivos pendientes, todos de Marketing. No faltan fuentes locales de versiones ya aplicadas y no hay otros pendientes en el candidato.
- Tablas originales de Marketing presentes, con RLS; ninguna campaña ni inscripción. No se encontraron secuencias o inscripciones con relaciones inválidas.
- Cero conexiones SMTP guardadas. La activación de email seguirá requiriendo emisor verificado y configuración de producción de la etapa 14.
- Estimaciones del catálogo: aproximadamente 388.000 mensajes (557 MiB con índices) y 24.000 contactos (19 MiB con índices). Son estimaciones, no conteos exactos de personas o conversaciones activas.

La lista exacta y orden de las 16 migraciones se conserva en el [README](README.md#migraciones-de-esta-implementación).

## Candidato acotado y dry-run

Se preparó una copia temporal en `tmp/marketing-production-release` de este worktree, con fuentes canónicas, manifiesto de hashes, configuración sin seeds y vínculo al proyecto confirmado. No se alteró el checkout de Cartera.

CLI `supabase@2.120.0`: el dry-run enumeró únicamente esas 16 migraciones; sus hashes coinciden con los archivos canónicos. La opción `--include-all` es necesaria porque sus fechas preceden a las migraciones de ayuda ya aplicadas. Su uso está limitado por este candidato y por la comparación explícita de la lista esperada; no ejecutarlo desde otro checkout.

Comando de revisión, desde `tmp/marketing-closeout`:

```powershell
npx --yes supabase@2.120.0 db push --workdir tmp/marketing-production-release --linked --dry-run --include-all --skip-vault
```

Para aplicar, retirar `--dry-run` únicamente tras confirmar el alcance. No añadir `--include-seed` ni `--include-roles`. Cada migración incluye su transacción; no se promete atomicidad global de las 16. Si falla una, comprobar qué versiones se registraron antes de continuar.

## Índices y recuperación

Antes del push, crear concurrentemente los tres índices de mensajes/outbox de `20261009173000` y `20261010080000`, con las mismas definiciones canónicas. Estas migraciones usan `IF NOT EXISTS` y reutilizarán los índices. Ejecutar cada CREATE INDEX CONCURRENTLY fuera de una transacción y verificar `indisvalid` y definición antes de seguir; un índice inválido exige reparación explícita.

Los índices de teléfonos/email requieren funciones nuevas y se crearán dentro de sus migraciones sobre la tabla de contactos, actualmente de 19 MiB. Pueden adquirir bloqueos de escritura: observar la aplicación y ejecutar en una ventana adecuada; no declarar que todo el DDL carece de bloqueos.

Se obtuvo con éxito un volcado actual **solo del esquema public**, de 764.242 bytes, guardado en la carpeta temporal ignorada `tmp/marketing-production-release/public-schema-before.sql`. No contiene el respaldo de filas necesario para una recuperación completa. Se verificó el esquema por metadata; un intento adicional de restaurarlo completo en PGlite se detuvo por dependencias externas de Supabase/vector y no se contabiliza como ensayo de las migraciones sobre ese volcado. Las pruebas SQL anteriores de Marketing mantienen su alcance local documentado.

La última copia física completada que informa Supabase es del **12 de octubre de 2026 a las 03:34, hora Colombia**. No hay PITR. Restaurarla perdería los cambios posteriores, incluidas migraciones de ayuda/tenants si no se vuelven a aplicar; el volcado actual de esquema no conserva esas filas. Este límite debe aceptarse o resolverse con un respaldo actual antes de ejecutar DDL de producción.

## Secuencia pendiente

1. Confirmar la aplicación de este lote al proyecto anterior y el punto de recuperación disponible.
2. Crear/verificar los tres índices concurrentes y aplicar solo el lote esperado. No tocar roles adicionales, seeds, Vault o migraciones de Cartera.
3. Verificar las 16 versiones, columnas y tablas nuevas, índices válidos, RLS y privilegios de funciones privadas. Volver a ejecutar el dry-run: no debe quedar ninguna migración pendiente de este candidato.
4. Integrar localmente en master con el checkout de master limpio; no modificar la rama raíz de Cartera. Push y despliegue manual en Coolify son pasos separados.
5. Mantener `MARKETING_EXECUTION_ENABLED=false` hasta revisar la interfaz y hacer un envío pequeño autorizado, comprobando estados, baja y recuperación. No programar envíos como efecto de aplicar SQL.

Este informe prepara y revisa la operación. Todavía no se ejecutaron índices ni migraciones en producción, ni merge a master, push o despliegue.
