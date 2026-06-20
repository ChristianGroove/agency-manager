# CRM Inbox & Reports Stabilization Report
**Fecha: 2026-04-11**

## 1. Problemas Identificados (Post-Fase 4 Deploys)

### A. Inbox Messaging (Producción y Local)
1. **Desaparición de Cards**: Las tarjetas de conversación desaparecían del sidebar en producción al llegar segundos mensajes debido a que el payload de Realtime no incluía el `connection_id`, lo que fallaba el chequeo de seguridad.
2. **Duplicación de Burbujas**: Los mensajes salientes aparecían duplicados en UI debido a una discrepancia entre el ID optimista del cliente y el ID autogenerado por la DB.
3. **Bucle de Render Local**: Un efecto circular en `SidebarContactList.tsx` inundaba la consola de advertencias i18n y bloqueaba el rendimiento local.

### B. Reports Command Center
1. **Crash en Runtime**: Error `TypeError: Cannot read properties of undefined (reading 'total_leads')` al intentar acceder a la pestaña de reportes.
2. **Desajuste de Contrato RPC**: La versión optimizada de `get_advanced_crm_reports` devolvía datos planos en camelCase, rompiendo la compatibilidad con el Frontend (snake_case nested).

---

## 2. Acciones Realizadas

### Estabilización de Mensajería
- **Seguridad Resiliente**: Se refactorizó el handler de Realtime en `SidebarConversationList.tsx` para usar valores del estado local como fallback cuando el payload es parcial.
- **Inserción Automática**: Se implementó el manejo de eventos `INSERT` para nuevos chats.
- **Persistencia Atómica**: Se ajustó `MessagingPersistence.ts` para usar el `optimisticId` como Primary Key, garantizando coherencia instantánea.
- **Rompimiento de Bucle**: Se eliminó la dependencia circular de permisos en el Sidebar local.

### Corrección de Reportes
- **Nueva Migración (5)**: Se creó [`20260410000005_fix_reports_rpc_contract.sql`](file:///d:/Pixy/agency-manager/supabase/migrations/20260410000005_fix_reports_rpc_contract.sql) para restaurar el contrato de datos esperado por el sistema.
- **Hardening Frontend**: Se aplicó encadenamiento opcional (`?.`) en `ReportsPage` para evitar crasheos ante datos incompletos.

---

## 3. Estado del Entorno

| Item | Estado | Notas |
|---|---|---|
| **Build** | ✅ PASS | Compilación exitosa (Turbopack). |
| **Local Dashboard** | ✅ FIX | Carpeta `supabase/snippets` creada para resolver error ENOENT. |
| **Traducciones** | ✅ OK | Key `crm.inbox.sidebar.send_from` añadida. |
| **Migraciones** | ✅ 05 | Sucesión secuencial mantenida para despliegue manual en Pro. |

---

## 4. Handover Técnico
- **Próxima Acción**: Aplicar migración 05 en producción.
- **Monitoreo**: Verificar que `npx supabase db push` se ejecute sin conflictos de IDs existentes.
