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
---

# Estados visuales, hibernación e interacción con la mascota

## Propósito
Explicar el comportamiento interactivo de la mascota robot Pixy en el panel, el significado de sus expresiones faciales y cómo opera su mecanismo de hibernación para conservar batería y recursos del equipo.

## Requisitos y permisos
- Que la mascota se encuentre activada para la organización actual por el superadministrador.
- Disponible para todos los usuarios de la organización.
- Si la mascota está apagada o el navegador no soporta aceleración Canvas 2D, se muestra automáticamente un botón circular clásico con icono de mensaje para acceder a la ayuda.

## Ubicación en pantalla
- **En el panel principal:** En la esquina inferior derecha de la pantalla (posición fija, por encima del contenido y respetando áreas seguras en dispositivos móviles).
- **Dentro del diálogo de ayuda:** En la esquina inferior derecha del formulario de redacción de preguntas.

## Estados y expresiones visuales
La pantalla LED del robot reacciona dinámicamente a los eventos del sistema:
- **Disponible (`idle`):** Ojos atentos y expresión neutra amigable. En modo contextual, permanece estático para no distraer.
- **Pensando (`thinking`):** Expresión de procesamiento activo mientras el asistente de inteligencia artificial analiza la consulta.
- **Trabajando (`working`):** Expresión concentrada que acompaña operaciones de guardado de datos sensibles (por ejemplo, al guardar el ADN de marca en el Centro de Marca).
- **Éxito (`happy`):** Expresión alegre que confirma que la respuesta se generó con éxito o que una operación finalizó correctamente (se mantiene aproximadamente 2,5 segundos antes de volver al reposo).
- **Error (`error`):** Expresión de alerta ante fallos de conexión o imposibilidad de procesar una tarea (se conserva unos 8 segundos).
- **Descansando (`sleeping`):** Ojos cerrados o tenues que indican que el robot entró en modo de hibernación.

## Ciclo de hibernación y despertar
Para garantizar un rendimiento óptimo y evitar consumo innecesario de procesador o batería:
1. **Ventana de actividad:** Tras 5 minutos (o el tiempo configurado por administración) sin interacción directa con el robot, este entra automáticamente en **hibernación**.
2. **Pausa del motor gráfico:** Durante la hibernación, el canvas se suspende completamente: el robot deja de seguir el cursor y no ejecuta bucles de renderizado.
3. **Cómo despertarlo:**
   - Pasar el cursor directamente sobre el robot (`hover`).
   - Enfocar el botón de ayuda utilizando la tecla `Tab` del teclado.
   - Tocar la mascota en pantallas táctiles (`touchstart`).
4. **Regla de aislamiento del cursor:** Mover el ratón por otras áreas de la página o navegar por tablas y menús **no renueva** el tiempo activo del robot; solo la interacción directa sobre él reinicia el contador.

## Pasos para abrir la ayuda con la mascota
1. Pasa el cursor sobre la mascota en la esquina inferior derecha para despertarla.
2. Haz clic sobre ella.
3. Se abrirá la ventana modal del **Centro de Ayuda**. Al abrirse, la mascota flotante exterior se oculta automáticamente para mantener la pantalla despejada.
4. En el campo inferior del chat verás a la mascota integrada, con un tamaño de 112 px en escritorio (u 80 px en móvil), ubicada a la derecha de la barra de texto sin interferir con la escritura ni el botón de envío.

## Problemas habituales y causas comprobadas
- **En lugar del robot aparece un botón circular con icono de mensaje:**
  *Causa comprobada:* La mascota fue desactivada en la plataforma, la organización no forma parte del piloto, o el navegador falló al inicializar el contexto 2D del Canvas (`reportRendererFailure`). El botón alternativo permite seguir usando la ayuda con total normalidad.
- **La mascota no gira ni mira hacia el ratón:**
  *Causa comprobada:* El seguimiento del puntero está restringido a dispositivos con ratón de precisión (puntero fino) y se deshabilita si el sistema operativo tiene activada la reducción de movimiento o si el robot se encuentra en reposo en modo de animación contextual.
- **La mascota no reacciona al guardar en algunos módulos:**
  *Causa comprobada:* Las reacciones operativas están conectadas inicialmente a operaciones clave como el Centro de Marca (`usePetOperation`) y avisos críticos del sistema; no todos los formularios secundarios del sistema tienen instrumentación visual.

## Limitaciones conocidas
- La mascota exterior no utiliza textos flotantes al pasar el cursor (tooltips) para evitar bloqueos visuales sobre elementos subyacentes.
- Si el diálogo de ayuda está abierto y se produce un error, el robot mostrará el rostro de error pero no emitirá sonidos.

## Temas relacionados
- [Configurar y administrar la mascota robot Pixy](pet.manage-pet.md)
- [Consultar al asistente de ayuda e historial](help.chat-and-history.md)

## Notas de verificación
- Lógica de activación y fallback: `src/components/layout/fab-controller.tsx`
- Disparador accesible: `src/modules/core/pet/pet-help-trigger.tsx`
- Motor de hibernación: `src/modules/core/pet/use-pet-hibernation.ts`
- Hook de ciclo de operaciones: `src/modules/core/pet/use-pet-operation.ts`
