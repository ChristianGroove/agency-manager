# Pixy Robot Pet: evaluación y plan de integración

Fecha: 11 de octubre de 2026, America/Bogota. Documento de inspección y propuesta inicial. La primera entrega está descrita en [el informe de verificación](./pixy-robot-pet-verification.md).

## Recomendación

Integrar `robot-heads` mediante un piloto en Pixy, con versión fija y una capa de adaptación propia. Es una buena base para un acceso permanente a ayuda y para comunicar estados. Su pequeño paquete y su ejecución local favorecen la integración. Su reciente publicación y algunos detalles de resiliencia impiden recomendar una activación general sin validar el comportamiento en el dashboard.

La mascota debe ser un componente visual opcional. El chat, las alertas, sus textos, los permisos y las operaciones deben seguir funcionando aunque la mascota esté apagada o falle. No se puede prometer ausencia absoluta de errores; sí diseñar y verificar que un fallo visual tenga un impacto acotado.

La inspección inicial no instaló dependencias en Pixy, no modificó funcionalidades ni consultó una base de datos remota. Se realizó sobre la rama `NUEVO-MODULO-CARTERA`, commit `4d94f323`, con cambios locales preexistentes. La implementación posterior se desarrolla en la rama solicitada **`pixyrobotpet`**, preservando el trabajo de Cartera. Los cambios locales de otros trabajos no pertenecen a la mascota.

## Evidencia del proveedor

Se consultaron GitHub y npm, se descargaron las fuentes a una carpeta temporal y se inspeccionó el paquete publicado sin instalarlo ni ejecutarlo.

| Dato comprobado | Resultado |
| --- | --- |
| Versión publicada como `latest` | `0.3.0` |
| Publicación inicial en npm | 9 de octubre de 2026 |
| Publicación de `0.3.0` | 10 de octubre de 2026 |
| Commit inspeccionado; coincide con `gitHead` de npm | `58ebf6439a8125a769f63b22ffd35bc18834b1b5` |
| Integridad del archivo descargado | SHA-512 calculado coincide con `dist.integrity` del registro |
| Paquete completo descomprimido | 93.937 bytes, 6 archivos |
| Archivo ESM distribuido | 47.313 bytes; 15.650 bytes comprimido con gzip localmente |
| Dependencias de ejecución declaradas | Ninguna; React `>=18` es dependencia peer |
| Scripts de instalación | No aparecen `preinstall`, `install` ni `postinstall` |
| Licencia | MIT; conservar licencia y atribución en la distribución |

El gzip anterior mide solo el archivo ESM del proveedor; no mide el incremento final del bundle de Next.js. La integridad acredita que se inspeccionó el archivo publicado, no certifica que esté libre de vulnerabilidades.

La revisión estática de `src/` y del ESM distribuido no encontró uso de solicitudes de red, cookies, almacenamiento local, `eval`, `new Function` ni inserción de HTML. El renderizador usa canvas 2D. La mascota no incorpora un servicio de IA ni necesita enviar datos a su autor. No se hizo auditoría formal, comparación reproducible de compilaciones, benchmark de navegador ni comprobación de todas las vulnerabilidades de las herramientas de desarrollo.

El repositorio consultado muestra cuatro commits y no incluye una suite de pruebas en su árbol. La edad del proyecto supone un riesgo de mantenimiento mayor que el tamaño del paquete. Fijar la versión exacta, conservar el lockfile y revisar cada actualización. Si se mantiene una variante local, registrar el commit de origen y cada modificación.

