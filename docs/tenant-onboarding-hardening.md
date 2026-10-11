# Alta de tenants: transacción, activación y revisión histórica

## Publicación

1. Aplicar `supabase/migrations/20261011000000_atomic_tenant_provisioning.sql` con el mecanismo de migraciones del entorno **antes** de desplegar esta versión del servidor. Requiere el baseline y las migraciones existentes de estado de miembros, configuración del portal y `provisioned_by`.
2. Desplegar el servidor desde `master`. La versión anterior exportaba una acción que consumía invitaciones fuera de la transacción; evitar tráfico a esa versión mientras se publica el cambio.
3. Probar un cliente y un reseller creados directamente con correo nuevo, con cuenta existente y por invitación autónoma. Completar la activación, cerrar sesión y entrar otra vez. Repetir una solicitud y verificar que conserva el tenant. Probar reenvío desde administración y desde la cuenta reseller.

La migración agrega una tabla de solicitudes y funciones limitadas a `service_role`. También retira el acceso de `anon`/`authenticated` a la tabla de invitaciones: su validación pública sigue pasando por la acción del servidor. La asignación compartida de apps sigue disponible para administradores de plataforma autenticados y se autoriza dentro de PostgreSQL.

## Garantías

- Una transacción crea organización, espacio, propietario/proxy, roles, ajustes, suscripción y CRM. El consumo de la invitación se confirma junto con esos registros. Un error revierte el conjunto.
- Un bloqueo por usuario y un registro único de solicitud reutilizan el tenant en reintentos. La invitación se bloquea antes de revisar vigencia, correo y cupos. Dos cuentas no pueden consumir la misma plaza.
- Las solicitudes directas se identifican por sus datos normalizados y actor. El slug se conserva; una colisión muestra un error para que el administrador elija otro.
- La cuenta de Auth se resuelve antes de crear el tenant. Auth y correo son servicios externos y no forman parte de la transacción de PostgreSQL: una falla posterior no borra datos del cliente. La activación registra `pending/sending/sent/failed` y permite reenviar sobre el mismo tenant.
- El reenvío solo toma el correo del propietario persistido; exige membresía real, activa y no eliminada. Los resellers solo acceden a clientes de su red. Se aplica un intervalo de un minuto entre intentos; las reclamaciones vencidas pueden retomarse y un intento viejo no sobrescribe el resultado de otro.
- Los reintentos no vuelven a ejecutar el inicializador anterior de CRM, que borraba pipelines y estados antes de crearlos.
- El trigger del baseline crea siete etapas antiguas sin pipeline. En un alta nueva se sustituyen esas etapas por la plantilla del espacio dentro de la misma transacción; los reintentos conservan el CRM existente.

## Auditoría y reparación histórica

Consulta de solo lectura con paginación y credenciales del entorno indicado:

```powershell
node --env-file=.env.local scripts/audit-tenant-onboarding.cjs --output tenant-audit.json
```

El informe distingue reparaciones verificables, propiedad sin verificar y candidatos a duplicado por propietario/nombre. Varias membresías de propietario son válidas cuando `owner_id` identifica un propietario activo real. Los candidatos a duplicado son indicios, no autorización para eliminar datos.

Después de revisar el informe, las reparaciones inequívocas pueden aplicarse con:

```powershell
node --env-file=.env.local scripts/audit-tenant-onboarding.cjs --apply-safe --output tenant-repair.json
```

La función vuelve a verificar las propuestas bajo bloqueo. Solo completa propiedad desde un propietario real único, desde el `owner_id` persistido con membresía elegible o desde una invitación almacenada en `app_metadata` administrativo. No desbloquea miembros ni usa metadata editable para otorgar propiedad. No elimina ni fusiona tenants. Un proxy de soporte permanece como administrador cuando se identifica al propietario real.

Auditoría realizada el 11 de octubre de 2026 contra **la base local `127.0.0.1:55321`**: 15 organizaciones, cero reparaciones inequívocas y cero grupos candidatos a duplicado según ese criterio. `test-resto-reseller` solo tiene un proxy de soporte como propietario; el usuario confirmó que es una organización de prueba. Se conserva. No se auditaron ni modificaron datos de producción.

## Pruebas

- `npm run test:tenant-db`: PostgreSQL efímero (PGlite), regresiones de transacción, reintentos, cupos, permisos, módulos, envío y reparación; no requiere ni modifica una base externa.
- Pruebas Vitest de organizaciones, invitaciones, activación, wizard, cookies y rutas de autenticación.

PGlite procesa las solicitudes en una conexión; las pruebas de solicitudes simultáneas comprueban los resultados de solicitudes encoladas. La protección entre sesiones está implementada con bloqueos transaccionales y restricciones únicas. La prueba con correo real y varios navegadores corresponde a la verificación del entorno desplegado.
