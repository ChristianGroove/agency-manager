# Informe de Entrega Editorial (Handoff)

Fecha de entrega: 12 de octubre de 2026.  
Entorno de trabajo: `G:\Pixy\agency-manager\tmp\pet-workspace` (rama `pixyrobotpet`).  
Revisión Git de referencia (HEAD): `0e5706d2f235ee40698ded73cc14e161e908e292`.

---

## 1. Resumen de la Entrega

En cumplimiento estricto del encargo definido en `gemini-pixy-help-library-brief.md`:
1. No se modificó ningún archivo fuera de `docs/1-product/help-library/drafts/`.
2. No se ejecutaron comandos de alteración de estado de Git (commit, push, checkout, stash, reset).
3. No se tocaron dependencias, migraciones, bases de datos ni código de producción (`src/`).
4. Se elaboró el inventario formal de módulos (`inventory.json`), los artículos del primer lote prioritario y de los módulos funcionales clave, la batería de evaluación (`questions.json`), el registro de carencias (`gaps.md`) y el presente documento de handoff.

---

## 2. Inventario de Archivos Creados

Todos los archivos residen dentro de `docs/1-product/help-library/drafts/`:

```text
docs/1-product/help-library/drafts/
├── inventory.json                       # Inventario de 30 módulos reales con rutas, evidencias y estados
├── questions.json                       # 60 preguntas de evaluación con comportamientos esperados y restricciones
├── gaps.md                              # Auditoría de carencias, funciones parciales y discrepancias
├── handoff.md                           # Informe formal de entrega para coordinación con Codex
└── articles/                            # 18 borradores de ayuda verificados contra código
    ├── dashboard.overview.md            # Navegación del panel principal y métricas clave
    ├── theme.toggle-theme.md            # Conmutador de tema claro/oscuro en el sidebar
    ├── pet.manage-pet.md                # Configuración y administración de la mascota en Super Admin
    ├── pet.pet-interaction.md           # Expresiones visuales, hibernación y activación
    ├── help.chat-and-history.md         # Consultas de ayuda e historial privado persistente
    ├── branding.manage-adn.md           # Centro de identidad y ADN de marca del negocio
    ├── branding.brand-center.md         # Edición rápida en Centro de Marca con observador de mascota
    ├── iam.manage-roles.md              # Gestor de roles y permisos granulares IAM V2
    ├── iam.invite-members.md            # Invitación de miembros mediante enlaces seguros
    ├── inbox.manage-conversations.md    # Atención de conversaciones y canales en Inbox
    ├── crm.manage-contacts.md           # Gestión de contactos, clientes y exportación CSV
    ├── crm.manage-pipeline.md           # Embudo de ventas Kanban y etapas de oportunidades
    ├── billing.manage-invoices.md       # Emisión y cobro de facturas con pasarela y PDF
    ├── automation.create-workflows.md   # Diseñador de flujos automáticos y disparadores
    ├── tasks.manage-tasks.md            # Gestión ágil de proyectos y tareas en TaskFlow
    ├── quotes.create-quotes.md          # Presupuestos comerciales y conversión a factura
    ├── resto.manage-menu.md             # Carta digital de restaurante, categorías y horarios
    └── resto.manage-orders.md           # Gestión de pedidos, comandas y pantalla de cocina (KDS)
```

---

## 3. Cobertura del Lote 1 y Módulos Adicionales

### Lote 1 (Entregado al 100% de los requerimientos):
- **Dashboard:** Cubierto en `dashboard.overview.md`. Verificado contra `DashboardPage` y adaptación por `orgType`.
- **Tema:** Cubierto en `theme.toggle-theme.md`. Verificado en `SidebarThemeToggle` con `next-themes`.
- **Mascota Robot:** Cubierto en `pet.manage-pet.md` y `pet.pet-interaction.md`. Verificado en `PetSettingsManager`, `PetHelpTrigger` y ciclo de hibernación de 5 minutos.
- **Historial de Ayuda:** Cubierto en `help.chat-and-history.md`. Verificado en `HelpHistoryMenu`, límite de 200 mensajes y aislamiento RLS.
- **ADN de Marca:** Cubierto en `branding.manage-adn.md` y `branding.brand-center.md`. Verificado en `IdentityDashboard` y `BrandCenter` con `usePetOperation`.
- **Permisos IAM:** Cubierto en `iam.manage-roles.md` e `iam.invite-members.md`. Verificado en `RoleManager`, `permissions.ts` e `inviteMember`.

### Módulos Funcionales Clave Incorporados:
- **Inbox:** Atender conversaciones y canales de WhatsApp (`inbox.manage-conversations.md`).
- **CRM:** Contactos (`crm.manage-contacts.md`) y Pipeline de tratos (`crm.manage-pipeline.md`).
- **Facturación:** Comprobantes y registro de cobros (`billing.manage-invoices.md`).
- **Automatizaciones:** Nodos, disparadores y flujos (`automation.create-workflows.md`).
- **Operaciones:** Proyectos y tareas TaskFlow (`tasks.manage-tasks.md`), Cotizaciones (`quotes.create-quotes.md`).
- **Vertical Gastronómica:** Menú digital con doble turno (`resto.manage-menu.md`) y KDS de pedidos (`resto.manage-orders.md`).

---

## 4. Contradicciones y Puntos que Requieren Revisión Técnica por Codex

1. **Alucinaciones históricas corregidas:**
   - La opción de cambiar tema **no reside en `Configuración > Preferencias`**; está fijada en el botón de Sol/Luna del menú lateral.
   - El botón de papelera en el sidebar fue reemplazado por dicho conmutador de tema.
   - `UnifiedFloatingFab` y Meta Control están retirados del layout principal (`fab-controller.tsx`).
2. **Tablas de base de conocimiento faltantes:**
   - En el entorno local actual no existen `knowledge_base` ni la extensión `vector`. El asistente opera actualmente con respuestas del modelo sustentadas en prompts sellados, sin recuperación RAG real de fragmentos indexados. Codex debe definir la migración oficial para habilitar la biblioteca global del producto.
3. **Persistencia de configuración de mascota:**
   - Los cambios de configuración de la mascota en `/platform/admin` no se propagan por WebSocket/Realtime; los clientes requieren recargar la página para recibirlos.
4. **Permisos Legacy vs IAM V2:**
   - Se recomienda a Codex retirar completamente `src/modules/core/iam/permissions/defaults.ts` una vez se concluya la migración definitiva a roles dinámicos en base de datos.

---

## 5. Siguiente Lote Propuesto

Para las siguientes iteraciones editoriales se sugiere abordar:
1. Formularios y Briefings (`/briefings`).
2. Catálogo de productos y portafolio público (`/portfolio`).
3. Sedes y sucursales físicas (`/platform/locations`).
4. Control biométrico de asistencia de personal (`/attendance`).
5. Herramientas auxiliares: Generador de contratos (`/tools/contract-generator`), Motor de correos (`/tools/email-engine`) y Manifiestos IMEI (`/manifests`).
6. Módulos verticales condicionales: Arriendos inmobiliarios (`/rentals`) y Operaciones de limpieza (`/cleaning`).
