# Estrategia de Seguridad de Datos y Resiliencia "Data Vault"

## 1. Auditoría de Seguridad Actual (Estado del Arte)

### Análisis de Aislamiento (Multi-Tenancy)
El sistema utiliza un modelo de **Row Level Security (RLS)** robusto basado en `organization_id`.
- **Estatus:** ✅ Alto. Se han parcheado recientemente vulnerabilidades en `messaging`, `automation_queue` y `roles`.
- **Riesgo Detectado:** La "Nube de Tablas". Al tener tantos módulos (`crm`, `inbox`, `billing`, `automation`), la integridad referencial es compleja. Un `DELETE CASCADE` mal configurado podría borrar datos críticos en cadena.

### Vectores de Vulnerabilidad
1.  **Integridad Referencial:** Borrar un usuario podría dejar "huérfanos" mensajes o leads si no se configuran los `ON DELETE`.
2.  **Error Humano:** Un admin borrando una automatización compleja por error. RLS no protege de esto.
3.  **Migración de Datos:** No existe un método estándar para mover un "Tenant" de un servidor a otro (ej. Staging -> Producción) o exportarlo para cumplimiento legal.

---

## 2. El Plan Quirúrgico: Arquitectura "Data Vault"

Este plan implementa una capa de **Backup Lógico y Portabilidad** que vive *encima* de la base de datos física.

### Concepto Central: "Snapshot Lógico de Inquilino"
En lugar de depender solo de backups físicos del servidor (que restauran a *todos* los clientes a la vez), implementaremos **Snapshots por Organización**.

### Componentes del Sistema

#### A. El Registro de Módulos (Adaptabilidad)
Para cumplir la regla de oro ("adaptarse a nuevos features"), el sistema no adivina qué guardar. Cada Módulo debe registrarse.

```typescript
// Contrato de Integración de Datos
interface DataModule {
  moduleName: 'crm' | 'messaging' | 'billing';
  exportData(orgId: string): Promise<Record<string, any>>;
  importData(orgId: string, data: any): Promise<void>;
  dependencies: string[]; // ej. 'messaging' depende de 'crm' (contactos)
}
```

#### B. La Bóveda (The Vault)
Almacenamiento seguro y encriptado de los snapshots.
- **Formato:** JSON Comprimido (GZIP) + Encriptación AES-256.
- **Ubicación:** Supabase Storage (Bucket privado `vault-backups`).
- **Metadata:** Tabla SQL `data_snapshots` registrando hash SHA-256 para verificar integridad.

#### C. Funcionalidad de "Time Travel" (Restauración)
Permite a un Tenant volver a un punto específico **sin afectar a otros Tenants**.
1.  Admin selecciona Snapshot.
2.  Sistema bloquea escritura (`maintenance_mode`).
3.  Ejecuta `cleanData(orgId)` en orden inverso de dependencias.
4.  Ejecuta `importData(orgId)` en orden de dependencias.

---

## 3. Hoja de Ruta de Implementación

### Fase 1: Infraestructura Core (Inmediato)
- [ ] Crear tabla `system_modules_registry` para control de versiones de datos.
- [ ] Crear tabla `data_snapshots` (id, org_id, checksum, status).
- [ ] Configurar Bucket `vault` con políticas RLS estrictas (solo Owner).

### Fase 2: Implementación de Adaptadores (Por Módulo)
- [ ] **CRM Adapter:** Exportar Leads, Pipelines, Contactos.
- [ ] **Messaging Adapter:** Exportar Conversaciones, Mensajes, Plantillas.
- [ ] **Automation Adapter:** Exportar Workflows y Logs.

### Fase 3: Interfaz de Gobierno de Datos
- [ ] UI en `/settings/security/backups`.
- [ ] Botón "Crear Punto de Restauración".
- [ ] Botón "Exportar Datos" (GDPR/Compliance).

---

## 4. Protocolo de "Feature Compliance"

Para mantener este sistema "vivo" y seguro, cada nueva Feature que cree tablas en base de datos debe:
1.  **Registrarse:** Agregar su lógica de exportación en `src/modules/{feature}/data-adapter.ts`.
2.  **Dependencias:** Declarar si sus datos dependen de otro módulo (ej. `tasks` depende de `users`).
3.  **Test:** La CI/CD debe fallar si una tabla tiene datos pero no está cubierta por un adaptador de backup.

Este protocolo garantiza que el sistema de seguridad crezca orgánicamente junto con el producto.
