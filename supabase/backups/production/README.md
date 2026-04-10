# Respaldo de Seguridad - Producción Pixy

Este directorio contiene un punto de restauración completo (Full Rollback Point) de la base de datos de producción de Supabase (PROD).

## 📁 Contenido
- `backup_pixy.dump`: Respaldo binario (Custom Format). Es el método recomendado para restauración rápida.
- `backup_pixy.sql`: Respaldo en texto plano (SQL). Útil para auditoría y recuperación parcial de datos.
- `BACKUP_REPORT.md`: Informe de integridad con tamaños y firmas de tiempo.

## 🛡️ Instrucciones de Emergencia
En caso de que un despliegue falle y sea necesario volver al estado actual:

1. **Restaurar vía CLI**:
   ```bash
   pg_restore -h <HOST> -p <PORT> -U <USER> -d <DATABASE> --clean --if-exists backup_pixy.dump
   ```

2. **Verificación**:
   Tras la restauración, verificar que las tablas `leads` y `organizations` tengan la data íntegra.

## ⚠️ Seguridad
- Estos archivos contienen **datos reales de clientes**. No deben ser compartidos ni subidos a repositorios públicos.
- Se recomienda mover estos archivos a un almacenamiento seguro (S3, Drive, etc.) y no mantenerlos permanentemente en el repositorio de código.