Fuentes primarias: [repositorio](https://github.com/fayazara/robot-heads), [metadatos npm](https://registry.npmjs.org/robot-heads), [manifest del commit revisado](https://github.com/fayazara/robot-heads/blob/58ebf6439a8125a769f63b22ffd35bc18834b1b5/package.json), [licencia](https://github.com/fayazara/robot-heads/blob/58ebf6439a8125a769f63b22ffd35bc18834b1b5/LICENSE).

## Encaje y límites de la librería

La API permite cuatro formas: `rectangle`, `square`, `circle` y `hexagon`. Ofrece nueve estados: `idle`, `thinking`, `searching`, `listening`, `speaking`, `working`, `happy`, `error` y `sleeping`. Expone colores de carcasa, detalles y LEDs, tamaño, velocidad, pausa, interacción, antena, sombra y semilla. El modelo disponible es `tv`; no hay un editor de geometría arbitraria. [Tipos del proveedor](https://github.com/fayazara/robot-heads/blob/58ebf6439a8125a769f63b22ffd35bc18834b1b5/src/types.ts).

El configurador de `site/` es una demostración React. Sus controles sirven de referencia, pero no proporcionan panel multi-tenant, persistencia, autorización ni auditoría para Pixy. Crear una interfaz nativa con los componentes existentes; incorporar únicamente el renderizador, sin el Worker, la web de demostración ni sus fuentes. [Playground](https://github.com/fayazara/robot-heads/blob/58ebf6439a8125a769f63b22ffd35bc18834b1b5/site/src/App.tsx).

| Hallazgo técnico | Consecuencia y respuesta recomendada |
| --- | --- |
| Un único `requestAnimationFrame` compartido; se detiene con pestaña oculta o sin suscriptores | Buena base, pero cada mascota sigue dibujándose en cada frame visible. Una sola instancia animada permanente. |
| DPR limitado a 2 y texturas compartidas | Favorece tamaños pequeños. Medir CPU y memoria en dispositivos reales. |
| `speed` modifica el tiempo de simulación | Bajar velocidad no limita los FPS ni garantiza menor consumo. |
| Caché global de texturas por forma/tamaño sin límite explícito | Usar tamaños discretos; evitar sliders que generen cientos de tamaños y redibujados. |
| Listeners globales de puntero y visibilidad no se eliminan al retirar el último componente | Son un conjunto fijo, no crecen por cada montaje, pero permanecen hasta recargar la página. Limpiar en una variante endurecida si se exige apagado completo. |
| Preferencia de movimiento reducido consultada al ejecutar el efecto | El adaptador debe escuchar cambios de esa preferencia durante la sesión. |
| Elemento exterior `span` con `role="img"` | Envolverlo en botón accesible; teclado, foco visible y etiqueta localizada. |
| Clic interactivo provoca una reacción `happy` temporal | Desactivar el juego por defecto: podría ocultar momentáneamente un estado de error. |
| Dibujo sobresale de la caja de layout | Reservar espacio y comprobar recortes, overlays y zonas táctiles. |
| Sin estado `warning`; colores de algunas luces definidos internamente | Advertencias conservan texto e icono ámbar; no simular un estado inexistente. Los colores de carcasa/detalles sí heredan marca. |

Una pausa dibuja la pose estática del estado, no conserva necesariamente el último frame. Los gestos, el ecualizador y la barra del estado `working` son animaciones: no representan audio ni porcentaje real por sí solos. [Componente](https://github.com/fayazara/robot-heads/blob/58ebf6439a8125a769f63b22ffd35bc18834b1b5/src/RobotHead.tsx), [ticker](https://github.com/fayazara/robot-heads/blob/58ebf6439a8125a769f63b22ffd35bc18834b1b5/src/ticker.ts), [renderizador](https://github.com/fayazara/robot-heads/blob/58ebf6439a8125a769f63b22ffd35bc18834b1b5/src/tv/render.ts), [luces y caras](https://github.com/fayazara/robot-heads/blob/58ebf6439a8125a769f63b22ffd35bc18834b1b5/src/tv/faces.ts).

## Puntos de integración encontrados en Pixy

| Área | Código existente y uso propuesto |
| --- | --- |
| Dashboard administrativo | `src/modules/features/portal/components/portal-registry.tsx` registra actualmente `b2b_dashboard`; los demás casos caen en esta plantilla. Montaje único en `b2b-agency-layout.tsx`, sin depender de que mensajería esté activa. |
| Acceso actual | `src/components/layout/unified-floating-fab.tsx` agrupa ayuda, tema, Meta Control y Pixy Assistant. `fab-controller.tsx` abre el modal de ayuda. Sustituir únicamente su acceso a ayuda y preservar las otras herramientas. |
| Chat de ayuda | `src/modules/features/caa/components/assistant-modal.tsx` abre directamente `AIChatPanel`. Reutilizar ambos y `ask-help-assistant.ts`; no construir otro chat. |
| Branding | `src/modules/core/branding/actions.ts:getEffectiveBranding()` resuelve `portal_primary_color` y `portal_secondary_color` de `organization_settings`, con respaldo global. `src/components/providers/branding-provider.tsx` expone `useBranding()`. |
| Super admin | `/platform/admin`, dentro de `SaasEngineManager` → Marca Global, ya monta `GlobalBrandingManager`. Añadir allí una sección Mascota, con guardado independiente. |
| Activación por tenant | `src/modules/core/saas/feature-flags.ts` ofrece flags y configuración JSONB. Las funciones desconocidas y la ausencia de organización pueden devolver activo; la mascota exige lectura explícita con respaldo apagado. |
| Alertas de operación | Hay llamadas directas a Sonner en muchos módulos. `src/app/layout.tsx` importa `Toaster` directamente de Sonner: editar solo `src/components/ui/sonner.tsx` no cambiaría ese montaje. |
| Avisos generales | `system-alert-banner.tsx` consume `system_alerts`. Elige el primer aviso no descartado, no ordena realmente por severidad. Definir prioridad explícita al coordinar estados. |
| Notificaciones y tarjetas | `notification-bell.tsx` usa un canal Realtime filtrado por usuario y comprobaciones locales de organización; `smart-alert.tsx` muestra alertas agregadas. Reutilizar fuentes autorizadas, sin suscripción adicional solo para la mascota. |
| Anuncios comerciales | `global-dashboard-banner.tsx` tiene un motor distinto de banners. Considerar su uso después, con integración separada de las alertas operativas. |

El código distingue la organización interna con el slug `pixy-agency`. La marca global vive en `platform_settings`, singleton `id=1`; no es automáticamente la misma entidad que una organización llamada Pixy. En implementación, confirmar el ID de la organización interna y usar ese ID para la excepción visual, sin depender del nombre mostrado.

El FAB actual tiene `z-[9999]` y recorta contenido con `overflow-hidden`; los diálogos usan niveles inferiores. No copiar esa jerarquía para la mascota. Verificar que no quede por encima de modales, confirmaciones, bandeja de mensajes o navegación móvil.

## Arquitectura propuesta

Crear `src/modules/core/pet/` con responsabilidades acotadas:

- `schema.ts` y `config-actions.ts`: configuración validada, permisos y proyección de lectura segura.
- `resolve-pet-config.ts`: activación efectiva y resolución de colores por organización.
- `pet-provider.tsx` y `pet-state-store.ts`: señales efímeras, prioridad, expiración y limpieza.
- `robot-head-adapter.tsx`: único punto que conoce la librería, carga diferida y recuperación visual.
- `pet-help-trigger.tsx`: botón que llama al mismo manejador de ayuda de `FabController`.
- `pet-alert-avatar.tsx`: variante pequeña, preferiblemente estática, para alertas instrumentadas.

Los módulos publican señales semánticas de inicio, éxito o fallo. No importan directamente `robot-heads` ni esperan una respuesta de la mascota. Cuando está apagada, publicar señales es una operación vacía. Una excepción del observador visual no debe propagarse al guardado de una factura o a otra acción de negocio.

La librería se carga con `next/dynamic`, `ssr:false`, desde un componente cliente y únicamente cuando la activación efectiva lo permite. No montarla en el layout raíz: eso también afecta login y portales públicos. Mantener el modal de ayuda independiente y disponible durante la carga y ante fallos.

Un `ErrorBoundary` local cubre errores de React y montaje, pero no captura excepciones posteriores de `requestAnimationFrame`. El ticker revisado invoca suscriptores sin protección. Para el objetivo de recuperación automática, la fase inicial debe validar esos fallos y, si es necesario, mantener una variante mínima del proveedor con captura dentro del dibujo/ticker, aislamiento por suscriptor y notificación de fallo al adaptador. No modificar `window`, Sonner ni React mediante parches globales.

## Configuración y herencia de marca

Propuesta mínima: añadir `pet_config` JSONB a `platform_settings`, con versión de esquema y valor inicial desactivado. Guardar exclusivamente parámetros visuales y política global; ningún secreto ni listado de tenants en esta tabla, cuya lectura ya es pública en las migraciones.

| Control del super admin | Comportamiento |
| --- | --- |
| Activada / apagada | Interruptor maestro. Apagada restaura el acceso de ayuda actual. |
| Activación general o piloto | Respaldo general inicialmente apagado; flags explícitos para tenants del piloto. |
| Animación | `off`, `contextual` o `continuous`; recomendado `contextual`. |
| Integración con alertas | Interruptor independiente, inicialmente apagado. |
| Aspecto | Forma, tres colores, tamaños discretos desktop/móvil, antena, sombra, velocidad limitada e interacción. |
| Vista previa | Selector de estado para probar; el estado de demostración no se guarda como estado permanente. |
| Restaurar defaults | Restablece solo la configuración de la mascota. |

Aplicar validación estricta con Zod: enumeraciones cerradas, colores HEX normalizados, tamaños permitidos, números finitos y rangos acotados. `seed`, clases, estilos y callbacks pertenecen al adaptador, no a configuración arbitraria del cliente. La posición inicial será una decisión del piloto; posteriormente solo permitir posiciones predefinidas.

Reglas de resolución:

1. Organización interna Pixy: carcasa y detalles definidos en el panel de la mascota; si faltan, usar marca global.
2. Otros tenants: carcasa = `branding.colors.primary`; detalles = `branding.colors.secondary`, obtenidos de `useBranding()` y del mismo resolutor que ya utiliza el sistema.
3. Branding parcial o ausente: aplicar el respaldo global por cada color faltante. No exigir que existan ambos ni decidir por comparar valores contra colores por defecto.
4. LEDs: valor global legible; conservar rojo semántico del estado de error. La identidad de marca no debe eliminar señales de severidad.
5. Cambio de organización: recalcular colores y limpiar estados del contexto anterior. El switcher actual recarga el dashboard, pero el diseño también debe cubrir cambios futuros sin recarga.

No duplicar paletas en la base de datos de cada tenant ni inferir HEX leyendo variables CSS: el parser del proveedor no resuelve `var(...)` ni `oklch(...)`. Normalizar valores antes de entregarlos al canvas. Cambiar apariencia no debe escribir en ADN ni modificar tokens globales de la aplicación.

Cada acción de configuración debe ejecutar `requireSuperAdmin()` y validar el payload en servidor. La página administrativa ya tiene esa guardia; `updatePlatformSettings()` no la ejecuta explícitamente. Además, las migraciones revisadas permiten lectura pública y gestión por `service_role` en `platform_settings`. Verificar las políticas efectivamente desplegadas antes de elegir escritura con cliente autenticado o servicio administrativo. Si se usa `supabaseAdmin`, hacerlo después de autorización y con columnas permitidas explícitamente.

Los overrides de activación deben respetar permisos y RLS de `feature_flags`; revisar su política antes de reutilizarla para el piloto. No copiar sin revisión `toggleFeatureFlag()`: su lectura del valor actual usa la organización activa aunque reciba otra organización como objetivo. No permitir que un override reactive la mascota cuando el interruptor maestro está apagado.

## Comportamiento de acceso y estados

Recomendación inicial de ubicación: esquina inferior derecha, reemplazando el recorrido de dos clics para ayuda por un clic en la mascota. Tamaño a validar: 56 o 64 px desktop, 48 px móvil. Mantener tema y herramientas internas en un acceso secundario compacto. Otra ubicación puede elegirse tras el piloto; el renderizador debe permitir cambiarla sin afectar la arquitectura.

Botón con nombre accesible “Abrir ayuda”, foco visible y área táctil suficiente. Ocultar el elemento decorativo a lectores de pantalla cuando su semántica ya la proporciona el botón. Respetar safe areas y modales; la mascota nunca captura teclado o impide seleccionar elementos del dashboard.

| Señal real | Estado visual inicial | Uso posterior |
| --- | --- | --- |
| Disponible, sin actividad | `idle`, estático o animación breve | Presencia discreta |
| Consulta de ayuda en curso | `thinking` | Espera de IA |
| Respuesta recibida | `happy` breve, luego `idle` | Confirmación útil |
| Consulta fallida | `error`, con mensaje existente | Acceso a recuperación |
| Búsqueda real instrumentada | `searching` | Catálogo, CRM o conocimiento |
| Operación asíncrona iniciada | `working` | Exportación, importación o automatización |
| Entrada de voz activa | `listening` | Solo al integrar una fuente real de voz |
| Salida de voz activa | `speaking` | Solo cuando haya reproducción real |
| Inactividad prolongada | `sleeping` estático opcional | Debe seguir claro que ayuda está disponible |

El chat actual entrega una respuesta completa y no expone fases de búsqueda ni reproducción de voz. No inventar esos estados ni animar una barra como si fuera porcentaje de avance real.

Coordinar señales con `organizationId`, identificador de operación, origen, severidad y expiración. Priorizar incidentes críticos visibles, después actividad de ayuda y finalmente operaciones secundarias. Cancelar señales al terminar, cerrar el contexto o cambiar de tenant; ignorar resoluciones tardías de contextos anteriores. Agrupar repeticiones y limitar la cola para evitar oscilaciones o un estado “pensando” permanente.

## Integración gradual de alertas

Mantener texto, icono, severidad y acciones de las alertas actuales. La mascota complementa la comunicación; no confirma operaciones ni reemplaza sus fuentes de verdad.

Primero instrumentar el chat mediante un callback o señal de estado de `AIChatPanel`. Después añadir un adaptador `notify` para llamadas seleccionadas a Sonner que publique una señal y conserve el toast existente. No reemplazar globalmente todas las llamadas ni suscribirse a APIs internas de Sonner.

Si se incorpora un avatar en un toast, usar una instancia estática de tamaño fijo o una representación ligera del mismo diseño. Evitar una animación completa por cada toast concurrente. No guardar estados efímeros de animación en Supabase ni añadir polling o llamadas de IA por esos estados.

Los avisos generales mantienen su canal actual. Al incorporar notificaciones, exigir organización actual y rechazar eventos sin contexto de tenant salvo que sean broadcasts globales autorizados. La condición permisiva para notificaciones sin `organization_id` encontrada en `NotificationBell` no debe reutilizarse como regla de aislamiento de la mascota.

## Eficiencia, productividad y escalabilidad

El coste del renderizado ocurre en cada navegador, no en un servidor central por usuario. Configuración y assets pueden aprovechar las cargas existentes y caché. Escalar tenants no exige crear motores, conexiones ni registros de animación por tenant.

Sin embargo, canvas 2D realiza proyección, iluminación y dibujo por frame. “Sin WebGL” no significa coste nulo. Recomendación: reposo estático, animaciones al interactuar o cambiar de estado, pausa cuando no sea visible y una sola instancia animada. Desactivar seguimiento del puntero por defecto reduce mediciones de layout. Los cambios de frames deben permanecer fuera del estado React del dashboard.

La productividad potencial proviene de ayuda accesible en un clic, feedback claro y asistencia contextual. Debe medirse con apertura de ayuda, utilidad de las respuestas, recuperación de errores y molestias o pausas solicitadas. No contabilizar más clics o más consultas como una mejora por sí mismos.

La mascota no añade consumo de tokens. Una mayor adopción del chat sí podría aumentar coste y tráfico. `ask-help-assistant.ts` limita preguntas con un `Map` en memoria, que no ofrece un límite global consistente con varias instancias; además recorta cantidad de mensajes históricos sin limitar allí su contenido total. Antes de expansión masiva, revisar validación de historial y rate limiting compartido, junto con las cuotas del AI Engine. Esta es una limitación del chat existente, independiente del renderizador.

## Fases y entregables

| Fase | Alcance | Condición de salida |
| --- | --- | --- |
| 0. Preparación y prueba técnica | Crear `pixyrobotpet` desde base acordada; preservar cambios locales; fijar paquete/commit; probar en Next.js y comprobar errores de canvas, RAF y carga. | Compatible con React 19/Next 16; recuperación verificada; costes medidos. |
| 1. Mascota, branding y ayuda | Módulo aislado, panel super admin con preview, persistencia, flags, herencia ADN, acceso directo al chat y fallback. Piloto exclusivo Pixy. | Encendido/apagado funcional; chat y otras acciones conservados; branding correcto. |
| 2. Estados de ayuda y alertas piloto | Señales del chat, avisos generales y un conjunto pequeño de toasts seleccionados; controles separados. | Prioridades, limpieza y fallos comprobados; mensajes accesibles conservados. |
| 3. Módulos de uno en uno | Elegir casos de uso tras observar el piloto: CRM, cotizaciones/facturación, tareas/importaciones e integraciones/automatizaciones. | Cada módulo aporta señales reales y tiene verificación propia antes del siguiente. |
| 4. Expansión | Piloto en tenants con marcas claras, oscuras y parciales; analizar uso, coste del chat y rendimiento; activar gradualmente. | Beneficio medido y sin regresiones relevantes; reversión disponible. |

La fase 1 constituye el primer entregable útil y autónomo. La fase 3 queda abierta: su esfuerzo depende de los flujos elegidos, no del número de estados de la librería. Evitar comprometer todo el sistema en una única entrega.

## Pruebas, activación y reversión

Criterios mínimos antes de activar:

- Apagada: acceso actual a ayuda disponible, sin descargar ni montar el renderizador.
- Encendida: mismo chat y comportamiento funcional; Meta Control, tema y Assistant conservados.
- Guardado denegado a usuario normal y admin de tenant; probar acción de servidor y acceso de base de datos, no solo visibilidad de la interfaz.
- Pixy usa la configuración global; otros tenants usan su ADN; cambios de tenant no conservan colores, mensajes o señales anteriores.
- Fallos de configuración, chunk, canvas y callback de animación recuperan el acceso a ayuda sin propagarse a una operación de negocio.
- Móvil, claro/oscuro, teclado, movimiento reducido, foco, overlays y bandeja de mensajería funcionan correctamente.
- Operaciones concurrentes, cierres y respuestas tardías limpian sus señales y no producen estados atascados.
- Pestaña oculta y reposo estático no mantienen animación activa; montajes repetidos con tamaños fijos no muestran crecimiento sostenido de memoria.

Medir build y navegador comparando apagada/encendida en las mismas rutas y dispositivos. Presupuesto inicial propuesto, pendiente de medición: chunk propio de mascota y adaptador de hasta 35 KiB gzip; sin desplazamiento de layout; sin tareas largas de más de 50 ms atribuibles al renderizador; variación de INP p75 inferior a 20 ms. Ajustar según dispositivos representativos y condiciones reproducibles, no declarar estos objetivos como resultados obtenidos.

La migración será aditiva y con configuración desactivada. Fallo o ausencia de configuración significa apagada. Desactivar alertas debe mantener mascota/chat; desactivar animación mantiene una representación estática; desactivar la mascota restaura ayuda actual. Para revertir el código, basta retirar el montaje y conservar datos de configuración hasta confirmar estabilidad.

El guardado debe invalidar la configuración y refrescar la vista administrativa. En una primera versión, las sesiones abiertas reciben cambios al recargar o revalidar por navegación/foco; `revalidatePath` por sí solo no actualiza todos los navegadores en tiempo real. Si se exige apagado remoto con plazo máximo, añadir explícitamente propagación mediante una fuente de configuración existente o revalidación visible cada 30–60 segundos, con caché global y claves por tenant. Medir ese coste; no crear una conexión por mascota ni trasladar la lista privada de tenants a una caché pública.

## Usos adicionales con mejor retorno

Ayuda contextual por vista utilizando el registro CAA; onboarding guiado con pasos opcionales; feedback de exportaciones e importaciones; avisos de desconexión que enlacen a la recuperación existente; resumen de tareas relevantes; y accesos a instrucciones para resolver errores.

Priorizar asistencia solicitada y señales breves. Reservar voz, celebraciones, recomendaciones proactivas y anuncios para fases posteriores y con controles para silenciarlos. Toda acción debe conservar los permisos y confirmaciones que exige el flujo original.

## Límite de esta inspección

En la inspección inicial se revisaron código local, migraciones y fuentes públicas. No se ejecutaron entonces pruebas del producto porque la entrega consistía en este documento. La recomendación fue favorable para una integración controlada. Consultar el informe de verificación para las pruebas realizadas durante la implementación; las políticas desplegadas y el piloto real continúan pendientes de validación.
