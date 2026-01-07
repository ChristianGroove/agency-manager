
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Zap, Command, CheckSquare, Keyboard } from "lucide-react";
import { useInboxPreferences } from "../use-inbox-preferences";

export function ProductivityCard() {
    const { preferences, updatePreferences } = useInboxPreferences();
    const { behavior } = preferences;

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-500" />
                    Productivity & Workflow
                </CardTitle>
                <CardDescription>Optimize your speed and efficiency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Auto Advance */}
                <div className="flex items-center justify-between space-x-2">
                    <div className="flex flex-col space-y-1">
                        <Label htmlFor="auto-advance" className="flex items-center gap-2">
                            Auto-Advance
                            <span className="text-xs bg-muted px-1.5 rounded border border-muted-foreground/20">βeta</span>
                        </Label>
                        <span className="text-xs text-muted-foreground">After archiving or closing, jump to the next conversation instead of the list.</span>
                    </div>
                    <Switch
                        id="auto-advance"
                        checked={behavior.auto_advance}
                        onCheckedChange={(v) => updatePreferences('behavior', { auto_advance: v })}
                    />
                </div>

                <div className="border-t" />

                {/* Send on Enter */}
                <div className="flex items-center justify-between space-x-2">
                    <div className="flex flex-col space-y-1">
                        <Label htmlFor="send-enter">Send on Enter</Label>
                        <span className="text-xs text-muted-foreground">
                            If disabled, <strong>Enter</strong> adds a new line and <strong>Ctrl+Enter</strong> sends.
                        </span>
                    </div>
                    <Switch
                        id="send-enter"
                        checked={behavior.send_on_enter}
                        onCheckedChange={(v) => updatePreferences('behavior', { send_on_enter: v })}
                    />
                </div>

                <div className="border-t" />

                {/* Shortcuts Cheat Sheet preview */}
                <div className="flex flex-col space-y-2">
                    <Label className="flex items-center gap-2">
                        <Keyboard className="h-4 w-4" />
                        Key Shortcuts
                    </Label>
                    <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div className="flex justify-between p-2 bg-muted/50 rounded">
                            <span>Send Message</span>
                            <code className="bg-background px-1 rounded border">Enter</code>
                        </div>
                        <div className="flex justify-between p-2 bg-muted/50 rounded">
                            <span>New Line</span>
                            <code className="bg-background px-1 rounded border">Shift+Enter</code>
                        </div>
                        <div className="flex justify-between p-2 bg-muted/50 rounded">
                            <span>Archive</span>
                            <code className="bg-background px-1 rounded border">E</code>
                        </div>
                        <div className="flex justify-between p-2 bg-muted/50 rounded">
                            <span>Focus Search</span>
                            <code className="bg-background px-1 rounded border">/</code>
                        </div>
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}
