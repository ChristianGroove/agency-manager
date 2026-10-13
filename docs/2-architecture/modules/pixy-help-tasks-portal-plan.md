# Ayuda del portal Tasks: diseño y siguiente tramo

Estado: contratos iniciales y resolver de acceso implementados; robot, endpoint conversacional, biblioteca e historial del portal todavía NO activados/implementados. Fecha: 2026-10-12. Ver [base técnica entregada](pixy-help-tasks-portal-foundation.md) y primero [mantenimiento](../../3-development/operations/pixy-help-maintenance.md).

## Objetivo y alcance inicial

Robot en `/portal/tasks/[token]`, con branding del tenant, para explicar funciones de Tasks y uso del propio portal. Guías por capacidad real del colaborador. Fuera de alcance: CRM, facturación, administración global, otros portales, ejecución de acciones y consulta del contenido real de tareas/proyectos. Los mensajes y tokens del portal no se envían como contexto de producto al modelo.

Primera fase: procedimientos y orientación. Segunda fase opcional: contexto mínimo de vista/estado verificado. Consultas sobre tareas concretas o acciones requieren una fase posterior con autorización por registro; no deben introducirse por conveniencia en la fase inicial.

## Base observada y brecha actual

| Componente existente | Consecuencia |
|---|---|
| `src/app/(public)/portal/tasks/[token]/page.tsx` | Portal fuera del layout del dashboard, con su branding. No hereda por sí mismo el robot/chat. |
| `getCollaboratorPortalData` en `tasks/actions/collaborator-portal-actions.ts` | Resuelve `organization_staff.access_token` con `is_active=true`, organización, capacidades y datos del portal. No enviar su resultado completo al modelo: contiene datos personales/operativos y credenciales de acceso. |
| `portal-security/utils/session-cookie.ts` | Si hay PIN, comprobar cookie firmada, token y staff. Mantener acceso bloqueado antes de desbloquear; no aceptar un booleano del cliente como prueba. |
| Capacidades del portal | Responsables, QA, colaboración y variante de soporte tienen funciones diferentes. No deducir permisos solo de etiquetas de rol o copiar heurísticas en el nuevo bot. |
| Ayuda e historial actuales | Requieren usuario Supabase del dashboard y `auth.uid()`. Los colaboradores del portal no son automáticamente esos usuarios. Necesitan una adaptación propia. |
| Biblioteca actual | Audiencias del dashboard y validador de rutas bajo `(dashboard)`. Una guía de Tasks del dashboard no acredita procedimientos ni acceso del portal. |

## Contrato de aislamiento propuesto

Superficies iniciales: `dashboard` y `portal.tasks`, implementadas como enum cerrado. Las guías sin superficie explícita pertenecen únicamente al dashboard. Perfiles iniciales del portal: `collaborator`, `qa`, `lead`, `support`; no representan autorización por registro ni reemplazan la matriz funcional pendiente de Gemini.

1. Un adaptador dedicado resuelve identidad, organización y capacidades en servidor para cada llamada. El token sirve para validar acceso, nunca como prompt, ID de thread o campo de logs. Derivar tenant/staff de la consulta verificada; no aceptar esos IDs ni el alcance elegidos por el navegador.
2. Comprobar colaborador activo, token vigente respecto del registro actual, PIN/cookie cuando aplica, disponibilidad del tenant, módulos y activación específica del asistente del portal. Respetar la gobernanza de IA del motor. Validar las reglas adicionales reales antes de implementarlas; no asumir una fecha de expiración que el portal actual no evalúa.
3. Reutilizar las decisiones de capacidades de Tasks mediante un resolver mínimo compartido. Evitar ejecutar la carga completa de proyectos/tareas solo para responder una pregunta de ayuda y evitar dos fuentes distintas de autorización.
4. El servidor fija `surface='portal.tasks'`; recuperar exclusivamente guías de esa superficie, funciones permitidas y guías generales del portal incluidas en una lista explícita. No incluir guías generales del dashboard por defecto. Módulo `tasks` no basta para distinguir superficies.
5. La selección asistida ve solo ese catálogo ya filtrado; validar sus IDs contra el mismo conjunto. Un prompt que diga «solo Tasks» no es una barrera de acceso.
6. Contexto permitido al modelo: superficie, vista normalizada sin token, capacidades funcionales pertinentes y guías autorizadas. No nombres/correos, PIN, token, cookie, organización completa, task payloads, comentarios ni adjuntos reales.
7. Preguntas ajenas reciben una orientación breve al alcance del portal, sin consultar el corpus global. Conversación casual breve y separación entre incertidumbre y negación mantienen el estilo del dashboard.

## Cambios previstos por componente

