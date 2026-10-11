# Sincronización de Marketing con master

11 de octubre de 2026. Rama `codex/marketing-campaign-hardening`.

## Cambios incorporados

Se combinó el `master` local en `fadd9ed7` con Marketing en `88f2d990`, mediante un merge que conserva ambos historiales. `master` tenía dos commits posteriores al `origin/master` consultado; no se publicó ni actualizó ninguna rama remota.

- `9eb60dd2`: separa la activación de tenants del alta de organizaciones mediante invitación.
- `fadd9ed7`: provisiona organizaciones transaccionalmente y permite reintentar la activación del propietario.

La integración terminó sin conflictos. Conserva las campañas de WhatsApp y email, su procesamiento y la configuración SMTP del tenant. El cambio entrante en `EmailService` expone la resolución existente de identidad para la activación de tenants; no sustituye el transporte de campañas de email.

## Aislamiento del trabajo

Todo el merge y las comprobaciones se realizaron en `G:/Pixy/agency-manager/tmp/marketing-closeout`. No se modificó ni cambió de rama el checkout principal `NUEVO-MODULO-CARTERA`, ni se instalaron dependencias en su `node_modules` compartido. PGlite se instaló únicamente en un directorio temporal ignorado de este worktree.

Las pruebas de provisionamiento usan una base efímera PGlite. No se aplicó la nueva migración a Docker ni a producción, no se ejecutaron reparaciones históricas y no se enviaron correos. El preview de Marketing en el puerto 3002 se detuvo temporalmente para construir su propia carpeta `.next`; no se detuvieron otros servicios.

## Requisito de despliegue añadido

La versión combinada necesita `supabase/migrations/20261011000000_atomic_tenant_provisioning.sql` antes de desplegar el servidor, además de las migraciones pendientes de Marketing. Revisar el historial del destino y aplicar solo las que falten, siguiendo el orden cronológico y con respaldo. Esta sincronización no despliega ni habilita envíos masivos.

Consultar el [informe de alta de tenants](../tenant-onboarding-hardening.md) y la [etapa 14 de email](implementation-stage-14.md) para sus requisitos y limitaciones. La prueba con SMTP real y la revisión visual autenticada siguen pendientes.

## Validación posterior al merge

- 345 pruebas Vitest aprobadas en 40 archivos: Marketing, rutas de campañas, SMTP/notificaciones, organizaciones, invitaciones, activación, wizard y proxy de autenticación.
- 15 pruebas de provisionamiento y auditoría histórica aprobadas con PGlite, sin conexión a una base externa ni envío real de correo.
- Merge sin conflictos y comprobación de espacios de Git sin errores.
- Build de producción `next build --webpack` completo, incluida la revisión de TypeScript, aprobado con la base local y `MARKETING_EXECUTION_ENABLED=false`. Se mantiene el aviso de múltiples lockfiles propio de la ubicación de este worktree.
