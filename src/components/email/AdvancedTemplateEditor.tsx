
"use client"

import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { EmailBlock, DEFAULT_BLOCKS, EmailBlockType } from '@/lib/email/types';
import { renderEmailFromBlocks } from '@/lib/email-renderer';
import { EmailBranding } from '@/lib/email-templates';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { GripVertical, Trash2, Plus, Type, Image as ImageIcon, Layout, Eye, Code, Save, Loader2 } from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';
import { saveEmailTemplate } from '@/modules/core/notifications/actions/save-template';
import { toast } from 'sonner';

// --- SORTABLE BLOCK ITEM ---
function SortableBlock({ block, onSelect, onDelete, isSelected }: { block: EmailBlock, onSelect: () => void, onDelete: () => void, isSelected: boolean }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className={`group relative flex items-center gap-2 p-3 mb-2 bg-white dark:bg-zinc-900 border rounded-lg transition-all ${isSelected ? 'ring-2 ring-primary border-primary' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'}`}>
            <div {...attributes} {...listeners} className="cursor-grab hover:text-primary text-zinc-400">
                <GripVertical className="w-5 h-5" />
            </div>

            <div className="flex-1 cursor-pointer" onClick={onSelect}>
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{block.type}</span>
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 truncate font-medium">
                    {block.type === 'header' ? block.content.text :
                        block.type === 'text' ? block.content.html.substring(0, 30) + '...' :
                            block.type === 'button' ? `Button: ${block.content.text}` : 'Block Content'}
                </p>
            </div>

            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="h-8 w-8 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-4 h-4" />
            </Button>
        </div>
    );
}

// --- MAIN EDITOR COMPONENT ---
interface AdvancedTemplateEditorProps {
    branding: EmailBranding;
    initialBlocks?: EmailBlock[];
    onSave?: (blocks: EmailBlock[]) => void;
}

interface AdvancedTemplateEditorProps {
    branding: EmailBranding;
    initialBlocks?: EmailBlock[];
    onSave?: (blocks: EmailBlock[]) => void;
    templateId?: string; // If present, saves to this ID
}

