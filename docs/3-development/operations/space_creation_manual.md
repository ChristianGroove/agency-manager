# 🛠️ GUIA DE DEFINICIÓN Y DESPLIEGUE DE SPACES (V2)

Esta guía técnica detalla el proceso oficial para crear y poner en operación un nuevo **Space** en Pixy, utilizando el **Universal Space Engine**.

---

## 1. El Flujo de Trabajo Moderno (Recomendado)

Ya no es necesario realizar inserciones manuales complejas para activar la mayoría de las funciones. El flujo oficial es:

1.  **Registro Base (SQL/Admin)**: Crear el registro inicial en `saas_apps`.
2.  **Configuración Visual (Admin Panel)**: Utilizar el `AppDetailsSheet` en `/platform/admin/apps`.
3.  **Definición de Capacidades**: Activar los módulos y sincronizar la UI automáticamente.
4.  **Ajuste de Diccionario**: Personalizar la terminología para la industria específica.

---

## 2. Estructura de Configuración (`ui_config`)

El corazón de un Space es su campo `ui_config`. Si necesitas insertar o migrar un Space manualmente, usa este esquema JSONB:

```json
{
  "terminology": {
    "client": "Paciente",
    "clients": "Pacientes",
    "project": "Tratamiento",
    "sale": "Consulta"
  },
  "capabilities": [
    "crm.core",
    "crm.quotes",
    "billing.management"
  ],
  "policies": {
    "require_location": true,
    "allow_custom_branding": false
  }
}
```

> [!IMPORTANT]
> **Auto-Sync**: Al activar módulos técnicos en la UI de Admin, el sistema inyectará automáticamente las `capabilities` necesarias. No es necesario editarlas a mano en el JSON a menos que sea un caso especial.

---

## 3. Depreciado: Manual SQL Inserts

> [!WARNING]
> Este método se mantiene solo por referencia histórica o migraciones masivas. El uso de la UI de Admin es obligatorio para asegurar la integridad del caché (`org-modules` tag revalidation).

<details>
<summary>Ver procedimiento SQL antiguo (LEGACY)</summary>

```sql
-- Inserción inicial de App
INSERT INTO public.saas_apps (id, name, slug, description, category, vertical_compatibility, icon, color, price_monthly, is_active, space_category) 
VALUES ('app_id', 'Nombre', 'slug', 'desc', 'cat', ARRAY['cat'], 'icon', '#hex', 0, true, 'agency');

-- Módulos
INSERT INTO public.saas_app_modules (app_id, module_key, auto_enable, is_core) 
VALUES ('app_id', 'core_clients', true, true);
```
</details>

---

## 4. Puesta en Producción y Gobernanza IAM V2 (Checklist)

Para que el Space y sus módulos sean funcionales y seguros al 100%:
- [ ] **Política Disabled-by-Default**: Todo módulo nuevo o feature nueva introducida para el Space debe entrar **desactivada por defecto** (`auto_enable = false` para tenants existentes y permisos operativos en `false`) y exigir confirmación explícita antes de activarse.
- [ ] **Registro en Sistema de Roles y Permisos (IAM V2)**:
  - Registrar permisos del módulo en [`src/modules/core/iam/actions/permissions.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/actions/permissions.ts) (`PERMISSIONS` y `PERMISSION_GROUPS` con `moduleKey`).
  - Definir valores iniciales en [`src/modules/core/iam/services/default-roles.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/services/default-roles.ts) y rutas en [`src/modules/core/saas/module-config.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/saas/module-config.ts).
  - Añadir traducciones en [`es.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/i18n/dictionaries/es.ts), [`en.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/i18n/dictionaries/en.ts) y [`use-localized-iam.ts`](file:///G:/Pixy/agency-manager-mejorasuxui/src/modules/core/iam/actions/use-localized-iam.ts).
  - Blindar todas las Server Actions con `requirePermission(...)` y auditar la plantilla global desde `/platform/admin` $\rightarrow$ **Red (Tenants)** $\rightarrow$ **Roles & Permisos IAM**.
- [ ] **Marketplace**: `is_active = true` en `saas_apps` (únicamente tras confirmar la revisión de permisos).
- [ ] **Diccionario**: Verificado en el tab "Diccionario" del Admin.
- [ ] **Capacidades**: Comprobar que los switches de "Funciones" reflejan los módulos instalados.
- [ ] **Banners**: Asegurarse de que existe un banner en `global_dashboard_banners` para la `space_category` del nuevo app.

---

## 📝 Soporte Arquitectónico
Para entender cómo Pixy procesa este Space y su modelo de permisos IAM V2 en tiempo de ejecución, consulta:
- [SECURITY_STANDARDS.md](file:///G:/Pixy/agency-manager-mejorasuxui/docs/2-architecture/security/SECURITY_STANDARDS.md)
- [settings-and-iam-overhaul.md](file:///G:/Pixy/agency-manager-mejorasuxui/docs/ui/settings-and-iam-overhaul.md)

