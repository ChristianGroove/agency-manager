"use client"

import React, { useState, useEffect } from "react"
import { GripVertical, Trash2, Edit2, Check, X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RestoMenuCategory } from "@/types"
import { createMenuCategory, updateMenuCategory, deleteMenuCategory, reorderMenuCategories } from "../actions"
import { toast } from "sonner"

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableCategoryItem({ 
    category, 
    editingId, 
    editName, 
    setEditName, 
    setEditingId, 
    handleUpdate, 
    handleDelete, 
    isActive, 
    onSelect 
}: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: category.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className={`group flex items-center gap-3 p-3 transition-all duration-300 cursor-pointer ${isActive ? 'rounded-xl border bg-primary/5 border-primary/30 dark:bg-primary/10 dark:border-primary/50' : 'glass-panel rounded-xl border border-transparent shadow-sm hover:bg-white/20 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-zinc-600'}`}
            onClick={() => {
                if (editingId !== category.id) {
                    onSelect(category.id);
                }
            }}
        >
            <div 
                className="text-gray-300 cursor-grab active:cursor-grabbing hover:text-gray-500" 
                {...attributes} 
                {...listeners}
                onClick={(e) => e.stopPropagation()}
            >
                <GripVertical className="w-4 h-4" />
            </div>
            
            {editingId === category.id ? (
                <div className="flex-1 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <Input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="flex-1 h-8 text-sm font-bold px-2 py-1"
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && handleUpdate(category.id)}
                    />
                    <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} className="h-7 w-7 text-gray-400 flex-shrink-0">
                        <X className="w-4 h-4" />
                    </Button>
                    <Button size="icon" onClick={() => handleUpdate(category.id)} disabled={!editName.trim()} className="h-7 w-7 bg-primary text-white rounded-lg flex-shrink-0">
                        <Check className="w-4 h-4" />
                    </Button>
                </div>
            ) : (
                <>
                    <span className={`flex-1 font-bold text-sm truncate ${isActive ? 'text-primary dark:text-primary' : 'text-gray-800 dark:text-gray-200'}`}>
                        {category.icon && <span className="mr-2">{category.icon}</span>}
                        {category.name}
                    </span>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 text-gray-400 hover:text-blue-500"
                            onClick={() => {
                                setEditingId(category.id)
                                setEditName(category.name)
                            }}
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 text-gray-400 hover:text-red-500"
                            onClick={() => handleDelete(category.id)}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </>
            )}
        </div>
    )
}

export function MenuCategoryManager({ 
    categories,
    activeCategory,
    onToggleCategory
}: { 
    categories: RestoMenuCategory[],
    activeCategory: string | null,
    onToggleCategory: (id: string) => void
}) {
    const [newCategoryName, setNewCategoryName] = useState("")
    const [loading, setLoading] = useState(false)

    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState("")

    const [localCategories, setLocalCategories] = useState(categories)

    useEffect(() => {
        setLocalCategories(categories)
    }, [categories])

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = localCategories.findIndex(item => item.id === active.id);
            const newIndex = localCategories.findIndex(item => item.id === over.id);
            const newArray = arrayMove(localCategories, oldIndex, newIndex);
            
            setLocalCategories(newArray);
            
            // Call server action in background to update sorting
            reorderMenuCategories(newArray.map(c => c.id)).catch(err => toast.error("Error al reordenar"));
        }
    }

    const toggleCategory = (id: string) => {
        onToggleCategory(id)
    }

    const handleCreate = async () => {
        if (!newCategoryName.trim()) return
        setLoading(true)
        try {
            await createMenuCategory(newCategoryName)
            setNewCategoryName("")
            toast.success("Categoría creada")
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) return
        setLoading(true)
        try {
            await updateMenuCategory(id, { name: editName })
            setEditingId(null)
            toast.success("Categoría actualizada")
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro que deseas eliminar esta categoría? Solo se puede eliminar si no tiene platos asignados.")) return
        
        try {
            await deleteMenuCategory(id)
            if (activeCategory === id) {
                onToggleCategory(id)
            }
            toast.success("Categoría eliminada")
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    return (
        <div className="glass-panel bg-white/10 dark:bg-white/5 backdrop-blur-md shadow-lg shadow-black/10 dark:shadow-black/20 rounded-2xl p-4 flex flex-col h-full min-h-[400px]">
            {/* Header & Quick Add Bar */}
            <div className="flex flex-col gap-3 mb-4">
                <div className="flex items-baseline gap-2">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">Categorías</h3>
                    <p className="text-[11px] text-gray-500">Organiza tu menú</p>
                </div>

                <div className="flex items-center gap-2 w-full">
                    <Input
                        type="text"
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        placeholder="Nueva..."
                        className="h-8 text-xs flex-1 bg-gray-50 dark:bg-zinc-800 border-transparent focus:border-primary focus:ring-primary/20"
                        onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    />
                    <Button 
                        size="icon"
                        onClick={handleCreate} 
                        disabled={loading || !newCategoryName.trim()} 
                        className="h-8 w-8 bg-primary hover:bg-primary/90 text-white rounded-lg shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 -m-4 space-y-1.5 no-scrollbar">
                {localCategories.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-100 dark:border-zinc-800 rounded-xl">
                        No hay categorías aún.
                    </div>
                ) : (
                    <DndContext 
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext 
                            items={localCategories.map(c => c.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {localCategories.map(category => (
                                <SortableCategoryItem 
                                    key={category.id}
                                    category={category}
                                    editingId={editingId}
                                    editName={editName}
                                    setEditName={setEditName}
                                    setEditingId={setEditingId}
                                    handleUpdate={handleUpdate}
                                    handleDelete={handleDelete}
                                    isActive={activeCategory === category.id}
                                    onSelect={toggleCategory}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                )}
            </div>
        </div>
    )
}
