import { deliveryLabels, executionLabels, type HistoryRecipient, type HistoryStep } from './marketing-history'

/** Quoting alone does not prevent spreadsheet formulas. Never emit executable cells. */
export function csvCell(value: unknown) {
    let text = value == null ? '' : String(value).replace(/\0/g, '')
    if (/^\s*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text
    return '"' + text.replace(/"/g, '""') + '"'
}
export function csvLine(values: unknown[]) { return values.map(csvCell).join(',') + '\r\n' }
export const recipientHeaders = ['Inscripción', 'Nombre', 'Teléfono', 'Procesamiento', 'Inicio', 'Último avance', 'Finalización', 'Próximo paso',
    'Mensajes registrados', 'En cola', 'Enviándose', 'Aceptados sin recibo de entrega', 'Entregados sin lectura', 'Leídos', 'Fallidos', 'Sin resultado confirmado', 'Observación', 'Consultado en']
export function recipientCsv(row: HistoryRecipient, queriedAt: string) {
    return csvLine([row.id, row.name, row.phone ? "'" + row.phone : '', executionLabels[row.status] || row.status, row.started_at,
        row.last_run_at, row.completed_at, row.next_run_at, row.counts.total, row.counts.queued, row.counts.sending, row.counts.accepted,
        row.counts.delivered, row.counts.read, row.counts.failed, row.counts.unknown, row.issue, queriedAt])
}
export const stepHeaders = ['Inscripción', 'Nombre', 'Teléfono', 'Procesamiento', 'Paso', 'Orden', 'Nombre del paso', 'Tipo', 'Plantilla',
    'Avance de secuencia', 'Estado del mensaje', 'Registro en cola', 'Última actualización de operación', 'Último evento de recibo', 'Código Meta', 'Consultado en']
export function stepCsv(row: HistoryStep, queriedAt: string) {
    const progress = row.progress === 'advanced' ? 'Avance registrado' : row.progress === 'current' ? 'Paso actual' : 'No iniciado'
    return csvLine([row.enrollment_id, row.name, row.phone ? "'" + row.phone : '', executionLabels[row.enrollment_status] || row.enrollment_status,
        row.step_id, row.order_index + 1, row.step_name, row.type, row.template_name, progress, deliveryLabels[row.delivery] || row.delivery,
        row.queued_at, row.updated_at, row.receipt_at, row.error_code, queriedAt])
}
