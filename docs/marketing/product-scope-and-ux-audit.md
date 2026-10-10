# Marketing masivo: alcance, escala comercial y simplificación

Revisión del 10 de octubre de 2026, sobre `1fe7a68e` en `codex/marketing-campaign-hardening`. Auditoría de código y contratos; no cambia funcionalidades, base de datos ni producción, y no activa envíos. La herramienta de navegador falló al iniciar en esta sesión: no se presenta esta revisión como una nueva validación visual o de usabilidad con usuarios.

## Veredicto

La arquitectura es una base razonable para un producto multiempresa de campañas WhatsApp. Sus controles transaccionales, consentimiento, aislamiento, outbox, recuperación y ritmo compartido responden a riesgos reales. No conviene simplificarlos para reducir pantallas.

La interfaz sí resulta excesiva para el caso habitual de seleccionar contactos y enviar una plantilla. Confunde difusión puntual, secuencias de seguimiento, información publicitaria y herramientas internas. Recomiendo un flujo sencillo por defecto, con secuencias opcionales y el mismo motor existente. No una reimplementación del módulo.

La capacidad de alta escala no está certificada: las pruebas previas verificaron contratos y aislamiento, no un SLA de miles de tenants concurrentes. Aún requiere validación real pequeña antes de habilitar campañas.

## Qué es la supuesta pestaña «Campañas Meta»

En el código actual de `/crm/marketing` no existe una pestaña con ese nombre. Sus pestañas son Campañas, Historial y Métricas. Sí existe una confusión verificable:

| Superficie | Qué hace hoy | Decisión propuesta |
|---|---|---|
| `/crm/marketing`, `MarketingDashboard` y `CampaignBuilder` | Borradores, selección de destinatarios, plantillas WhatsApp, secuencias, programación y resultados propios de mensajes | Mantener como Marketing masivo / Campañas WhatsApp |
| Métricas de `/crm/marketing` | Cambia el encabezado a «Meta Insights» y el subtítulo a «Meta Ads y conversiones», pero no tiene `TabsContent` | Retirar la pestaña vacía y los textos publicitarios de este módulo; mantener métricas verificadas en cada campaña |
| Historial de `/crm/marketing` | Solo muestra un marcador con la palabra Historial | Retirar el marcador. El historial funcional ya está en Resultados de cada campaña |
| `infrastructure/meta/components/tabs/MarketingTab.tsx` | Mezcla ROI, gasto publicitario, compras y una supuesta salud/cuota WhatsApp. Todo son constantes demo; las llamadas API están comentadas | Retirar esa pestaña demo del panel interno. No migrar sus datos ficticios a Meta Ads |
| `/crm/meta-ads`, `MetaAdsCenter` | Ruta independiente que usa `AdsService`, configuración de cuenta publicitaria y datos Ads | Conservar en su módulo; esta auditoría no certifica ni modifica su implementación |

`MarketingTab` se monta desde `MetaControlSheet`, a su vez condicionado en `FabController` al slug interno `pixy-agency`. No es una pestaña del dashboard de masivos de los demás tenants. Los reportes anteriores la llamaron `MetaMarketingTab`: ese nombre era impreciso y queda corregido aquí.

La pestaña demo no crea anuncios ni campañas de mensajes y no es una dependencia del worker de masivos. Quitar su import, trigger y contenido sería una limpieza de interfaz acotada; no exige eliminar servicios, credenciales, permisos, conexiones ni datos históricos de Meta.

El nombre Marketing tampoco prueba que algo sea Ads: hay capacidades de marketing de WhatsApp. En esta rama, el emisor operativo de campañas reutiliza `outboundService` y plantillas; el antiguo `MarketingAPIManager` no tiene consumidores de producción encontrados fuera de documentación/pruebas. No se debe presentarlo como una integración operativa adicional ni añadirlo al flujo de usuarios.

## Problemas comerciales y de UX comprobados

