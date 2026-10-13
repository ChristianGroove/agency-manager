# Cierre de migraciones de Marketing e integración local

13 de octubre de 2026. Proyecto confirmado: **Pixy control**, referencia `amwlwmkejdjskukdfwut`, backend Pixy en Coolify.

El usuario autorizó explícitamente aplicar las 16 migraciones de Marketing y hacer el merge local a master, sin Cartera, push ni despliegue. Aceptó el punto de recuperación descrito en el [preflight](production-preflight-2026-10-13.md): esquema public actual guardado localmente y última copia física completa del 12 de octubre a las 03:34 (Colombia), sin PITR.

## Aplicación real

Se crearon concurrentemente `marketing_inbound_reply_lookup`, `marketing_outbox_enrollment` y `marketing_operation_enrollment_lookup`. Una consulta comprobó sus definiciones y `indisvalid=true` antes del push. Las migraciones canónicas reutilizaron esos índices.

El CLI `supabase@2.120.0` ejecutó las 16 migraciones del manifiesto verificado desde `tmp/marketing-production-release`, preparado dentro del worktree de Marketing. Comando:

```powershell
npx --yes supabase@2.120.0 db push --workdir tmp/marketing-production-release --linked --include-all --skip-vault --yes
```

`--include-all` permitió aplicar versiones de Marketing anteriores a las de ayuda ya registradas; el dry-run y los hashes limitaron el lote a los 16 archivos de Marketing. No se incluyeron seeds, roles adicionales, Vault o migraciones de Cartera. Cada archivo tiene su transacción: no se describe el conjunto como una transacción única.

Las versiones aplicadas, en orden, son:

`20261009120000`, `20261009143000`, `20261009160000`, `20261009173000`, `20261009200000`, `20261010003000`, `20261010020000`, `20261010040000`, `20261010050000`, `20261010060000`, `20261010070000`, `20261010080000`, `20261011120000`, `20261011123000`, `20261011130000`, `20261011133000`.

## Verificación posterior

Consultas reales de solo lectura, sin leer contenido de clientes o credenciales:

- Dieciséis versiones presentes en el historial.
- Catorce tablas añadidas presentes, todas con RLS y sin privilegios anónimos SELECT/INSERT/UPDATE/DELETE.
- Cincuenta y seis firmas de funciones privadas inspeccionadas: existen y no permiten EXECUTE a `anon` ni `authenticated`.
- Las cinco columnas de contrato del emisor/canal/snapshot comprobadas en `marketing_campaigns` están presentes.
- Ningún índice `marketing_%` inválido.
- Cero campañas y cero inscripciones, como antes de la operación; las migraciones no crearon ni activaron envíos.
- El dry-run final informa **Remote database is up to date**, sin migraciones pendientes del candidato.

Logs y respuestas de metadata en `tmp/marketing-production-*` del worktree, ignorados por Git. La copia del esquema se conserva temporalmente allí; no se exportaron filas como parte de este cierre.

## Código y continuidad

El código ya pasó build/TypeScript y las pruebas documentadas en la [segunda sincronización](master-sync-2026-10-13.md). Este cierre solo añade documentación: no requiere repetir esas pruebas de implementación.

Se integra en el checkout limpio de master con avance rápido desde el candidato de Marketing. La rama y el checkout raíz de Cartera permanecen independientes. No se publica Git ni se despliega en Coolify como parte de esta operación.

El siguiente paso de publicación sigue siendo desplegar manualmente aplicación y configuración compatibles. Mantener `MARKETING_EXECUTION_ENABLED=false` hasta la revisión visual autenticada y una campaña pequeña con destinatarios propios/autorizados. Email requiere SMTP verificado, URL HTTPS de bajas y la clave de cifrado compatible con las cuentas existentes, según la [etapa 14](implementation-stage-14.md). La migración no integra entrega/lectura SMTP, respuestas en Inbox ni SMS.
