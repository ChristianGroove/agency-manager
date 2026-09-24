# Mantenimiento de canales Meta en Coolify

La recepción normal de webhooks se procesa en la petición firmada de Meta. La cola persistente permite recuperar una petición interrumpida y un envío guardado que no llegó a despacharse. Como la instalación de producción no usa Inngest, Coolify debe invocar periódicamente la ruta protegida de mantenimiento.

En la aplicación **pixy CRM Backend**, abrir **Configuration > Scheduled Tasks > Add** y usar:

| Campo | Valor |
| --- | --- |
| Name | `Meta channel maintenance` |
| Command | `node -e 'fetch("https://app.pixy.com.co/api/cron/meta-maintenance",{method:"POST",headers:{Authorization:"Bearer "+process.env.CRON_SECRET}}).then(async r=>{console.log(await r.text());if(!r.ok)process.exitCode=1}).catch(e=>{console.error(e.name);process.exitCode=1})'` |
| Frequency | `*/5 * * * *` |
| Timeout | `120` segundos |
| Container | Contenedor activo del backend |

`CRON_SECRET` ya está configurado en el backend. No copiarlo al comando ni imprimirlo. Después del despliegue, probar el comando primero en **Terminal** y comprobar que la respuesta HTTP equivale a `200` con cero fallos. Luego guardar la tarea, pulsar **Execute Now** y confirmar una ejecución `Success` en **Recent executions**.

La tarea procesa como máximo 25 webhooks y 25 envíos en cola por ejecución. El intervalo de cinco minutos supera el timeout y evita ejecuciones programadas solapadas. Un envío en estado `sending` durante más de 15 minutos pasa a `unknown`; **no se reenvía automáticamente**, porque Meta podría haberlo recibido. Los eventos sin un canal propietario se reconocen sin asignarlos a otro tenant. Ante un `500`, revisar los conteos `failedWebhooks` y `failedOutbound` y los registros sanitizados del backend; los elementos pendientes permanecen para la siguiente ejecución.
