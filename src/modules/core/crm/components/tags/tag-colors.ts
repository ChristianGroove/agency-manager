export const TAG_COLORS = [
    { name: 'Gris', value: '#6b7280', class: 'bg-gray-500' },
    { name: 'Rojo', value: '#ef4444', class: 'bg-red-500' },
    { name: 'Naranja', value: '#f97316', class: 'bg-orange-500' },
    { name: 'Ámbar', value: '#f59e0b', class: 'bg-amber-500' },
    { name: 'Verde', value: '#22c55e', class: 'bg-green-500' },
    { name: 'Esmeralda', value: '#10b981', class: 'bg-emerald-500' },
    { name: 'Turquesa', value: '#14b8a6', class: 'bg-teal-500' },
    { name: 'Cian', value: '#06b6d4', class: 'bg-cyan-500' },
    { name: 'Azul', value: '#3b82f6', class: 'bg-blue-500' },
    { name: 'Indigo', value: '#6366f1', class: 'bg-indigo-500' },
    { name: 'Violeta', value: '#8b5cf6', class: 'bg-violet-500' },
    { name: 'Rosa', value: '#ec4899', class: 'bg-pink-500' },
]

export const getTagColorClass = (hexIdentifier: string) => {
    return TAG_COLORS.find(c => c.value === hexIdentifier)?.class || 'bg-gray-500';
}
