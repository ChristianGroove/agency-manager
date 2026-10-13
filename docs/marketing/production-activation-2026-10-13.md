# Configuración de envíos para la prueba de producción

13 de octubre de 2026. El usuario autorizó habilitar envíos para probar en producción y publicar master. El código y las 16 migraciones ya están integrados; consultar el [cierre de base](production-db-closeout-2026-10-13.md).

## Configuración guardada en Coolify

Backend `pixy Crm Backend`, proyecto Pixy Crm, entorno production, dominio `app.pixy.com.co`:

- `MARKETING_EXECUTION_ENABLED=true` disponible en Runtime, sin habilitar Buildtime. Coolify creó también la copia de preview y se dejó explícitamente en `false`.
- `CRON_SECRET` existente comprobado como disponible en Runtime, sin revelar o cambiar su valor.
- Scheduled Task `Marketing campaign processing`, habilitada, cada minuto (`* * * * *`), timeout de 120 segundos y contenedor predeterminado de la aplicación.
- Fuente Git comprobada: repositorio agency-manager, rama `master`, sin SHA fija.

Comando guardado en la tarea:

```sh
if [ -f scripts/marketing-worker.mjs ]; then node scripts/marketing-worker.mjs; else echo "Marketing pending deploy"; fi
```

La comprobación permite esperar al despliegue sin ejecutar un archivo ausente. Si existe, conserva el código de salida del launcher: no oculta errores de procesamiento. El launcher comprueba además la variable de ejecución y utiliza `CRON_SECRET` y el puerto interno del contenedor.

## Evidencia y límite

Las primeras ejecuciones automáticas del comando directo fallaron porque el contenedor anterior no tenía `/app/scripts/marketing-worker.mjs`. Después de guardar la comprobación, la ejecución automática y una comprobación manual terminaron en Success con `Marketing pending deploy`. **Ese resultado prueba la espera del despliegue, no un envío real ni la ejecución del nuevo motor.**

La variable guardada se incorpora al nuevo contenedor al desplegar. No se hizo redeploy ni restart, no se crearon o activaron campañas y no se enviaron mensajes. La tarea de mantenimiento de canales Meta existente no se modificó.

Después del deploy manual desde master, confirmar que la tarea ejecuta el motor, que las campañas se pueden revisar/activar y que un envío pequeño autorizado llega con estados correctos. Email sigue requiriendo SMTP verificado y los requisitos de la etapa 14; SMS permanece aplazado.
