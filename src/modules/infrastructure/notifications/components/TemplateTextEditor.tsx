
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmailBranding } from "@/modules/infrastructure/notifications/services/email-templates";
import { Loader2, Save, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ui/image-upload";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TemplateTextEditorProps {
    initialBranding: EmailBranding;
    onSave: (overrides: any) => Promise<void>;
    isSaving: boolean;
}

export function TemplateTextEditor({ initialBranding, onSave, isSaving }: TemplateTextEditorProps) {
    const [overrides, setOverrides] = useState({
        greeting: initialBranding.text_overrides?.greeting || "Hola {{name}},",
        intro_text: initialBranding.text_overrides?.intro_text || "Adjunto encontrarás...",
        cta_text: initialBranding.text_overrides?.cta_text || "Ver Documento",
        footer_text: initialBranding.text_overrides?.footer_text || initialBranding.footer_text || "",
        legal_text: initialBranding.text_overrides?.legal_text || initialBranding.legal_footer || "",
    });

    const [logo, setLogo] = useState(initialBranding.logo_url || "");

    useEffect(() => {
        setOverrides({
            greeting: initialBranding.text_overrides?.greeting || "Hola {{name}},",
            intro_text: initialBranding.text_overrides?.intro_text || "Adjunto encontrarás...",
            cta_text: initialBranding.text_overrides?.cta_text || "Ver Documento",
            footer_text: initialBranding.text_overrides?.footer_text || initialBranding.footer_text || "",
            legal_text: initialBranding.text_overrides?.legal_text || initialBranding.legal_footer || "",
        });
        setLogo(initialBranding.logo_url || "");
    }, [initialBranding]);

    const handleSave = () => {
        onSave({
            ...initialBranding,
            logo_url: logo,
            text_overrides: overrides
        });
    };

    return (
        <div className="space-y-6 p-4 border rounded-xl bg-white dark:bg-zinc-900 shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">Personalizar</h3>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => toast.info("Función de reset pendiente")}>
                        <Undo2 className="w-4 h-4 mr-2" /> Restaurar
                    </Button>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button onClick={handleSave} disabled={isSaving} size="icon" className="h-8 w-8">
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Guardar Cambios</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            <Separator />

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground font-bold">Logo de la Agencia</Label>
                    <ImageUpload
                        value={logo}
                        onChange={setLogo}
                        bucket="agency-assets"
                        compact
                        label="Logotipo"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Saludo</Label>
                    <Input
                        value={overrides.greeting}
                        onChange={e => setOverrides(o => ({ ...o, greeting: e.target.value }))}
                        placeholder="Ej: Hola {{name}},"
                    />
                    <p className="text-[10px] text-muted-foreground">Usa <code>{`{{name}}`}</code> para el nombre del cliente.</p>
                </div>

                <div className="space-y-2">
                    <Label>Texto de Introducción</Label>
                    <Textarea
                        value={overrides.intro_text}
                        onChange={e => setOverrides(o => ({ ...o, intro_text: e.target.value }))}
                        rows={3}
                    />
                    <p className="text-[10px] text-muted-foreground">Texto principal. Para facturas, el # es automático.</p>
                </div>

                <div className="space-y-2">
                    <Label>Texto del Botón (CTA)</Label>
                    <Input
                        value={overrides.cta_text}
                        onChange={e => setOverrides(o => ({ ...o, cta_text: e.target.value }))}
                    />
                </div>

                <Separator className="my-4" />

                <div className="space-y-2">
                    <Label>Pie de Página (Footer)</Label>
                    <Input
                        value={overrides.footer_text}
                        onChange={e => setOverrides(o => ({ ...o, footer_text: e.target.value }))}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Texto Legal</Label>
                    <Textarea
                        value={overrides.legal_text}
                        onChange={e => setOverrides(o => ({ ...o, legal_text: e.target.value }))}
                        rows={3}
                        className="text-xs"
                    />
                </div>
            </div>
        </div>
    );
}
