'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch'; // You might need to check if this component exists or use a standard input
import { Mic, Bot, BrainCircuit, Wand2 } from 'lucide-react';
import { updateGlobalSettings } from './actions';
import { toast } from 'sonner';

// Temporary Switch shim if not available in your UI library
function SimpleSwitch({ checked, onCheckedChange, disabled }: { checked: boolean, onCheckedChange: (v: boolean) => void, disabled?: boolean }) {
    return (
        <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} disabled={disabled} className="sr-only peer" />
            <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600`}></div>
        </label>
    );
}

export function ModelSwitchboard({ initialSettings }: { initialSettings: any }) {
    const [settings, setSettings] = useState(initialSettings);
    const [loading, setLoading] = useState<string | null>(null);

    const handleToggle = async (key: string) => {
        const newValue = !settings[key];

        // Optimistic Update
        setSettings({ ...settings, [key]: newValue });
        setLoading(key);

        const result = await updateGlobalSettings(key, newValue);

        if (!result.success) {
            // Revert
            setSettings({ ...settings, [key]: !newValue });
            toast.error("Error al actualizar configuración");
        } else {
            toast.success("Configuración actualizada");
        }
        setLoading(null);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-indigo-500" />
                    Model Switchboard
                </CardTitle>
                <CardDescription>
                    Activa o desactiva las capacidades globales de IA.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Voice Pipeline (DISABLED BY DESIGN) */}
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border opacity-60 grayscale select-none">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <Mic className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">Pixy Voice Runtime</p>
                                <span className="text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500 uppercase">
                                    Requiere GPU
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">Infraestructura de voz preparada. (Inactivo)</p>
                        </div>
                    </div>
                    {/* Locked Switch */}
                    <SimpleSwitch
                        checked={false}
                        onCheckedChange={() => { }}
                        disabled={true}
                    />
                </div>

                {/* Text Agent */}
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                            <Bot className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="font-medium text-sm">Agente Operativo (Texto)</p>
                            <p className="text-xs text-muted-foreground">Motor LLM estándar para chats de texto.</p>
                        </div>
                    </div>
                    <SimpleSwitch
                        checked={settings.is_clawdbot_enabled}
                        onCheckedChange={() => handleToggle('is_clawdbot_enabled')}
                        disabled={loading === 'is_clawdbot_enabled'}
                    />
                </div>

                {/* Voice Engine (Advanced) */}
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Wand2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="font-medium text-sm">Motor de Voz (Beta)</p>
                            <p className="text-xs text-muted-foreground">Motor avanzado de personalidad y contexto.</p>
                        </div>
                    </div>
                    <SimpleSwitch
                        checked={settings.is_personaplex_enabled}
                        onCheckedChange={() => handleToggle('is_personaplex_enabled')}
                        disabled={loading === 'is_personaplex_enabled'}
                    />
                </div>

            </CardContent>
        </Card>
    );
}
