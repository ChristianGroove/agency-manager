# Cierre del push de robot/ayuda y alta de tenants

Fecha: 2026-10-13. Proyecto confirmado por el usuario: **Pixy control**, referencia `amwlwmkejdjskukdfwut`, base de **pixy CRM Backend** en Coolify. El usuario autorizó `npx supabase db push` limitado a robot/ayuda y alta de tenants. Ejecutado desde `tmp/pet-release`, rama `codex/pixyrobotpet-release`, sin migraciones de Cartera. No se hizo push de Git a master ni despliegue de aplicación; Coolify está configurado con despliegues manuales.

## Migraciones aplicadas y registradas

| Versión | Nombre |
|---|---|
| `20261010000000` | `help_tenant_prerequisites` |
| `20261011000000` | `atomic_tenant_provisioning` |
| `20261011000001` | `platform_robot_pet` |
| `20261011000003` | `help_chat_history` |
| `20261012000004` | `tasks_portal_help` |
| `20261012000005` | `dashboard_help_quota` |
| `20261012000006` | `help_function_privileges` |

La lectura directa del destino encontró tres dependencias ausentes: `organization_members.status`, `service_categories.is_active` y `platform_access_invitations.target_organization_type`. Las versiones históricas de estado de miembros/otras dependencias figuraban aplicadas: repetir los archivos antiguos con el CLI no repararía el esquema. Se agregó la migración aditiva `20261010000000`, después de la última versión remota existente y antes de las migraciones pendientes del 11 de octubre. Conserva estados/roles existentes; al añadir columnas faltantes usa defaults canónicos active/true/client. Prueba efímera comprueba repetición sin reemplazar blocked/inactive/reseller y roles previos. Las 15 pruebas de onboarding en PGlite pasaron.

## Incidencia del CLI y recuperación

- CLI del proyecto `2.88.1`: instaló las dependencias; falló en el parser de `provision_tenant_atomic` con SQLSTATE 42601. Una consulta de solo lectura confirmó que onboarding no quedó registrado y sus objetos nuevos no existían: su transacción se revirtió. Las cinco migraciones de ayuda aún no se habían ejecutado.
- La causa coincide con el [bug corregido del parser de identificadores atomic](https://github.com/supabase/cli/pull/5064). Se usó CLI `2.120.0` mediante npx, sin modificar el SQL canónico ni dependencias/lock del repositorio. Nuevo dry-run enumeró únicamente las seis restantes; el push completó esas seis migraciones.
- Comando final: `npx --yes supabase@2.120.0 db push --yes`. No se usó `--include-all`, seeds, roles adicionales ni reparación ficticia del historial. Cada migración tiene su propia aplicación/transacción; no se presenta el push completo como una única transacción global.
- El SQL Editor batch preparado anteriormente no fue ejecutado. Es una alternativa histórica y **no debe ejecutarse ahora** sobre este destino ya actualizado.

## Comprobaciones posteriores reales

Consultas de solo lectura mediante el CLI contra el proyecto confirmado, sin leer preguntas, respuestas, tokens, PIN ni datos de clientes:

- Siete versiones presentes con sus siete nombres correctos.
- Las 37 columnas del preflight de ayuda están presentes; la consulta ampliada de alta de tenants no encuentra columnas faltantes.
- Ocho tablas de ayuda existentes, todas con RLS. Ninguna permite lectura/escritura anónima. Dashboard permite SELECT/INSERT authenticated bajo las cuatro políticas de historial; sin UPDATE/DELETE. Portal/contador dashboard no dan SELECT/INSERT/UPDATE/DELETE authenticated ni políticas que amplíen ese acceso.
- Seis funciones inspeccionadas existen con SECURITY DEFINER y privilegios esperados: predicado de historial/quota solo authenticated; begin/finish de portal y provisioning solo service_role; trigger sin EXECUTE directo de anon/authenticated/service_role.
- Columna JSONB pet_config NOT NULL, trigger de límite de historial y tabla de solicitudes de onboarding presentes.
- Último dry-run con CLI `2.120.0`: `upToDate: true`, `migrations: []`, `seeds: []`, `roles: []`.

La comprobación no prueba respuestas reales, latencia/coste ni altas de clientes en producción. No se crearon tenants de prueba, enviaron correos, activaron flags de aplicación ni se automatizó navegador. El usuario realiza aceptación del sistema tras el despliegue manual.

## Continuación

La preparación de base para este candidato está completa. Falta integrar/publicar el código revisado en master dentro del alcance autorizado, desplegar manualmente en Coolify y configurar activación/tenants de ayuda y mascota. Confirmar la referencia remota actual antes de integrar, sin incorporar los commits de Cartera ni alterar checkouts ajenos.

Las ramas históricas de Cartera conservan versiones que colisionan con onboarding/robot; antes de publicar Cartera deberán resolver sus versiones sobre el historial real. No ejecutar un db push desde el checkout root de Cartera asumiendo que una versión coincidente tiene el mismo contenido. Este cierre no alteró sus archivos ni commits.
