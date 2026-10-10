/** Display only: untouched UTC values retain their original precision in the filter. */
export function displayLocalDateTime(iso?: string) {
    if (!iso || !Number.isFinite(Date.parse(iso))) return ''
    const date = new Date(iso)
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export function adjacentStepOrder(ids: string[], index: number, direction: -1 | 1) {
    const destination = index + direction
    if (index < 0 || index >= ids.length || destination < 0 || destination >= ids.length) return null
    const ordered = [...ids]
        ;[ordered[index], ordered[destination]] = [ordered[destination], ordered[index]]
    return ordered
}
