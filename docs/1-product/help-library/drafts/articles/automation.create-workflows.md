---
schema_version: 1
id: automation.create-workflows
title: Crear y gestionar flujos de trabajo automáticos
module: automation
status: draft
audience: tenant-admin
source_revision: 047fa7ee0cadc0f49d9ce08220f633885b0801a7
verified_on: 2026-10-12
verification: source-only
routes:
  - /automations
  - /crm/automations
keywords:
  - automatizaciones
  - automatizacion
  - flujos
  - triggers
  - disparadores
  - nodos
  - workflows
  - chatbots
  - bienvenida
  - prospectos
  - prospecto
  - leads
  - primer contacto
requirements:
  - Módulo module_automation y capacidad automation.engine activos
  - Permiso automation.workflows.view para consultar y automation.workflows.edit para editar
evidence:
  - path: src/app/(dashboard)/automations/page.tsx
    symbol: AutomationsPage
    claim: Muestra la lista de automatizaciones activas, plantillas y acceso al diseñador visual de flujos.
  - path: src/modules/features/automation/components/automations-view.tsx
    symbol: AutomationsView
    claim: Panel visual de flujos activos, métricas de ejecución y acceso a creación.
  - path: src/modules/features/automation/actions.ts
    symbol: saveWorkflow
    claim: Guarda la definición del flujo de trabajo con disparadores y canales en la base de datos.
  - path: src/modules/features/automation/components/properties/TriggerProperties.tsx
    symbol: TriggerProperties
    claim: Permite seleccionar disparadores como Solo Primer Contacto (Lead Nuevo) y vincular canales activos.
---

# Crear y gestionar flujos de trabajo automáticos

## Propósito
Permitir a los administradores programar respuestas inmediatas, dar la bienvenida a prospectos nuevos, asignar contactos y coordinar tareas operativas sin intervención manual mediante un diseñador visual de flujos basado en disparadores y acciones.

## Requisitos y permisos
- Que la empresa tenga habilitado el módulo de automatizaciones (`module_automation`) y la capacidad técnica `automation.engine`.
- Permisos requeridos:
  - *Consultar flujos existentes:* Permiso `automation.workflows.view`.
  - *Crear, editar o desactivar flujos:* Permiso `automation.workflows.edit`.
- Para utilizar acciones que envíen mensajes de WhatsApp o correos, los canales respectivos deben estar previamente conectados.

## Ubicación en pantalla
- **Ruta web:** `/automations` o `/crm/automations`
- **Menú lateral:** Sección **CRM** → opción **Automatizaciones** (icono de diagrama de flujo).

## Componentes de un flujo automático
Cada automatización se compone de:
1. **Disparador (Trigger):** El evento que enciende el flujo. Ejemplos comprobados:
   - *Solo Primer Contacto (Lead Nuevo / first_contact):* Se dispara automáticamente cuando un nuevo prospecto o lead escribe por primera vez a través de un canal activo, permitiendo remitir un mensaje de bienvenida inmediato.
   - *Cualquier mensaje entrante (webhook):* Se activa con cada intervención del cliente en el canal.
   - *Palabra clave específica (keyword):* Se dispara cuando el mensaje del usuario incluye un término clave determinado.
   - *Cambio de etapa en Pipeline:* Se activa cuando una oportunidad pasa a una columna específica (ej: *Propuesta Enviada*).
2. **Nodos de acción (Actions):** Pasos que el sistema ejecuta automáticamente:
   - *Enviar mensaje por WhatsApp:* Envía un texto o plantilla predefinida al teléfono del contacto de bienvenida o informativo.
   - *Enviar correo electrónico:* Notificación mediante el motor SMTP de la plataforma.
   - *Asignar a agente:* Distribuye el chat o contacto a un miembro del equipo.
   - *Crear tarea:* Registra un entregable en el módulo de TaskFlow.
   - *Bifurcación condicional (If/Else):* Evalúa condiciones (por ejemplo, si el contacto tiene la etiqueta "VIP").
   - *Retardo temporal (Delay):* Pausa la ejecución durante minutos u horas antes del siguiente paso.
   - *Nodo de Agente IA:* Consulta al motor de inteligencia artificial para clasificar la intención del usuario.

## Pasos para crear un flujo de bienvenida a prospectos nuevos
1. Accede a **Automatizaciones** en el menú.
2. Haz clic en el botón superior **Nuevo Flujo** (o selecciona una plantilla recomendada).
3. Ingresa un nombre descriptivo (ejemplo: *"Bienvenida y calificación de prospectos nuevos"*).
4. En el lienzo visual (*Workflow Builder*), haz clic en el nodo inicial para seleccionar el **Disparador** (*Trigger*).
5. Selecciona el disparador **Solo Primer Contacto (Lead Nuevo)** y marca los canales de WhatsApp o mensajería activos que deban capturar a los nuevos prospectos.
6. Haz clic en el conector inferior del disparador y arrastra para añadir el primer nodo de **Acción** (*Enviar mensaje por WhatsApp*).
7. Configura el texto del mensaje de bienvenida en el panel lateral de propiedades del nodo (puedes insertar variables dinámicas como `{{contact.first_name}}`).
8. Conecta acciones subsecuentes según la lógica de tu negocio (por ejemplo, asignar el contacto a un agente o crear una tarea de seguimiento en CRM).
9. Enciende el interruptor de **Estado Activo** en la esquina superior derecha y presiona **Guardar Flujo**.

## Resultado esperado
A partir del momento de activación, cada vez que un nuevo prospecto escriba por primera vez a los canales configurados, el sistema procesará los nodos en segundo plano despachando el mensaje de bienvenida y las acciones asociadas de forma desatendida.

## Problemas habituales y causas comprobadas
- **El flujo no se dispara al recibir un mensaje:**
  *Causa comprobada:* El flujo se encuentra en estado *Inactivo*, o el canal de WhatsApp por el cual llegó el mensaje no fue seleccionado en la configuración del disparador.
- **Las acciones de IA fallan en la ejecución:**
  *Causa comprobada:* La cuota de tokens de IA de la organización se encuentra agotada o el estado de la IA en la organización está suspendido (`ai_status !== 'active'`).
- **Los mensajes no reemplazan las variables del cliente:**
  *Causa comprobada:* El contacto no tiene diligenciado el campo solicitado (por ejemplo, carece de nombre registrado), lo que deja la variable vacía o con texto de fallback.

## Limitaciones conocidas
- Para prevenir bucles infinitos de mensajería (dos bots respondiéndose mutuamente), el motor de automatización bloquea la reactivación inmediata de un mismo flujo sobre una conversación dentro de una ventana de pocos segundos.

## Temas relacionados
- [Atender y gestionar conversaciones en Inbox](inbox.manage-conversations.md)
- [Gestión de embudo de ventas y pipeline](crm.manage-pipeline.md)

## Notas de verificación
- Página principal: `src/app/(dashboard)/automations/page.tsx`
- Propiedades de disparadores: `src/modules/features/automation/components/properties/TriggerProperties.tsx`
- Constructor de flujos: `src/modules/features/automation/components/workflow-builder.tsx`
- Catálogo de nodos: `src/modules/features/automation/nodes/`
