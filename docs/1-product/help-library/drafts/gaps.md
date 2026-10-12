# Listado de Carencias y Contradicciones Detectadas (Gaps)

Fecha de auditoría: 12 de octubre de 2026.  
Rama inspeccionada: `pixyrobotpet` en `tmp/pet-workspace`.  
Revisión de referencia (HEAD): `047fa7ee0cadc0f49d9ce08220f633885b0801a7`.

---

## 1. Asistente de Ayuda: Diferenciación entre Motor Legacy (V1) y Piloto Vigente (V2)

Es imprescindible distinguir entre el comportamiento del runtime histórico previo y la arquitectura del nuevo piloto V2 (`PIXY_HELP_V2_ENABLED`):

### 1.1. Limitaciones del Asistente Legacy (V1 — Runtime histórico sin piloto activo)

| Componente | Estado observado en código | Consecuencia y discrepancia con documentación histórica |
|---|---|---|
| Tablas `knowledge_base` y extensión `vector` | No existen en el baseline activo local ni en migraciones consolidadas (`supabase_db_agency-manager`). | La recuperación vectorial (`match_knowledge_v2`) y textual falla silenciosamente o se omite; el motor legacy responde sin RAG real de producto. |
| Clave de OpenAI para embeddings | No está configurada ni activa en el entorno de desarrollo local. | La generación de vectores no opera localmente; el asistente legacy depende de prompts sellados estáticos. |
| Mezcla de FAQs de negocio con ayuda de Pixy | El esquema histórico busca conocimiento únicamente filtrando por `organization_id`. | No existe una biblioteca global separada para el funcionamiento del software Pixy vs. las respuestas de atención al cliente de cada tenant. |
| Memoria de contexto de conversación legacy | Se enviaba únicamente un historial plano de los últimos 4 mensajes recortados a 150 caracteres en el prompt de la tarea. | Preguntas de seguimiento largas perdían detalles previos; no se utilizaba la secuencia estructurada de roles del proveedor. |
| Longitud máxima de consulta | Restricción estricta de 500 caracteres en `ask-help-assistant.ts`. | Consultas descriptivas o volcados de errores complejos eran truncados antes de llegar al modelo. |

### 1.2. Estado Vigente y Limitaciones del Piloto Asistente V2 (`PIXY_HELP_V2_ENABLED=true`)

| Característica V2 | Implementación comprobada en código | Limitaciones vigentes del piloto |
|---|---|---|
| Corpus de Ayuda Compilado | Reside en `src/modules/features/caa/library/published.json` como artefacto sellado del build. No depende de tablas vectoriales ni de servicios externos de embeddings. | La publicación es estática; editar un borrador en `drafts/` no altera el runtime hasta aprobar el review y ejecutar `npm run help:publish`. |
| Recuperación Léxica y Autorización | Motor determinista `retrieveHelp` en `retrieval.ts`. Filtra previamente por permisos IAM (`required_permissions`), módulos activos (`required_modules`), vertical del negocio (`verticals`) y nivel de audiencia. | La búsqueda léxica requiere que las consultas coincidan con el vocabulario, títulos o palabras clave declaradas del artículo; términos no indexados pueden reducir la relevancia. |
| Historial Estructurado (`boundedHistory`) | Mantiene la alternancia de roles (`user` / `assistant`) con hasta 12 mensajes recientes bajo un presupuesto de 10.000 caracteres. | Aunque supera ampliamente los 4 mensajes planos del legacy, si una conversación supera los 10.000 caracteres, los mensajes más antiguos se descartan para proteger la ventana del LLM. |
| Aislamiento por Tenant | Activación condicionada por las variables de entorno `PIXY_HELP_V2_ENABLED=true` y `PIXY_HELP_V2_TENANTS=<UUID>`. | El piloto está confinado al tenant local acordado; organizaciones sin su UUID en la variable continúan operando con el comportamiento de fallback. |
| Streaming y Edición en Caliente | El asistente devuelve la respuesta completa generada por el proveedor sin streaming de tokens interactivo en el panel. | No existe panel web en vivo para modificar respuestas sin recompilar el artefacto publicado. |

---

## 2. Mascota Robot Pixy y Renderizador Gráfico

| Elemento | Estado observado en código | Recomendación editorial y técnica |
|---|---|---|
| Propagación de configuración del robot | Al guardar en `/platform/admin`, los clientes conectados no reciben actualización inmediata (no hay Realtime ni WebSocket para `platform_settings`). | El usuario debe recargar (`F5`) las pestañas abiertas para reflejar cambios de activación o apariencia. |
| Rendimiento de animación continua | La medición sintética registró hasta 27 ms de p95 por frame con animación continua. | La documentación desaconseja activar animación continua por defecto; se promueve el modo contextual (reposo estático a 30 FPS). |
| Seguimiento de cursor | Funciona exclusivamente con puntero fino (ratón) y se desactiva con `prefers-reduced-motion` o en pantallas táctiles. | No debe afirmarse que el robot persigue el dedo en tabletas o smartphones. |
| Instrumentación en módulos | Solo el `BrandCenter` (`usePetOperation`) y avisos críticos tienen enlace reactivo con la mascota. | Otros módulos del sistema (como facturación o CRM) no alteran el rostro de la mascota durante sus operaciones de guardado. |