| Componente | Trabajo táctico |
|---|---|
| Contratos de biblioteca | Añadir superficie/audiencia de portal y filtros de capacidades del portal; compatibilidad explícita de artículos existentes con dashboard. Ante metadata ausente/incorrecta en portal, fallar cerrado. No publicar artículos de portal con audiencia de dashboard para eludir el contrato. |
| Pipeline editorial | Validar patrón público `/portal/tasks/[token]` como patrón, no enlace concreto con token. Crear casos de prueba de rutas públicas y aislamiento; preservar validación existente del dashboard. |
| Sesión del portal | Acción/resolver propios usando acceso Tasks y seguridad PIN. El endpoint actual `askHelpAssistant` no acepta tokens de portal ni confía en ellos como usuario autenticado. |
| Orquestación | Motor y render de chat compartidos, transporte/identidad separados. Presupuestos, errores, cancelación visual y diagnóstico comunes; estado/historial del dashboard nunca reutilizados por accidente. |
| Robot | Montaje después de acceso válido/desbloqueado; configuración de activación independiente por portal/tenant, reutilizando apariencia/branding, hibernación, fallback y movimiento reducido. No montar dos renderizadores globales ni añadir animación a portales sin ayuda activa. |
| Historial | Almacenamiento específico de portal o contrato nuevo explícito, ligado a tenant + staff estable + superficie. No insertar un token ni `staff_id` en columnas de `auth.users` para simular identidad. |
| Control de uso | Cuota por tenant + colaborador + superficie, límite de concurrencia y tamaño de mensajes. Antes de exposición amplia, definir almacenamiento compartido del límite y no depender únicamente del Map del dashboard. |
| Diagnóstico | Superficie, conteos, IDs de guías y tiempos; ningún token/URL con token/PIN/cookie/cuerpo de conversación. |

Historia persistida propuesta: tablas separadas de portal, escritura mediante servidor después de validar acceso en cada operación, con queries explícitas de tenant/staff/superficie y sin lectura directa anónima. Diseñar migración, RLS/privilegios y pruebas antes de habilitarla. Rotar el token invalida el acceso anterior; conservar historial por staff estable solo si la nueva sesión sigue autorizada. La retención/eliminación debe definirse al implementar, no suponerse indefinida.

## Entregas y criterios de salida

### A. Biblioteca y matriz (Gemini)

Entregar inventario de vistas/funciones/capacidades de los portales de Tasks, variantes PM/QA/colaborador/soporte, guías por tarea, fuentes verificadas, preguntas y gaps. Incluir requisitos visibles y backend separados. Candidatos: navegación/acceso/PIN; estados y progreso; asignaciones; bloqueos/dependencias; comentarios/adjuntos; subtareas; proyectos/workspaces; reuniones; QA; soporte; planeación/sprints; seguimiento/tiempo, únicamente donde fuentes demuestren implementación y exposición al perfil.

No convertir esa lista en capacidades garantizadas. Usar [encargo específico](../../3-development/operations/gemini-tasks-portal-help-brief.md). Escribir primero en `docs/1-product/help-library/portal-preparation/tasks/`; no publicar por el contrato antiguo ni modificar código/Git. Integración adapta los contratos antes de trasladar contenido a borradores publicables.

### B. Contratos y acceso (Codex)

Extender contratos/pipeline, resolver identidad/capacidades mínimas, orquestación de alcance, activación y cuotas. Tests obligatorios: token inválido/revocado, staff inactivo, PIN bloqueado/desbloqueado, tenant desactivado, módulo/flag apagados, scope manipulado, selección con IDs del dashboard, capacidades insuficientes y aislamiento entre tenants/colaboradores/portales. El modelo no sustituye estas comprobaciones.

### C. Piloto Tasks (Codex + usuario)

Montar robot/chat, activar solo en tenant local explícito y acceso de prueba autorizado. Primero procedimientos; el historial persistente se activa solo con su migración/protecciones verificadas. Si se prueba memoria de sesión antes, mostrar claramente que no persiste y no prometer historial.

Pruebas manuales a cargo del usuario: escritorio/móvil, PIN, navegación, funciones por perfil, seguimiento/cambio de tema y preguntas de otros módulos. Apagar la ayuda no afecta tareas/proyectos ni su canal de soporte humano. Evaluar recuperación y comportamiento de respuestas separadamente, con costo/latencia observados.

### D. Generalización posterior

Nuevo portal = adaptador de identidad y capacidades + biblioteca revisada + configuración + matriz de pruebas. Reutilizar motor/robot/UI, sin clonar prompts ni abrir acceso al corpus global. No usar `portal.*` o permisos «all» como atajo para publicar varios portales.

## Pendientes que no bloquean el diseño

Actualización 2026-10-12: identidad, contratos, biblioteca inicial, cuotas PostgreSQL, historial y UI ya implementados. Ver [integración y pendientes del piloto](pixy-help-tasks-portal-integration.md). Este plan conserva las decisiones originales; la biblioteca aún tiene ajustes de cobertura pendientes.

Elección de backend del límite compartido, política de retención, UI exacta del robot en móvil, formato final del contrato V2 de artículos/superficies y configuración de portal en super admin. Resolverlos en la implementación mediante evidencia y alcance autorizado; no están activos por existir este plan.