| Prioridad | Evidencia actual | Efecto | Solución acotada |
|---|---|---|---|
| P1 | Dos entradas: Campaña Rápida guarda un borrador completo; Crear Campaña pide un nombre y abre un constructor vacío | El usuario debe elegir arquitectura antes de saber qué enviar | Una acción Nueva campaña; plantilla de un mensaje por defecto y seguimiento opcional |
| P1 | El constructor abre Flujo Principal; el canal y la audiencia seleccionada están en Configuración | Se pide diseñar el mensaje antes de resolver requisitos básicos | Canal visible al principio; recorrido Destinatarios → Mensaje → Programación → Revisión |
| P1 | La lista muestra `draft ? Borrador : Activa` | Pausadas, completadas o archivadas aparentan estar activas | Mapa exhaustivo de estados y bloqueo/fecha de siguiente ejecución visibles |
| P1 | Cards usan `total_enrolled` y `engagement_score`; no se encontró actualización de esos campos en el motor actual. Barra de progreso fija en 0% | Indicadores de apariencia funcional sin correspondencia garantizada con resultados | Resumen paginado derivado de las métricas actuales; distinguir elegibles, aceptados, entregados, leídos y fallidos; quitar engagement/progreso sin definición |
| P1 | Mensaje «Protección automática por salud del canal: pendiente de implementación. No está activa» | Contradice el bloqueo de salud aplicado por SQL/outbox y la vista de resultados | Mostrar estado real y fecha de verificación; no interruptor decorativo ni mensaje obsoleto |
| P1 | Historial marcador, Métricas sin contenido y «Audiencias Activas» con `--` | Navegación vacía y falsas expectativas de completitud | Menú y KPI solo para funciones/datos existentes |
| P2 | Secuencias múltiples aunque solo la principal se ejecuta; nombres Flujo/Embudo/Drip mezclados | Complejidad conceptual sin beneficio para una difusión simple | Una secuencia implícita para un mensaje; seguimiento opcional como lista lineal Mensaje → Espera → Mensaje |
| P2 | Modos Stealth/Growth/Turbo, tarjetas grandes y ajustes de ritmo/humanización | Sugiere protección o capacidad especial; consume espacio y decisiones | Un ritmo predeterminado explícito. Intervalo, ventana y zona en ajustes avanzados compactos; conservar controles backend |
| P2 | Esperas backend en minutos/horas/días; editor solo ofrece días y no hay controles de reordenación de pasos | Seguimiento limitado y difícil de corregir | Unidad clara y acciones Subir/Bajar. No hace falta canvas de nodos o drag-and-drop para una secuencia lineal |
| P2 | Editor de plantillas presenta campos técnicos; resultados y tarjetas ocupan muchas secciones | Cuesta anticipar qué recibirá el contacto y encontrar problemas operativos | Preview compacto con personalización de ejemplo explícita, resumen fijo y detalles plegables |
| P2 | Autorización y renovación aparecen dentro de Configuración de campaña | Se mezcla gestión de permiso de contactos con parámetros de envío | Acceso contextual desde exclusiones/destinatarios; mantener evidencia y renovación independiente |
| P2 | Ayuda anuncia cientos en segundos y Email/SMS; ejecución actual valida WhatsApp/esperas | Promesas que no corresponden a la capacidad real | Corregir ayuda y canales publicados; no anunciar canales deshabilitados |
| P2 | Selección rápida y constructor no comparten todo el mismo recorrido; creación rápida vuelve a lista | Un borrador guardado no conduce claramente a la revisión final | Abrir el borrador guardado, indicar el siguiente paso y conservar confirmación explícita |

Estos hallazgos son verificables en código. La intuición, legibilidad a diferentes tamaños y tiempo de tarea requieren una revisión visual y una prueba de usuarios; no se inventan puntuaciones ni resultados de esas pruebas.

## Escalabilidad y eficiencia

**A favor:** RLS y permisos por tenant; activación/snapshot transaccionales; claims y leases con `SKIP LOCKED`; rotación de conexiones; operación estable por destinatario/paso; ritmo compartido del número; baja y salud antes del envío; historial paginado por cursor. Son fundamentos útiles, no ornamentación.

**Límites actuales:**

