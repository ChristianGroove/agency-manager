# Marketing: verificación integrada local

15 de octubre de 2026. Checkout `G:/Pixy/agency-manager-master`, rama `master`, base `372884cb6475afa01e8bf9a04e393c5cf5ec5019` con los cambios locales de interfaz. Este informe registra la verificación previa al commit de cierre solicitado posteriormente. No se hizo push, despliegue remoto, migración ni envío a proveedores. El usuario aplazó el piloto con emisores y destinatarios reales. El [estado vigente y pendientes](module-state-2026-10-15.md) consolida la entrega.

## Resultado

La base local admite los contratos actuales de campañas WhatsApp y email. Pasaron las ocho suites SQL reales, 295 pruebas de Marketing/rutas/SMTP en 30 archivos y el build completo de producción en una copia aislada. El worker local autentica correctamente y confirma ejecución deshabilitada. Esto no acredita recepción real ni el estado actual de Coolify o de la base remota.

La historia comprobada fue: formulario autenticado → acciones de lectura → PostgREST/base local; contratos de importación, consentimiento, guardado, activación y recuperación → PostgreSQL con fixtures y rollback; launcher → endpoint del worker con ejecución apagada.

El recorrido de creación/guardado/reapertura desde la interfaz con un emisor configurado queda pendiente del piloto aplazado: la organización abierta no tiene un emisor disponible. No se insertaron emisores ficticios en esa organización para forzar el recorrido.

## Base y aislamiento

Destino confirmado por `.env.local`, configuración de Supabase y puertos del contenedor:

- API local `55321`; PostgreSQL local `55322`; contenedor `supabase_db_agency-manager`.
- PostgREST responde `200` a una lectura del contrato de campañas.
- Diecinueve tablas `marketing_%` con RLS activado; ningún índice Marketing inválido.
- Cinco columnas del contrato de campaña presentes: canal, SMTP, conexión, versión y audiencia.
- Doce funciones de importación, activación, métricas y registro del worker presentes; las operaciones privadas inspeccionadas no son ejecutables por `anon` ni `authenticated`. La lectura de métricas mantiene su permiso autenticado.
- Dos campañas globales en borrador; cero inscripciones, outbox email vacío y cero ejecuciones registradas del worker antes/después de las comprobaciones.
- Cuatro emisores WhatsApp activos y tres plantillas aprobadas en el conjunto de organizaciones locales. La organización abierta no muestra emisor autorizado disponible; no se usaron canales de otra organización.
- Cero cuentas SMTP locales. `.env.local` no declara `SMTP_ENC_KEY`; no se creó una clave ficticia ni se cambiaron credenciales existentes.

El historial local de migraciones no contiene las dieciséis versiones canónicas de Marketing consultadas, aunque las tablas y funciones existen y pasan las pruebas SQL. Esto describe un historial local sin esas entradas; no demuestra que falten los objetos ni justifica reaplicar migraciones sobre ellos. La aplicación documentada de migraciones remotas del 13 de octubre se conserva como evidencia histórica, sin atribuirle una nueva verificación remota.

## Ocho suites SQL reales

Ejecutadas secuencialmente mediante `psql` en Docker local, con timeout, datos sintéticos y `ROLLBACK`:

| Archivo en `scripts/tests/` | Resultado |
|---|---|
| `marketing-security.sql` | Correcto |
| `marketing-reviewed-operations.sql` | Correcto |
| `marketing-workspace.sql` | Correcto |
| `marketing-editor-controls.sql` | Correcto |
| `marketing-contact-lists.sql` | Correcto |
| `marketing-simple-lists.sql` | Correcto |
| `marketing-recipient-followups.sql` | Correcto |
| `marketing-email.sql` | Correcto |

Cubren aislamiento, permisos, importaciones sin autorización implícita, conservación de bajas/datos, diseño guardado, orden de pasos, tickets, activación idempotente, reserva/recuperación, respuesta WhatsApp, frecuencia, baja email, métricas/historial y ACL privadas. Ninguna suite contacta a Meta o SMTP.

Los conteos persistidos de organizaciones, contactos, campañas, inscripciones, listas, SMTP y outbox se conservaron tras las suites. Las fixtures no quedaron guardadas.

## Worker local

El primer intento de consultar `/api/marketing/run` agotó 60 segundos mientras el proceso de desarrollo registraba compilación de la ruta. Ese proceso consumía aproximadamente 17 GB de memoria. Se identificaron sus procesos por el puerto 3001 y el comando de `master`, y se reinició únicamente ese Next.js, con `MARKETING_EXECUTION_ENABLED=false`. No se reinició Docker ni otro servidor.

Comprobaciones posteriores:

| Comprobación | Resultado |
|---|---|
| Launcher con ejecución deshabilitada | `{ disabled: true }`, sin invocar fetch |
| POST sin credencial | `401` |
| POST con la credencial local, sin imprimirla | `200`, `success: true`, `disabled: true` |
| Trabajos procesados/fallidos/diferidos | `0 / 0 / 0` |

