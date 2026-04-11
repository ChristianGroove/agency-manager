# 🚩 MISSION BRIEFING: Pre-Production Deployment (Phase 4.2)

**PARA EL PRÓXIMO AGENTE / SESIÓN:**

## 1. Situación Actual (POST-VALIDATION - Ready for Deploy)
Se ha completado la validación exhaustiva de la cadena de migraciones en entorno local.
- **Squash Exitoso**: ~200 migraciones consolidadas en `20260409000000_baseline.sql` (LIMPIO, UTF-8).
- **5 Migraciones Incrementales**: Validadas, corregidas y probadas end-to-end.
- **`supabase db reset`**: ✅ Exitoso (exit code 0) — las 6 migraciones aplican en secuencia limpia.
- **Build**: ✅ Verificado (`npm run build` exit code 0).
- **App**: ✅ Funcional en local (HTTP 200, título "Pixy").
- **PRODUCCIÓN**: **Pendiente de sincronizar**. Las 5 migraciones incrementales necesitan aplicarse.

## 2. Bugs Críticos Encontrados y Corregidos (2026-04-10)
> [!CAUTION]
> Se encontraron **5 bugs críticos** durante la validación local que habrían roto la migración en producción:

1. **RLS Hardening**: 3 políticas referenciaban `organization_id` en tablas que usan `client_id` o `service_id`.
2. **Payment Gateway Config**: Tabla de plataforma tratada como multi-tenant (no tiene `organization_id`).
3. **Index Predicate**: `CURRENT_DATE` no es IMMUTABLE — inválido en predicados de índices parciales.
4. **Idempotencia**: `CREATE POLICY` sin `DROP POLICY IF EXISTS` previo causaba fallos al re-ejecutar.
5. **Baseline Contaminado**: Encoding UTF-16, metacomandos `\restrict`, y objetos de schema `auth`.

## 3. Directivas de Cero-Interferencia (MANDATORIO)
> [!CAUTION]
> **NO GENERAR NUEVAS MIGRACIONES SQL**. 
> El baseline y las 5 migraciones están validados y verificados. Cualquier cambio adicional
> requiere re-ejecutar `supabase db reset` para validar la cadena completa.

## 4. Seguridad y Rollback
- Existe un respaldo **FULL (Schema + Data)** verificado en: `C:\Users\Usuario\Documents\BACKUP PIXY`.
- Consultar `supabase/backups/production/BACKUP_REPORT.md` para detalles de integridad.
- Script de despliegue: `supabase/_manual_scripts/deploy_migrations.sh`.
- **PROHIBIDO** realizar `supabase db push` o cambios en producción sin previa validación.

## 5. Estrategia de Despliegue (APROBADA)

### Orden de Operaciones:
1. ✅ ~~Validar localmente~~ (COMPLETADO)
2. ⬜ Crear backup fresco pre-deploy de producción
3. ⬜ `npx supabase link --project-ref amwlwmkejdjskukdfwut`
4. ⬜ Aplicar 5 migraciones incrementales via `psql` directo a producción
5. ⬜ Ejecutar verificaciones de integridad contra producción
6. ⬜ `git push origin master` (13 commits, 1316 archivos)
7. ⬜ Verificar despliegue Vercel
8. ⬜ `npx supabase migration repair --status applied` para las 5 migraciones

### Decisión Clave:
> [!IMPORTANT]
> **NO se ejecutará `migration repair` con el baseline en producción** por ahora.
> Solo se aplican las 5 migraciones incrementales (aditivas y retrocompatibles).
> El baseline es solo la consolidación de lo que ya existe en producción.

## 6. Documentación de Referencia Obligatoria
1. [ROADMAP_SCALABILITY.md](file:///D:/Pixy/agency-manager/docs/ROADMAP_SCALABILITY.md): Estado de Phase 4.
2. [database-map.md](file:///D:/Pixy/agency-manager/docs/architecture/database-map.md): Arquitectura de datos.
3. [HANDOVER_STATUS.md](file:///D:/Pixy/agency-manager/docs/audit/HANDOVER_STATUS.md): Esta misma nota.

## 7. Resultado de Validación Final (11/11 PASS)

| Check | Resultado |
|---|---|
| Tablas públicas | **164** |
| `pg_trgm` extension | ✅ |
| GIN Trigram index | ✅ |
| Composite index (conversations) | ✅ |
| Billing fast lookup index | ✅ |
| RLS Payment hardened | ✅ |
| RLS Social metrics hardened | ✅ |
| RLS Gateway hardened | ✅ |
| RLS SMTP hardened | ✅ |
| `v_clients` security_invoker | ✅ |
| Migraciones en historial | **6** |

**EL SISTEMA ESTÁ VALIDADO Y LISTO PARA EL DESPLIEGUE DE LAS 5 MIGRACIONES EN PRODUCCIÓN.**
