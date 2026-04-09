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

## 4. Puesta en Producción (Checklist)

Para que el Space sea funcional al 100%:
- [ ] **Marketplace**: `is_active = true` en `saas_apps`.
- [ ] **Diccionario**: Verificado en el tab "Diccionario" del Admin.
- [ ] **Capacidades**: Comprobar que los switches de "Funciones" reflejan los módulos instalados.
- [ ] **Banners**: Asegurarse de que existe un banner en `global_dashboard_banners` para la `space_category` del nuevo app.

---

## 📝 Soporte Arquitectónico
Para entender cómo Pixy procesa este Space en tiempo de ejecución, consulta:
[SAAS_SPACE_ENGINE_V2.md](file:///d:/Pixy/agency-manager/docs/architecture/SAAS_SPACE_ENGINE_V2.md)