- `getCampaigns` y `getAudiences` cargan listas sin paginación. Con crecimiento pueden ser lentas o quedar truncadas por el límite REST; el usuario no ve esa truncación. Añadir paginación/búsqueda servidor y resúmenes propios de cada página, evitando una consulta de métricas por card.
- El worker adquiere hasta 25 trabajos, uno por conexión elegida, y los procesa secuencialmente con presupuesto de inicio de trabajo de 15 segundos. Una llamada lenta puede demorar otros canales y dejar leases hasta su vencimiento. El contrato es seguro, pero la capacidad depende de programador, latencia y número de workers. Medir antes de introducir concurrencia limitada; preservar exclusión por número y ritmo común.
- Activación y revisión de audiencia agregan destinatarios y sus datos. Coste proporcional al tamaño; audiencias muy grandes exigirían preparación por lotes sin perder la confirmación/snapshot. No se ha medido el umbral que justifica ese cambio.
- Importación actual: 100 filas y 1 MB por revisión. Correcto como límite declarado de esta versión, insuficiente como promesa de importar bases grandes. El siguiente escalón es un job paginado con archivo privado, progreso y cancelación; no ampliar el límite de una transacción ciegamente.
- Metricas globales usan conteos exactos; el detalle consulta resultados cuando se carga o refresca. A gran volumen se deben medir índices/planes y diseñar actualización visible mientras la campaña corre, sin polling de todas las cards ni duplicar receptores de webhooks.
- La retención de revisiones y la cascada histórica al eliminar contactos siguen siendo deuda documentada. No se necesita un microservicio nuevo para resolverlas.

**Conclusión comercial:** base apta para un lanzamiento controlado después de cerrar UX engañosa y prueba real; capacidad masiva a gran escala aún no acreditada. Robustez backend justificada, interfaz sobredimensionada para el envío puntual.

## Producto propuesto

Página principal: tabla compacta de campañas, búsqueda y filtros por estado/canal, con Nueva campaña como acción principal. Cada fila: estado real, número emisor, programación y conteos definidos. Resultados/historial dentro de la campaña; segmentos reutilizables y permisos de contactos como accesos secundarios, no pasos obligatorios de arquitectura.

Creación en cuatro pasos:

1. **Destinatarios:** elegir número emisor, filtrar contactos o importar, mostrar elegibles y exclusiones accionables. Guardar segmento es opcional; guardar audiencia interna sigue siendo posible sin pedir ese concepto al usuario.
2. **Mensaje:** una plantilla aprobada, variables legibles y preview. «Añadir seguimiento» revela mensajes/esperas lineales; no expone múltiples secuencias en el recorrido habitual.
3. **Programación:** empezar al confirmar o fecha futura, zona horaria y ventana. Ritmo en avanzado y explicado como intervalo, sin promesas anti-baneo ni indicadores de capacidad no medida.
4. **Revisión:** resumen de destinatarios, contenido, emisor y programación; problemas concretos con acceso al campo; confirmación existente, bloqueada si cambia lo revisado.

Después de activar, la pantalla pasa a operación: progreso definido por estados, entregas/lecturas separadas de aceptación, incidencias, exclusiones y siguiente acción. Pausar/reanudar e historial/exportación reutilizan contratos existentes. Nunca «reintentar todos» cuando hay resultados ambiguos.

Para potencia comercial priorizar búsqueda, estados fiables, preview, exclusiones accionables y seguimiento opcional. Duplicar como nuevo borrador sería útil después, revalidando canal/plantillas/consentimiento; no copiar ejecuciones. Presupuestos solo si hay fuente de precios versionada y consumo verificable, como estimación diferenciada; no inventar gasto ni ROI, ni introducir cobros para simplificar UX.

## Orden de ejecución recomendado

1. Limpieza pequeña: retirar superficies vacías/simuladas y textos Ads en masivos, corregir estados/métricas/ayuda y mensaje de salud. Conservar Meta Ads y las integraciones.
2. Unificar creación y añadir editor simple reutilizando acciones, plantillas, audiencia, revisión y resultados existentes. Leer campañas anteriores en el mismo formato; cambios de interfaz sin migrar inscripciones ni reconstruir el emisor.
3. Paginación y actualización operativa acotada. Las importaciones grandes/concurrencia se dimensionan con mediciones, no con una reestructuración preventiva.
4. Verificar creación/edición/seguimiento, guardado, invalidación de revisión, pausa y resultados; prueba de usabilidad y regresión Inbox. Luego la campaña real pequeña ya pendiente, antes de habilitar ejecución.

La simplificación debe conservar permisos, evidencia y bajas, snapshot/revisión vinculada al actor, idempotencia, bloqueo por salud, aislamiento y ritmo compartido del número. Ninguna de esas garantías requiere obligar al usuario a navegar un constructor de automatizaciones para un solo mensaje.
