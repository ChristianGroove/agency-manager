import React, { useState } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Check, Settings2 } from 'lucide-react';

interface WorkflowSettingsSheetProps {
    isOpen: boolean;
    onClose: () => void;
    initialName: string;
    initialDescription: string;
    initialIsActive: boolean;
    onSave: (name: string, description: string, isActive: boolean) => Promise<void>;
}

export function WorkflowSettingsSheet({
    isOpen,
    onClose,
    initialName,
    initialDescription,
    initialIsActive,
    onSave
}: WorkflowSettingsSheetProps) {
    const [name, setName] = useState(initialName);
    const [description, setDescription] = useState(initialDescription);
    const [isActive, setIsActive] = useState(initialIsActive);
    const [isLoading, setIsLoading] = useState(false);

    // Sync with props when opening
    React.useEffect(() => {
        if (isOpen) {
            setName(initialName);
            setDescription(initialDescription || '');
            setIsActive(initialIsActive);
        }
    }, [isOpen, initialName, initialDescription, initialIsActive]);

    const handleSave = async () => {
        setIsLoading(true);
        await onSave(name, description, isActive);
        setIsLoading(false);
        onClose();
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-[400px] sm:w-[500px] p-0 border-none bg-white dark:bg-slate-950 flex flex-col shadow-2xl m-4 rounded-2xl h-[calc(100vh-2rem)] overflow-hidden focus:outline-none ring-0">
                <div className="px-6 py-6 border-b border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/20">
                    <SheetHeader className="p-0">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                                <Settings2 size={20} />
                            </div>
                            <div>
                                <SheetTitle className="text-xl font-bold text-slate-900 dark:text-white">Configuración del Workflow</SheetTitle>
                                <SheetDescription className="text-sm font-medium">Configuración global</SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                    <div className="space-y-2">
                        <Label>Nombre del Workflow</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="h-10 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Descripción</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe qué hace esta automatización..."
                            rows={4}
                            className="resize-none bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/30">
                        <div className="space-y-0.5">
                            <Label className="text-base font-medium">Estado Activo</Label>
                            <p className="text-xs text-muted-foreground">Turn this workflow on or off.</p>
                        </div>
                        <Switch checked={isActive} onCheckedChange={setIsActive} />
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/50 backdrop-blur-sm mt-auto flex justify-between items-center">
                    <Button variant="ghost" onClick={onClose} className="text-slate-500">Cancel</Button>
                    <Button onClick={handleSave} disabled={isLoading} className="bg-slate-900 text-white min-w-[120px]">
                        {isLoading ? 'Saving...' : (
                            <>
                                <Check className="mr-2 h-4 w-4" /> Save Settings
                            </>
                        )}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
