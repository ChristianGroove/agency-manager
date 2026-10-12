import { expect, it } from 'vitest'
import { PERMISSIONS } from '@/modules/core/iam/actions/permissions'
import { publicHelpText, publicHelpHistory } from './public-language'
import { getTaskDefinition } from '@/modules/infrastructure/ai-engine/tasks/registry'

it('translates the reported permission without granting it or losing the condition', () => {
    const result = publicHelpText('Puedes eliminar tareas (si cuentas con el permiso `can_bulk_delete_tasks`).')
    expect(result).toBe('Puedes eliminar tareas (si cuentas con la autorización para eliminar tareas en grupo).')
    expect(publicHelpText('No tienes el permiso **operations.tasks.manage**.')).toBe('No tienes la autorización para gestionar Tareas y Proyectos.')
    expect(publicHelpText('Depende del permiso operations.tasks.view.')).toBe('Depende de la autorización para ver Proyectos y Tareas.')
})

it('covers every canonical permission and unknown identifiers in established access namespaces', () => {
    for (const key of Object.values(PERMISSIONS).flatMap(group => Object.values(group))) {
        expect(publicHelpText(`Requiere el permiso \`${key}\`.`)).not.toContain(key)
    }
    expect(publicHelpText('No tienes can_unlisted_action ni org.unlisted.action.')).toBe('No tienes autorización para esta acción ni autorización para esta acción.')
})

it('keeps controls, Markdown, paths and ordinary text unchanged and is idempotent', () => {
    const text = 'Usa **Nueva Tarea**, revisa `Due Date` y abre /operations/tasks. No se puede completar sin revisión.'
    expect(publicHelpText(text)).toBe(text)
    const safe = publicHelpText('El permiso `operations.tasks.view` requiere module_tasks y tasks.management.')
    expect(safe).not.toMatch(/operations\.tasks\.view|module_tasks|tasks\.management/)
    expect(publicHelpText(safe)).toBe(safe)
})

it('transforms assistant history without rewriting user questions or mutating stored objects', () => {
    const messages = [{ role: 'user' as const, content: '¿Qué es can_bulk_delete_tasks?' }, { role: 'assistant' as const, content: 'Requiere can_bulk_delete_tasks.' }]
    expect(publicHelpHistory(messages)[0]).toEqual(messages[0])
    expect(publicHelpHistory(messages)[1].content).not.toContain('can_bulk_delete_tasks')
    expect(messages[1].content).toContain('can_bulk_delete_tasks')
})

it('removes access keys from generation context and old assistant turns while leaving source metadata intact', () => {
    const task = getTaskDefinition('help-assistant-v2')
    const article = { id: 'tasks.guide', title: 'Gestión de Tasks', content: 'Requiere el permiso can_bulk_delete_tasks y module_tasks.', required_permissions: ['operations.tasks.view'] }
    const input = { question: 'Cómo usar Tasks', session: { modules: ['module_tasks'], capabilities: ['bulk_delete', 'finance_costs'] }, articles: [article], history: [{ role: 'assistant', content: 'Permiso operations.tasks.view.' }] }
    expect(task.systemPrompt(input)).not.toMatch(/can_bulk_delete_tasks|module_tasks|operations\.tasks\.view|bulk_delete|finance_costs/)
    expect(task.conversationMessages?.(input)[0].content).not.toContain('operations.tasks.view')
    expect(article.required_permissions).toEqual(['operations.tasks.view'])
    expect(article.content).toContain('can_bulk_delete_tasks')
})
