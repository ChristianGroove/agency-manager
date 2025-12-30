"use client"

import { cn } from "@/lib/utils"
import { ServiceCategory } from "../categories/actions"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

interface CategorySelectorProps {
    categories: ServiceCategory[]
    activeCategory: string
    onSelect: (id: string) => void
    className?: string
}

export function CategorySelector({ categories, activeCategory, onSelect, className }: CategorySelectorProps) {
    return (
        <ScrollArea className={cn("w-full whitespace-nowrap", className)}>
            <div className="flex w-max space-x-2 p-1">
                <button
                    onClick={() => onSelect('all')}
                    className={cn(
                        "inline-flex items-center justify-center rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        activeCategory === 'all'
                            ? "bg-gray-900 text-white shadow-md hover:bg-black"
                            : "bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-900 border border-gray-200 shadow-sm"
                    )}
                >
                    Todo
                </button>
                {categories.map((category) => (
                    <button
                        key={category.id}
                        onClick={() => onSelect(category.name)}
                        className={cn(
                            "inline-flex items-center justify-center rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                            activeCategory === category.name
                                ? "bg-white text-gray-900 shadow-md ring-2 ring-gray-900" // Styled active state
                                : "bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-cool-gray-200"
                        )}
                        style={activeCategory === category.name ? { borderColor: 'transparent' } : { borderLeftColor: getColorHex(category.color) }}
                    >
                        {/* Optional Color Indicator Dot */}
                        {activeCategory !== category.name && (
                            <span className={cn("mr-2 h-2 w-2 rounded-full", getBgColorClass(category.color))} />
                        )}
                        {category.name}
                    </button>
                ))}
            </div>
            <ScrollBar orientation="horizontal" className="invisible" />
        </ScrollArea>
    )
}

function getBgColorClass(color: string) {
    switch (color) {
        case 'blue': return 'bg-blue-500'
        case 'purple': return 'bg-purple-500'
        case 'pink': return 'bg-pink-500'
        case 'indigo': return 'bg-indigo-500'
        case 'green': return 'bg-green-500'
        case 'orange': return 'bg-orange-500'
        case 'cyan': return 'bg-cyan-500'
        case 'amber': return 'bg-amber-500'
        case 'gray': return 'bg-gray-500'
        case 'red': return 'bg-red-500'
        default: return 'bg-gray-500'
    }
}

// Helper just in case we want inline styles, though logic above uses Tailwind classes currently
function getColorHex(color: string) {
    // Just a visual hint on border if needed
    return 'transparent'
}
