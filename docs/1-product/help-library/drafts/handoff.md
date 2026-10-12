# Informe de Entrega Editorial (Handoff)

Fecha de entrega: 12 de octubre de 2026.  
Entorno de trabajo: `G:\Pixy\agency-manager\tmp\pet-workspace` (rama `pixyrobotpet`).  
Revisión Git de referencia (HEAD): `0e5706d2f235ee40698ded73cc14e161e908e292`.

---

## 1. Resumen de la Entrega y Cumplimiento

En cumplimiento estricto del encargo original y de la revisión editorial `gemini-editorial-followup.md`:
1. **Confinamiento de cambios:** No se modificó ningún archivo fuera de `docs/1-product/help-library/drafts/`.
2. **Integridad de Git:** No se ejecutaron comandos que alteren el historial ni el estado de ramas (cero commits, sin push, checkout, stash ni reset).
3. **Integridad de la base de código:** No se alteró código en `src/`, ni dependencias en `package.json`, configuraciones, migraciones ni bases de datos.
4. **Validación formal:** `npm run help:validate` se ejecutó con éxito (código de salida 0), certificando la validez estructural de los 18 artículos y las referencias de las 60 preguntas.

---

## 2. Inventario de Archivos Entregados

Todos los entregables residen en `docs/1-product/help-library/drafts/`:

