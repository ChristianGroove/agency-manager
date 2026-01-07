
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Brush, Layout } from "lucide-react";
import { useInboxPreferences } from "../use-inbox-preferences";

export function DisplayCard() {
    const { preferences, updatePreferences } = useInboxPreferences();
    const { theme } = preferences;

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Brush className="h-5 w-5 text-indigo-500" />
                    Display & Density
                </CardTitle>
                <CardDescription>Customize the look and feel of the inbox</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Density */}
                <div className="space-y-3">
                    <Label>Density</Label>
                    <RadioGroup
                        value={theme.density}
                        onValueChange={(v) => updatePreferences('theme', { density: v })}
                        className="grid grid-cols-2 gap-4"
                    >
                        <div>
                            <RadioGroupItem value="comfortable" id="comfortable" className="peer sr-only" />
                            <Label
                                htmlFor="comfortable"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                            >
                                <Layout className="mb-3 h-6 w-6" />
                                <div className="space-y-1 text-center">
                                    <div className="font-semibold">Comfortable</div>
                                    <div className="text-xs text-muted-foreground">Standard spacing with 2-line preview</div>
                                </div>
                            </Label>
                        </div>
                        <div>
                            <RadioGroupItem value="compact" id="compact" className="peer sr-only" />
                            <Label
                                htmlFor="compact"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                            >
                                <Layout className="mb-3 h-6 w-6 scale-y-75" />
                                <div className="space-y-1 text-center">
                                    <div className="font-semibold">Compact</div>
                                    <div className="text-xs text-muted-foreground">Dense list for high volume</div>
                                </div>
                            </Label>
                        </div>
                    </RadioGroup>
                </div>

                <div className="border-t" />

                {/* Theme Mode */}
                <div className="space-y-3">
                    <Label>Theme Preference</Label>
                    <RadioGroup
                        value={theme.mode}
                        onValueChange={(v) => updatePreferences('theme', { mode: v })}
                        className="grid grid-cols-3 gap-2"
                    >
                        {['system', 'light', 'dark'].map((mode) => (
                            <div key={mode}>
                                <RadioGroupItem value={mode} id={mode} className="peer sr-only" />
                                <Label
                                    htmlFor={mode}
                                    className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer capitalize text-sm"
                                >
                                    {mode}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                </div>

            </CardContent>
        </Card>
    );
}
