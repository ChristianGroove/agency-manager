---
schema_version: 1
id: pet.pet-interaction
title: Estados visuales, hibernación e interacción con la mascota
module: pet
status: draft
audience: tenant-user
source_revision: 0e5706d2f235ee40698ded73cc14e161e908e292
verified_on: 2026-10-12
verification: source-only
routes:
  - /dashboard
keywords:
  - mascota
  - robot
  - expresiones
  - estados
  - hibernación
  - reposo
  - ayuda
requirements:
  - Mascota habilitada para la organización
evidence:
  - path: src/modules/core/pet/pet-help-trigger.tsx
    symbol: PetHelpTrigger
    claim: Botón flotante transparente en la esquina inferior derecha con despertar al interactuar (hover, focus, touch).
  - path: src/modules/core/pet/use-pet-hibernation.ts
    symbol: usePetHibernation
    claim: Temporizador interno de 1-30 min que pone al robot en estado sleeping y pausa el canvas tras inactividad directa.
  - path: src/components/layout/fab-controller.tsx
    symbol: FabController
    claim: Conmuta entre la mascota robot y el botón simple de mensaje según la disponibilidad, y retira el launcher al abrir el diálogo de ayuda.
  - path: src/modules/features/caa/components/ai-chat-panel.tsx
    symbol: AIChatPanel
    claim: Aloja un robot vivo al lado derecho del campo de texto (112px escritorio / 80px móvil) que refleja estados de espera, éxito y error.
  - path: src/modules/core/pet/robot-head-view.tsx
    symbol: RobotHeadView
    claim: Condiciona el seguimiento a interactividad, estado idle y puntero fino; pausa el motor por hibernación, movimiento reducido, visibilidad y viewport.
  - path: src/modules/core/pet/pet-provider.tsx
    symbol: PetProvider
    claim: Aplica el ajuste de hibernación y prioriza los avisos críticos sobre las reacciones de ayuda y operaciones.
  - path: src/modules/core/pet/robot-head-view.tsx
    symbol: RobotHeadView
    claim: Define tracking activo en reposo contextual y pausas por hibernación, reducción de movimiento, pestaña oculta, viewport o animación apagada.
---

# Estados visuales, hibernación e interacción con la mascota

## Propósito
Explicar el comportamiento interactivo de la mascota robot Pixy en el panel, el significado de sus expresiones faciales y cómo opera su mecanismo de hibernación para conservar batería y recursos del equipo.

## Requisitos y permisos
- Que la mascota se encuentre activada para la organización actual por el superadministrador.
- Disponible para todos los usuarios de la organización.
- Si la mascota está apagada o se detecta un fallo de renderizado, se muestra un botón de ayuda con icono de mensaje. El robot no requiere aceleración gráfica específica para acceder a la ayuda.

## Ubicación en pantalla
- **En el panel principal:** En la esquina inferior derecha de la pantalla (posición fija, por encima del contenido y respetando áreas seguras en dispositivos móviles).
- **Dentro del diálogo de ayuda:** En la esquina inferior derecha del formulario de redacción de preguntas.

## Estados y expresiones visuales
La pantalla LED del robot reacciona dinámicamente a los eventos del sistema:
- **Disponible (`idle`):** Expresión neutra. En modo contextual se detiene la animación continua; puede seguir el cursor si el seguimiento está habilitado y se cumplen sus condiciones.
- **Pensando (`thinking`):** Expresión de procesamiento activo mientras el asistente de inteligencia artificial analiza la consulta.
- **Trabajando (`working`):** Expresión concentrada que acompaña operaciones de guardado de datos sensibles (por ejemplo, al guardar el ADN de marca en el Centro de Marca).
- **Éxito (`happy`):** Expresión alegre que confirma que la respuesta se generó con éxito o que una operación finalizó correctamente (se mantiene aproximadamente 2,5 segundos antes de volver al reposo).
- **Error (`error`):** Expresión de alerta ante fallos de conexión o imposibilidad de procesar una tarea (se conserva unos 8 segundos).
- **Descansando (`sleeping`):** Ojos cerrados o tenues que indican que el robot entró en modo de hibernación.

## Ciclo de hibernación y despertar
Para garantizar un rendimiento óptimo y evitar consumo innecesario de procesador o batería:
1. **Ventana de actividad:** Si la hibernación está habilitada, tras 5 minutos por defecto (o el tiempo configurado por administración) sin interacción directa con el robot, este entra en **hibernación**. Si se desactiva ese ajuste, no se aplica este temporizador.
2. **Pausa del motor gráfico:** Durante la hibernación, el canvas se suspende completamente: el robot deja de seguir el cursor y no ejecuta bucles de renderizado.
3. **Cómo despertarlo:**
   - Pasar el cursor directamente sobre el robot (`hover`).
   - Enfocar el botón de ayuda utilizando la tecla `Tab` del teclado.
   - Tocar la mascota en pantallas táctiles (`touchstart`).