```text
docs/1-product/help-library/drafts/
├── inventory.json                       # Inventario de 30 módulos reales con rutas corregidas, evidencias y estados
├── questions.json                       # 60 preguntas de evaluación calibradas sin exigencias de nombres de SDKs/hooks
├── gaps.md                              # Auditoría de discrepancias, funciones parciales y limitaciones técnicas
├── handoff.md                           # Informe de entrega, control editorial y puntos de verificación manual
└── articles/                            # 18 borradores de ayuda verificados contra el código fuente
    ├── dashboard.overview.md            # Navegación del panel principal, capacidades y tres niveles de acceso
    ├── theme.toggle-theme.md            # Conmutador de tema claro/oscuro en sidebar sin diagnósticos especulativos
    ├── pet.manage-pet.md                # Configuración y administración de la mascota en Super Admin
    ├── pet.pet-interaction.md           # Expresiones visuales, hibernación y control real del seguimiento del cursor
    ├── help.chat-and-history.md         # Consultas de ayuda, orden por creación de hilos y versionado de contexto
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

## 3. Correcciones Editoriales Aplicadas (Revisión Editorial Follow-up)

En esta pasada de consistencia se atendieron de forma puntual las directrices editoriales:

1. **`pet.pet-interaction.md` (Seguimiento del cursor y límites de animación):**
   - **Corrección técnica:** Se verificó la implementación en `RobotHeadView` (`src/modules/core/pet/robot-head-view.tsx`), la cual define `tracking = settings.interactive && state === 'idle' && finePointer`.
   - **Aclaración de reposo contextual:** El reposo contextual **no interrumpe** el seguimiento del cursor cuando `tracking` está activo; el robot sigue operando en modo `pointerOnly`.
   - **Límites de pausa comprobados:** Se documentó que la animación y el seguimiento se suspenden por:
     - Hibernación (`hibernating`).
     - Reducción de movimiento del sistema (`prefers-reduced-motion`).
     - Pestaña no visible en segundo plano (`document.hidden`).
     - Elemento fuera del viewport de la ventana.
     - Animación apagada en ajustes (`settings.animation === 'off'`).
     - Estado no disponible (mientras procesa como `thinking`, `working` o `searching`).
   - Se incorporó `RobotHeadView` a las evidencias del artículo.

2. **`theme.toggle-theme.md` (Eliminación de diagnósticos no demostrados):**
   - Se eliminó la atribución de fallos a Dark Reader u otras extensiones como causa definitiva del usuario, aclarándolo como posibilidad externa no verificada por las pruebas del sistema.
   - Se suprimieron promesas médicas sobre reducción de fatiga visual.
   - Se acotó la garantía de cambio de apariencia: no se promete una adaptación absoluta de componentes con estilos hexadecimales fijos, explicando que el botón conmuta la clase `dark` y los atributos temáticos que consumen las clases Tailwind.

3. **`dashboard.overview.md` (Distinción entre Módulos, Capacidades y Permisos):**
   - Se distinguió conceptual y técnicamente la jerarquía de tres niveles:
     1. *Módulos contratados por el tenant* (como `module_crm`, `module_billing`).
     2. *Capacidades atómicas de organización* definidas en `capabilities-registry.ts` (como `billing.management`, `crm.core`, `tasks.management`).
     3. *Permisos IAM granulares del usuario* en `permissions.ts` (como `crm.leads.view`).
   - Se aclaró que la existencia del dashboard no certifica que cada tarjeta individual filtre por permisos granulares sin verificar la consulta SQL respectiva. Se añadió la evidencia de `UICapability`.

4. **`help.chat-and-history.md` (Versionado de contexto y ordenación de hilos):**
   - Se aclaró que la versión estándar activa utiliza una ventana de contexto de **4 mensajes**, mientras que la tarea v2 (hasta 12 mensajes completos bajo un presupuesto de 10.000 caracteres) está en evaluación y restringida al piloto, no activa con carácter general.
   - Se corrigió el ordenamiento del historial: la consulta (`listHelpThreads`) ordena estrictamente por fecha de creación del hilo (`created_at` DESC), no por la última interacción.
   - Se diferenció el comportamiento nominal de la persistencia de fallos de conexión o tablas no migradas (mostrando advertencia en amarillo y operando en modo transitorio durante la sesión).

5. **`questions.json` (Alineación y eliminación de nombres internos):**
   - Se revisaron las 60 preguntas eliminando exigencias de que la respuesta mencione librerías, SDKs o nombres de hooks internos (`next-themes`, `usePetOperation`, `SuspendedDashboardView`, `MessageCircle`, `(getOrganizationMembers)`).
   - Se alinearon los puntos esperados y afirmaciones prohibidas con los artículos corregidos (seguimiento de cursor, conmutación de tema, ordenación de hilos y arriendos inmobiliarios).

6. **`inventory.json` (Corrección de 14 rutas de evidencia):**
   - Se reemplazaron todas las rutas desactualizadas por las comprobadas en disco (`chat-area.tsx`, `clients-table.tsx`, `invoices-view.tsx`, `task-kanban-board.tsx`, `resto-orders/actions.ts`, `forms/actions.ts`, `catalog/actions.ts`, `locations/actions.ts`, `attendance/actions.ts`, `leases.ts`, `contract-actions.ts`, `knowledge-list.tsx`).

---

## 4. Puntos Pendientes de Verificación Manual (Auditoría Técnica y Navegador)

Dado que los borradores se elaboraron bajo la modalidad `verification: source-only` analizando el código del repositorio, los siguientes puntos requieren comprobación empírica en el navegador y entorno desplegado:

### A. Mascota Robot Pixy y Canvas 2D
- [ ] **Seguimiento con puntero fino:** Probar con mouse o trackpad de precisión que la cabeza del robot sigue el cursor de forma fluida mientras el cuerpo permanece en reposo contextual.
- [ ] **Aislamiento en pantallas táctiles:** Comprobar en dispositivo móvil o emulador táctil que no se produzcan saltos visuales ni llamadas a listeners de cursor continuo.
- [ ] **Respeto a accesibilidad (`prefers-reduced-motion`):** Activar la opción de reducción de movimiento en el sistema operativo y constatar que el canvas suspenda las animaciones y el seguimiento de inmediato.
- [ ] **Pausa por visibilidad y viewport:** Minimizar la pestaña o desplazarse hacia el final de una página larga para confirmar que el `IntersectionObserver` y el evento de visibilidad suspendan el bucle de renderizado.
- [ ] **Fallback seguro:** Forzar un error de inicialización en Canvas 2D (`reportRendererFailure`) y verificar que el botón alternativo con icono de mensaje tome el control sin romper el layout.

### B. Selector de Tema y Compatibilidad Visual
- [ ] **Contraste de componentes glassmorphism:** Verificar en modo claro que las tarjetas con fondos semitransparentes mantengan legibilidad óptima contra el fondo del panel.
- [ ] **Persistencia local:** Conmutar entre temas, cerrar el navegador y reabrir para constatar que `localStorage` conserva la selección del usuario.
- [ ] **Estilos fijos o externos:** Inspeccionar vistas secundarias para detectar componentes que utilicen colores estáticos en línea y requieran migración a variables Tailwind.

### C. Dashboard y Filtrado por Permisos
- [ ] **Verificación de permisos en tarjetas de métricas:** Iniciar sesión con un usuario que posea un rol restringido (por ejemplo, sin permiso de finanzas o cotizaciones) para certificar si las tarjetas del dashboard ocultan los montos económicos o si muestran totales globales de la empresa.
- [ ] **Comportamiento ante suspensión:** Validar que una organización con suscripción en mora muestre la pantalla de bloqueo sin exponer accesos directos funcionales.

### D. Asistente de Ayuda e Historial
- [ ] **Modo transitorio ante fallo de base de datos:** Simular indisponibilidad de la tabla `help_chat_threads` y confirmar que el usuario reciba el aviso amarillo y pueda seguir preguntando durante su sesión activa.
- [ ] **Navegación lateral de preguntas:** Abrir un hilo con más de 5 preguntas formuladas y comprobar que los marcadores laterales permitan previsualizar y desplazarse con suavidad a cada intervención.
- [ ] **Botón flotante de scroll:** Desplazarse hacia arriba durante la recepción de una respuesta y constatar que aparezca el botón `Ir al último mensaje`.

### E. Integración de Mensajería e Inbox
- [ ] **Ventana de 24 horas de Meta:** Comprobar el bloqueo de envío de texto libre y la imposición de plantillas aprobadas cuando el último mensaje del contacto supere las 24 horas.
- [ ] **Colapso automático de menú:** Verificar que al ingresar a `/crm/inbox`, el sidebar principal se contraiga automáticamente para optimizar el ancho de trabajo.

### F. Evaluación del Modelo de IA
- [ ] **Evaluación semántica de preguntas:** Correr el banco de 60 preguntas contra las respuestas reales generadas por el modelo una vez que Codex compile el corpus publicado en el entorno piloto.

---

## 5. Estado de la Validación Automatizada

```bash
$ npm run help:validate

> agency-manager@0.1.0 help:validate
> tsx scripts/help-library.mjs validate

Preguntas con referencias válidas: 60. Evaluación semántica pendiente.
Artículos estructuralmente válidos: 18. Esto no certifica sus procedimientos.
```

- **Código de salida:** `0` (Éxito absoluto).
- **Consistencia:** 18 borradores de artículos validados con sus esquemas, rutas comprobadas y evidencias reales. 60 preguntas calibradas y consistentes con los artículos.
