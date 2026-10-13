---
schema_version: 1
id: tasks-portal.vcs-git-integration
title: Inspeccionar código, ramas Git y pull requests en tareas técnicas
module: tasks
status: draft
surface: portal.tasks
audience: portal-collaborator
source_revision: 5aaeec98767f13ec9b495eed33486fcdba65ab86
verified_on: 2026-10-12
verification: source-only
routes:
  - /portal/tasks/[token]
keywords:
  - vcs
  - git
  - codigo
  - ramas
  - rama git
  - rama de git
  - pull requests
  - commits
  - checkout
  - feature
  - vcs_code
  - repositorio
  - github
  - gitlab
requirements:
  - Capacidad técnica vcs_code activa en el perfil del colaborador (por defecto en desarrolladores, QA leads y PMs)
  - Integración de control de versiones habilitada en el proyecto o workspace
evidence:
  - path: src/modules/features/tasks/components/detail/task-vcs-container.tsx
    symbol: TaskVcsContainer
    claim: Renderiza la sección condicional de ramas Git, commits y Pull Requests si la capacidad vcs_code está activa.
  - path: src/modules/features/tasks/components/portal/task-portal-detail-modal.tsx
    symbol: handleCopyGitBranch
    claim: Copia al portapapeles el comando git checkout -b con la nomenclatura estándar sugerida para la tarea.
  - path: src/modules/features/tasks/types.ts
    symbol: resolveCollaboratorCapabilities
    claim: Asigna vcs_code por defecto a desarrolladores, QA leads y PMs, y evalúa overrides personalizados.
---

# Inspeccionar código, ramas Git y pull requests en tareas técnicas

## Propósito
Instruir a los desarrolladores y perfiles técnicos sobre cómo consultar la nomenclatura estandarizada de ramas de Git, copiar comandos de creación de ramas y revisar el estado de commits o Pull Requests asociados a cada requerimiento dentro del portal de tareas.

## Requisitos y perfiles
- **Capacidad mínima requerida:** Capacidad técnica `vcs_code`.
- **Perfiles con acceso por defecto:** Desarrolladores (`developer`), Líderes QA (`qa_lead`) y Project Managers (`pm` / `pm_lead`).
- **Perfiles restringidos:** Diseñadores, especialistas comerciales u operativos y personal de soporte no visualizan esta sección por defecto, salvo que el administrador les asigne la capacidad `vcs_code: true` de forma explícita en su configuración (`staff.settings.capabilities`).
- **Requisitos por registro:**
  - El proyecto o workspace al que pertenece la tarea debe tener configurada y activa la integración de repositorios (`project.settings.vcs.enabled !== false`).
  - El colaborador debe tener acceso al workspace y proyecto del ticket para abrir su detalle.
  - La visualización de la rama sugerida no otorga permisos de escritura en el repositorio remoto; las credenciales y llaves SSH se gestionan localmente en la máquina del desarrollador.

## Ubicación en pantalla
- **Acceso rápido en cabecera:** Botón con icono de rama Git y etiqueta de código monoespaciada en la parte superior del modal de detalle de la tarea (`TaskPortalDetailModal`).
- **Sección Modular de Código / VCS:** Contenedor `TaskVcsContainer` ubicado debajo de los detalles y descripción técnica del requerimiento.

## Procedimiento paso a paso

### 1. Consultar la rama de Git asignada a la tarea
1. Haz clic sobre la tarjeta o fila de la tarea técnica en la que vas a programar para abrir el modal de detalle.
2. Si el proyecto cuenta con repositorio vinculado y tienes activa la capacidad `vcs_code`, observarás en la cabecera el botón de copia rápida de rama.
3. El sistema genera automáticamente el nombre estandarizado de la rama combinando el código de ticket y el título saneado (por ejemplo: `feature/TK-101-autenticacion-oauth`).

### 2. Copiar el comando para tu terminal local
1. Haz clic sobre el botón de rama en la cabecera o dentro de la sección de VCS.
2. La plataforma copiará al portapapeles el comando completo:
   ```bash
   git checkout -b feature/TK-101-nombre-del-requerimiento
   ```
3. Pega el comando en tu terminal de desarrollo local para crear la rama de trabajo inmediatamente vinculada al ticket.

### 3. Seguimiento de commits y Pull Requests vinculados
1. Dentro de la sección `TaskVcsContainer`, si tu equipo utiliza la integración con GitHub o GitLab, podrás visualizar:
   - Los commits recientes que contengan el identificador del ticket en su mensaje (por ejemplo: `git commit -m "TK-101: implementa endpoint"`).
   - El estado del Pull Request asociado (Abierto, En Revisión, Aprobado o Fusionado).
   - Enlace directo al repositorio remoto para auditoría de código entre pares.

## Resultado esperado
Unificación entre la gestión de tareas y el flujo de trabajo en Git, asegurando que todos los desarrolladores utilicen nombres de rama consistentes y trazables sin errores tipográficos.

## Errores y límites conocidos
- **No aparece el botón ni la sección de Git:**
  - *Causa 1:* Tu rol operativo no tiene asignada la capacidad `vcs_code` (por ejemplo, eres diseñador o especialista). Si requieres acceso, solicita al líder de proyecto habilitar el switch en tu ficha de colaborador.
  - *Causa 2:* El proyecto actual no tiene habilitada la integración de VCS en sus ajustes (`project.settings.vcs.enabled === false`).
- **El portal no realiza commits automáticos:** El portal de tareas y el asistente de ayuda son exclusivamente informativos y de lectura; no ejecutan operaciones de terminal, no clonan repositorios ni hacen `git push` o `git merge` en servidores remotos. Todo cambio de código debe ser realizado por el desarrollador en su entorno local.

## Notas de verificación
- Contenedor condicional de Git: `src/modules/features/tasks/components/detail/task-vcs-container.tsx` (`TaskVcsContainer`)
- Acción de copia en modal: `src/modules/features/tasks/components/portal/task-portal-detail-modal.tsx` (`handleCopyGitBranch`)
- Matriz de capacidades: `src/modules/features/tasks/types.ts` (`resolveCollaboratorCapabilities`)