4. **Regla de aislamiento del cursor:** Mover el ratón por otras áreas de la página o navegar por tablas y menús **no renueva** el tiempo activo del robot; solo la interacción directa sobre él reinicia el contador.

## Control y límites del seguimiento del cursor
El robot orienta la cabeza hacia la posición del ratón en tiempo real cuando se cumplen tres condiciones simultáneas (`RobotHeadView`):
1. **Interactividad encendida:** La opción `settings.interactive` está habilitada en la configuración global.
2. **Estado disponible:** El robot se encuentra en reposo normal (`state === 'idle'`).
3. **Puntero fino:** El usuario navega con ratón o trackpad de precisión (`finePointer`), excluyendo pantallas táctiles donde el cursor continuo no existe.

El modo de reposo contextual **no interrumpe el seguimiento del ratón**: si la interactividad está activa, el robot continúa orientando su mirada hacia el cursor aunque el cuerpo no esté ejecutando bucles de animación continua.

Por el contrario, la animación y el seguimiento se pausan o suspenden en cualquiera de las siguientes situaciones:
- **Hibernación:** El temporizador de inactividad directa expira y el robot entra en descanso.
- **Reducción de movimiento:** El sistema operativo o navegador tiene activada la preferencia `prefers-reduced-motion`.
- **Pestaña no visible:** El usuario cambia de pestaña o minimiza la ventana (`document.hidden`).
- **Fuera del viewport:** El elemento queda fuera del área visible al hacer scroll por la página.
- **Animación apagada:** La configuración global tiene seleccionado el modo `off`.
- **Estado ocupado:** La mascota está procesando una consulta de IA (`thinking`, `searching`) o confirmando un guardado (`working`).

## Pasos para abrir la ayuda con la mascota
1. Pasa el cursor sobre la mascota en la esquina inferior derecha para despertarla.
2. Haz clic sobre ella.
3. Se abrirá la ventana modal del **Centro de Ayuda**. Al abrirse, la mascota flotante exterior se oculta automáticamente para mantener la pantalla despejada.
4. En el campo inferior del chat verás a la mascota integrada, con un tamaño de 112 px en escritorio (u 80 px en móvil), ubicada a la derecha de la barra de texto sin interferir con la escritura ni el botón de envío.

## Problemas habituales y causas comprobadas
- **En lugar del robot aparece un botón circular con icono de mensaje:**
  *Causa comprobada:* La mascota fue desactivada en la plataforma, la organización no forma parte del piloto, o el navegador falló al inicializar el contexto 2D del Canvas (`reportRendererFailure`). El botón alternativo permite seguir usando la ayuda con total normalidad.
- **La mascota no gira ni mira hacia el ratón:**
  *Causa comprobada:* El seguimiento requiere interactividad activa (`settings.interactive: true`), estado disponible (`idle`) y un ratón o trackpad de precisión (`finePointer`). Se pausa si el robot está en hibernación, si el sistema operativo tiene activada la reducción de movimiento (`prefers-reduced-motion`), si la pestaña está en segundo plano, si la mascota quedó fuera de la vista al desplazarse o si la animación está apagada. El reposo contextual por sí mismo no inhabilita el seguimiento cuando estas condiciones se cumplen.
- **La mascota no reacciona al guardar en algunos módulos:**
  *Causa comprobada:* Las reacciones operativas están conectadas a formularios clave (como el Centro de Marca mediante `usePetOperation`) y avisos críticos del sistema; no todos los formularios secundarios del sistema tienen instrumentación visual.

## Limitaciones conocidas
- La mascota exterior no utiliza textos flotantes al pasar el cursor (tooltips) para evitar bloqueos visuales sobre elementos subyacentes.
- Si el diálogo de ayuda está abierto y se produce un error, el robot mostrará el rostro de error pero no emitirá sonidos.

## Temas relacionados
- [Configurar y administrar la mascota robot Pixy](pet.manage-pet.md)
- [Consultar al asistente de ayuda e historial](help.chat-and-history.md)

## Notas de verificación
- Lógica de activación y fallback: `src/components/layout/fab-controller.tsx`
- Disparador accesible: `src/modules/core/pet/pet-help-trigger.tsx`
- Motor de renderizado y pausas de seguimiento: `src/modules/core/pet/robot-head-view.tsx`
- Motor de hibernación: `src/modules/core/pet/use-pet-hibernation.ts`
- Hook de ciclo de operaciones: `src/modules/core/pet/use-pet-operation.ts`