El endpoint y sus guards se comprobaron de verdad. Se conservó el bloqueo de ejecución; no se midió un ciclo real de transporte ni se confirmó el programador remoto.

## Concurrencia y carga sintética

Se actualizó `scripts/tests/marketing-concurrency.py`, que había quedado desfasado respecto de los wrappers SQL de respuesta/frecuencia y de la separación del claim email. Ahora copia sus dependencias actuales al esquema aislado.

El ensayo crea estructuras y fixtures en un esquema de nombre aleatorio, revoca acceso público y elimina únicamente ese esquema tras comprobar su propietario. No escribe fixtures en las tablas públicas de la aplicación.

- Cola de 6.000 destinatarios WhatsApp sintéticos, 30 canales, 8 trabajadores y 66 llamadas de claim.
- 573 leases únicos adquiridos durante el ensayo; cero leases duplicados.
- Los 30 canales aparecen en las dos primeras tandas: sin inanición de los números nuevos frente al backlog antiguo del caso probado.
- Lease vencido recuperado con token nuevo; checkpoint del trabajador antiguo rechazado.
- Ocho reservas concurrentes de campañas que comparten número físico: solo una permitida.
- Latencia observada del claim, incluyendo invocación de Docker/psql: p50 344,23 ms; p95 394,19 ms.
- Cero esquemas `marketing_test_%` restantes en la comprobación posterior.

Hash de las definiciones SQL copiadas: `2c89c77a56dd850a4ba600737979ae4d8ff42e7fe036a0ff842aff74f70ade39`.

Este ensayo comprueba los casos de coordinación descritos; no representa 6.000 mensajes enviados ni una medición de entregabilidad o de capacidad SMTP/Meta.

## Correcciones encontradas en el recorrido real

1. Un borrador antiguo sin audiencia se presentaba como «Cambios sin guardar» al abrirlo, aunque no hubiera ediciones. Se separó la ausencia de audiencia de la detección de cambios. Abrir/cerrar ya no pide descarte; guardar explícitamente sigue creando la audiencia pendiente. Comprobado en la UI autenticada sin modificar el borrador y con dos pruebas de regresión.
2. La ayuda decía que email no estaba habilitado y describía una confirmación adicional. Se actualizó al flujo de WhatsApp/email e inicio directo, y se añadió la explicación de SMTP, bajas y resultados inciertos. No se publicó contenido mediante servicios externos.
3. El ensayo de concurrencia no podía ejecutarse con las dependencias actuales. Se corrigieron sus copias de funciones/tablas y pasó el caso completo, manteniendo el aislamiento.

## Build y pruebas

- 295 pruebas aprobadas, cero fallos, 30 archivos de Marketing/rutas/SMTP.
- `next build --webpack`: completo, incluyendo TypeScript, generación de 52 páginas y trazas.
- Build en una copia de los archivos actuales de `master`, con salida propia y dependencias existentes; no se usó ni borró la salida `.next` del servidor 3001. No se copiaron archivos `.env`; la configuración local se suministró solo al proceso y la ejecución de Marketing se forzó a `false`.
- El build conserva avisos ajenos a esta corrección: raíz inferida por lockfiles anidados de la copia, inicialización de Calling, página con runtime Edge y clave de FlowsCrypto no cargada. No impidieron compilar. El resultado no certifica la configuración operativa de esos módulos en producción.

La evidencia local detallada queda en `G:/Pixy/agency-manager/scratch/marketing-ui-20261014/`: `local-db-preflight.json`, `local-sql-results.json`, logs SQL, `worker-disabled-results.json`, `local-concurrency-results.json`, `isolated-build-results.json` y `isolated-build.log`. Los resultados de Vitest están en `tmp/marketing-integrated-final-tests.json` del checkout master. No se guardaron credenciales en esos reportes.

## Pendientes que permanecen

- El usuario aplazó el piloto. Al retomarlo: organización/emisores propios, destinatarios identificados con autorización y recepción/baja/pausa/reanudación comprobadas por ambos canales.
- Confirmar entonces el despliegue, el programador y la configuración remota actuales. No se cambió Coolify ni producción en esta revisión.
- SMTP requiere conexión verificada y configuración de cifrado compatible antes de enviar. La gestión de rebotes/quejas y las respuestas email en Inbox siguen sin integrarse.
- Resultados SMTP inciertos mantienen protección contra reenvío. Falta cerrar el procedimiento/herramienta de conciliación administrativa con evidencia antes de una operación masiva sostenida.
- El cierre solicitado se prepara como commit local en `master`, con los dos commits originales conservados. Push y despliegue quedan fuera de esta entrega; no se habilitó envío ni se cambió el esquema para conseguir una prueba verde.