---

## 3. Navegación, Tema y Funciones Retiradas

| Característica | Estado en esta rama | Corrección respecto a documentación histórica |
|---|---|---|
| Conmutador de Tema (Claro / Oscuro) | Ubicado de forma fija en el borde del menú lateral (`SidebarThemeToggle`). Conmuta mediante `next-themes` y almacenamiento local. | No existe una ruta `Configuración > Preferencias` para cambiar el tema; era una alucinación del modelo en pruebas previas. No se guarda en base de datos. |
| Botón de papelera en Sidebar | Retirado. En su lugar se colocó el botón de tema. | La documentación previa mencionaba un evento `pixy:open-trash`, el cual carece de receptores en el código fuente actual. |
| Menú flotante antiguo y Meta Control | `UnifiedFloatingFab` y `useAssistant` fueron retirados del layout (`fab-controller.tsx`). | No debe presentarse Meta Control como disponible en el dashboard. Existen archivos fuente huérfanos pendientes de limpieza profunda por Codex. |
| Historial previo a la migración | La migración `20261011000003_help_chat_history.sql` creó las tablas `help_chat_threads` y `help_chat_messages`. | Las consultas formuladas antes de esa fecha en versiones anteriores no son recuperables. |

---

## 4. Permisos IAM: Convivencia de Sistemas Legacy y V2

| Archivo / Módulo | Situación técnica | Impacto |
|---|---|---|
| `src/modules/core/iam/permissions/defaults.ts` | Marcado como `@deprecated` en código. Contiene constantes hardcoded (`DEFAULT_PERMISSIONS_BY_ROLE`). | El sistema oficial es IAM V2 dinámico (`organization_roles` y `permissions.ts`). La ayuda debe basarse exclusivamente en los identificadores de IAM V2. |
| Exportación de leads | Segregada bajo el permiso explícito `crm.data.export`. | Un usuario con rol de edición puede no tener acceso a la descarga de la base de datos si este switch no fue activado. |
| Borrado en masa de tareas | Segregado bajo el permiso `can_bulk_delete_tasks`. | La barra de acciones flotantes oculta o deshabilita la eliminación masiva si el usuario no tiene este privilegio. |

---

## 5. Módulos Verticales y Disponibilidad Condicional

| Módulo | Ruta | Restricción comprobada |
|---|---|---|
| Arriendos (`module_rentals`) | `/rentals` | Bloqueado por `capabilities-registry.ts` para cualquier organización que no sea de tipo `real_estate`. No debe publicitarse como función de uso general. |
| Cartera (`module_cartera`) | `/cartera` | Módulo en desarrollo activo con interfaz preliminar en esta rama; tablas de amortización consolidadas pendientes. |
| Hosting Web (`module_hosting`) | `/hosting`, `/platform/hosting-accounts` | Módulo legacy orientado a agencias de desarrollo web; no habilitado para la mayoría de sectores. |
| Limpieza (`module_cleaning`) | `/cleaning` | Módulo específico de vertical con baja actividad de actualización; restringido a preset cleaning. |
| Menú de Restaurante (`resto`) | `/menu` | El bloqueo automático de pedidos opera para el portal B2C; no bloquea la toma de comandas internas por meseros en `/resto-orders`. |

---

## 6. Mensajería, Canales y Respuestas Rápidas vs. Plantillas Oficiales

| Componente | Comportamiento en código fuente | Impacto operativo |
|---|---|---|
| Ventana de 24 horas (WhatsApp Cloud API) | `sendTemplateMessage` impone envío de HSM oficial cuando vence la ventana de atención. El texto libre y las respuestas rápidas fallan al remitirse fuera de esa ventana. | La ayuda enfatiza que insertar una respuesta rápida no elude la política de Meta. Solo una plantilla `APPROVED` con `meta_id` puede reabrir la conversación. |
| Desconexión de canal en Pixy vs. Meta | `deleteChannel` en `actions.ts` borra el registro en BD de Pixy y cancela el tráfico local. En canales con modo `coexistence`, la app física sigue vinculada a Meta hasta que el usuario la desconecte desde el celular. | El operador debe completar la desvinculación manual en su teléfono móvil (*WhatsApp Business → Configuración → Cuenta → Plataforma empresarial*). |
| Visibilidad de canales para agentes | Controlado por `evaluateInboxPermissions` (`inbox-permissions.ts`). Requiere `inbox.conversations.global_view` para ver todos los números conectados. | Sin este permiso, el agente no visualiza conversaciones de canales que no le hayan sido asignados de forma explícita. |
| Respuestas automáticas fuera de horario | `EditChannelSheet` almacena `working_hours` y `auto_reply_when_offline`. Solo se despachan si el switch general de horarios está encendido. | Si el usuario redacta el mensaje de fuera de horario pero olvida activar el interruptor de horarios, ningún cliente recibirá respuesta automática nocturna. |