export function AdvancedTemplateEditor({ branding, initialBlocks = DEFAULT_BLOCKS, onSave, templateId }: AdvancedTemplateEditorProps) {
    const [blocks, setBlocks] = useState<EmailBlock[]>(initialBlocks);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [previewHtml, setPreviewHtml] = useState<string>('');
    const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
    const [isSaving, setIsSaving] = useState(false);
    const [templateName, setTemplateName] = useState("Mi Nueva Plantilla");

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Update HTML when blocks change
    useEffect(() => {
        const html = renderEmailFromBlocks(blocks, branding);
        setPreviewHtml(html);
    }, [blocks, branding]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setBlocks((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over?.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const addBlock = (type: EmailBlockType) => {
        const newBlock: EmailBlock = {
            id: `${type}-${Date.now()}`,
            type,
            content: {},
            style: { paddingBottom: 20 }
        };

        // Default Content
        if (type === 'header') newBlock.content = { text: 'Nuevo Título', level: 2 };
        if (type === 'text') newBlock.content = { html: 'Escribe tu texto aquí...' };
        if (type === 'button') newBlock.content = { text: 'Click Aquí', url: '#', variant: 'primary' };
        if (type === 'image') newBlock.content = { url: 'https://via.placeholder.com/600x300', alt: 'Placeholder' };

        setBlocks([...blocks, newBlock]);
        setSelectedBlockId(newBlock.id);
    };

    const updateBlock = (id: string, updates: Partial<EmailBlock>) => {
        setBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
    };

    const updateContent = (val: any) => {
        if (!selectedBlockId) return;
        const block = blocks.find(b => b.id === selectedBlockId);
        if (block) {
            updateBlock(selectedBlockId, { content: { ...block.content, ...val } });
        }
    };

    const selectedBlock = blocks.find(b => b.id === selectedBlockId);

    return (
        <div className="grid grid-cols-12 gap-6 h-[800px]">

            {/* LEFT: Blocks & editor */}
            <div className="col-span-4 flex flex-col gap-4">
                <Tabs defaultValue="structure" className="w-full">
                    <TabsList className="w-full grid grid-cols-2">
                        <TabsTrigger value="structure">Estructura</TabsTrigger>
                        <TabsTrigger value="properties" disabled={!selectedBlockId}>Propiedades</TabsTrigger>
                    </TabsList>

                    {/* STRUCTURE TAB */}
                    <TabsContent value="structure" className="h-[700px] flex flex-col">
                        <div className="grid grid-cols-4 gap-2 mb-4 p-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg">
                            <Button variant="outline" size="sm" onClick={() => addBlock('header')} className="flex flex-col h-14 gap-1"><Type className="w-4 h-4" /> <span className="text-[10px]">Title</span></Button>
                            <Button variant="outline" size="sm" onClick={() => addBlock('text')} className="flex flex-col h-14 gap-1"><Layout className="w-4 h-4" /> <span className="text-[10px]">Text</span></Button>
                            <Button variant="outline" size="sm" onClick={() => addBlock('button')} className="flex flex-col h-14 gap-1"><Code className="w-4 h-4" /> <span className="text-[10px]">Btn</span></Button>
                            <Button variant="outline" size="sm" onClick={() => addBlock('image')} className="flex flex-col h-14 gap-1"><ImageIcon className="w-4 h-4" /> <span className="text-[10px]">Img</span></Button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2">
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={blocks} strategy={verticalListSortingStrategy}>
                                    {blocks.map(block => (
                                        <SortableBlock
                                            key={block.id}
                                            block={block}
                                            onSelect={() => setSelectedBlockId(block.id)}
                                            onDelete={() => {
                                                setBlocks(blocks.filter(b => b.id !== block.id));
                                                if (selectedBlockId === block.id) setSelectedBlockId(null);
                                            }}
                                            isSelected={selectedBlockId === block.id}
                                        />
                                    ))}
                                </SortableContext>
                            </DndContext>
                        </div>
                    </TabsContent>

                    {/* PROPERTIES TAB */}
                    <TabsContent value="properties" className="space-y-4 p-1">
                        {selectedBlock ? (
                            <Card className="p-4 border-none shadow-none bg-transparent">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center border-b pb-2">
                                        <h3 className="font-bold capitalize">{selectedBlock.type} Properties</h3>
                                        <span className="text-xs text-zinc-400">{selectedBlock.id}</span>
                                    </div>

                                    {/* DYNAMIC FORM BASED ON TYPE */}
                                    {selectedBlock.type === 'header' && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>Texto</Label>
                                                <Input value={selectedBlock.content.text} onChange={e => updateContent({ text: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Nivel (H1-H3)</Label>
                                                <select className="w-full p-2 border rounded" value={selectedBlock.content.level} onChange={e => updateContent({ level: parseInt(e.target.value) })}>
                                                    <option value={1}>H1 (Grande)</option>
                                                    <option value={2}>H2 (Mediano)</option>
                                                    <option value={3}>H3 (Pequeño)</option>
                                                </select>
                                            </div>
                                        </>
                                    )}


                                    {selectedBlock.type === 'text' && (
                                        <div className="space-y-2">
                                            <Label>Contenido HTML</Label>
                                            <Textarea className="h-32" value={selectedBlock.content.html} onChange={e => updateContent({ html: e.target.value })} />
                                        </div>
                                    )}

                                    {selectedBlock.type === 'image' && (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Subir Imagen</Label>
                                                <ImageUpload
                                                    value={selectedBlock.content.url}
                                                    onChange={(url) => updateContent({ url })}
                                                    bucket="agency-assets"
                                                    label="Arrastra tu imagen aquí"
                                                    compact={true}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>O URL Externa</Label>
                                                <Input value={selectedBlock.content.url} onChange={e => updateContent({ url: e.target.value })} placeholder="https://..." />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Texto Alternativo (Alt)</Label>
                                                <Input value={selectedBlock.content.alt} onChange={e => updateContent({ alt: e.target.value })} />
                                            </div>
                                        </div>
                                    )}

                                    {selectedBlock.type === 'button' && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>Texto Botón</Label>
                                                <Input value={selectedBlock.content.text} onChange={e => updateContent({ text: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>URL Acción</Label>
                                                <Input value={selectedBlock.content.url} onChange={e => updateContent({ url: e.target.value })} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Estilo</Label>
                                                <select className="w-full p-2 border rounded" value={selectedBlock.content.variant} onChange={e => updateContent({ variant: e.target.value })}>
                                                    <option value="primary">Primario (Relleno)</option>
                                                    <option value="secondary">Secundario (Gris)</option>
                                                    <option value="outline">Borde (Transparente)</option>
                                                </select>
                                            </div>
                                        </>
                                    )}

                                    {/* COMMON STYLES */}
                                    <div className="pt-4 border-t space-y-2">
                                        <Label className="text-xs uppercase text-zinc-500">Espaciado (Padding)</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input type="number" placeholder="Top" value={selectedBlock.style?.paddingTop || ''} onChange={e => updateBlock(selectedBlock.id, { style: { ...selectedBlock.style, paddingTop: parseInt(e.target.value) } })} />
                                            <Input type="number" placeholder="Bottom" value={selectedBlock.style?.paddingBottom || ''} onChange={e => updateBlock(selectedBlock.id, { style: { ...selectedBlock.style, paddingBottom: parseInt(e.target.value) } })} />
                                        </div>
                                    </div>

                                </div>
                            </Card>
                        ) : (
                            <div className="text-center py-10 text-muted-foreground">Select a block to edit</div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* RIGHT: Preview Canvas */}
            <div className="col-span-8 bg-zinc-100 dark:bg-zinc-950 rounded-2xl border p-8 flex items-start justify-center overflow-y-auto">
                <div className="w-full max-w-[600px] bg-white shadow-xl min-h-[600px] rounded-lg overflow-hidden">
                    <iframe
                        title="Preview"
                        srcDoc={previewHtml}
                        className="w-full h-[800px] border-none pointer-events-none" // pointer-events-none to prevent dragging text in iframe
                    />
                </div>
            </div>

        </div>
    );
}
