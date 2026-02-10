import { TemplateComponent } from "./template-actions"

export function extractMetadata(components: TemplateComponent[]): { color?: string, icon?: string } {
    const meta = components.find(c => c.type === 'UI_METADATA')
    if (meta && meta.text) {
        try {
            return JSON.parse(meta.text)
        } catch (e) {
            return {}
        }
    }
    return {}
}

import { MessageSquare, Star, Heart, ThumbsUp, Zap, AlertCircle, CheckCircle, Clock, Phone, Mail, Calendar, CreditCard, Package, User, HelpCircle, AlertTriangle } from "lucide-react"

export const COLORS = [
    { id: 'gray', class: 'border-l-4 border-l-gray-400 bg-gray-50', label: 'Gris', bg: 'bg-gray-100', text: 'text-gray-700' },
    { id: 'blue', class: 'border-l-4 border-l-blue-400 bg-blue-50', label: 'Azul', bg: 'bg-blue-100', text: 'text-blue-700' },
    { id: 'green', class: 'border-l-4 border-l-green-400 bg-green-50', label: 'Verde', bg: 'bg-green-100', text: 'text-green-700' },
    { id: 'purple', class: 'border-l-4 border-l-purple-400 bg-purple-50', label: 'Morado', bg: 'bg-purple-100', text: 'text-purple-700' },
    { id: 'amber', class: 'border-l-4 border-l-amber-400 bg-amber-50', label: 'Ambar', bg: 'bg-amber-100', text: 'text-amber-700' },
    { id: 'pink', class: 'border-l-4 border-l-pink-400 bg-pink-50', label: 'Rosa', bg: 'bg-pink-100', text: 'text-pink-700' },
    { id: 'red', class: 'border-l-4 border-l-red-400 bg-red-50', label: 'Rojo', bg: 'bg-red-100', text: 'text-red-700' },
    { id: 'indigo', class: 'border-l-4 border-l-indigo-400 bg-indigo-50', label: 'Indigo', bg: 'bg-indigo-100', text: 'text-indigo-700' },
    { id: 'cyan', class: 'border-l-4 border-l-cyan-400 bg-cyan-50', label: 'Cyan', bg: 'bg-cyan-100', text: 'text-cyan-700' },
]

export const ICONS = [
    { id: 'MessageSquare', icon: MessageSquare, label: 'Mensaje' },
    { id: 'Star', icon: Star, label: 'Estrella' },
    { id: 'Heart', icon: Heart, label: 'Corazón' },
    { id: 'ThumbsUp', icon: ThumbsUp, label: 'Bien' },
    { id: 'Phone', icon: Phone, label: 'Llamada' },
    { id: 'Mail', icon: Mail, label: 'Correo' },
    { id: 'Calendar', icon: Calendar, label: 'Calendario' },
    { id: 'CreditCard', icon: CreditCard, label: 'Pago' },
    { id: 'Package', icon: Package, label: 'Envío' },
    { id: 'User', icon: User, label: 'Usuario' },
    { id: 'Zap', icon: Zap, label: 'Rayo' },
    { id: 'AlertCircle', icon: AlertCircle, label: 'Alerta' },
    { id: 'CheckCircle', icon: CheckCircle, label: 'Check' },
    { id: 'HelpCircle', icon: HelpCircle, label: 'Ayuda' },
    { id: 'Clock', icon: Clock, label: 'Reloj' },
]
