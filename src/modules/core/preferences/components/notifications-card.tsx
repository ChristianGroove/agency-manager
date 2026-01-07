
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Bell, BellOff, Music } from "lucide-react";
import { useInboxPreferences } from "../use-inbox-preferences";
import { SoundPlayer } from "../sound-player";

export function NotificationsCard() {
    const { preferences, updatePreferences, loading } = useInboxPreferences();
    const { notifications } = preferences;

    const togglePush = async (val: boolean) => {
        if (val) {
            // Request permission
            if (Notification.permission === 'default') {
                const result = await Notification.requestPermission();
                if (result !== 'granted') return;
            }
        }
        updatePreferences('notifications', { push_enabled: val });
    };

    const playPreview = (type: any) => {
        SoundPlayer.getInstance().play(type, notifications.sound_volume);
    };

    if (loading) return <Card className="animate-pulse h-48" />;

    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="h-5 w-5 text-primary" />
                            Notifications & Zen
                        </CardTitle>
                        <CardDescription>Configure how you want to be alerted</CardDescription>
                    </div>
                    {notifications.push_enabled && <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Active</Badge>}
                </div>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Push Toggle */}
                <div className="flex items-center justify-between space-x-2">
                    <div className="flex flex-col space-y-1">
                        <Label htmlFor="push-mode">Browser Push Notifications</Label>
                        <span className="text-xs text-muted-foreground">Receive system alerts even when tab is backgrounded.</span>
                    </div>
                    <Switch
                        id="push-mode"
                        checked={notifications.push_enabled}
                        onCheckedChange={togglePush}
                    />
                </div>

                <div className="border-t" />

                {/* Sound Settings */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col space-y-1">
                            <Label htmlFor="sound-mode">Sound Effects</Label>
                            <span className="text-xs text-muted-foreground">Play sound on new messages.</span>
                        </div>
                        <Switch
                            id="sound-mode"
                            checked={notifications.sound_enabled}
                            onCheckedChange={(v) => updatePreferences('notifications', { sound_enabled: v })}
                        />
                    </div>

                    {notifications.sound_enabled && (
                        <div className="pl-4 border-l-2 border-muted space-y-4">
                            <div className="space-y-2">
                                <Label>Volume ({Math.round(notifications.sound_volume * 100)}%)</Label>
                                <Slider
                                    value={[notifications.sound_volume]}
                                    max={1}
                                    step={0.1}
                                    onValueChange={([v]) => {
                                        updatePreferences('notifications', { sound_volume: v });
                                        SoundPlayer.getInstance().play(notifications.sound_selection || 'subtle', v);
                                    }}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Tone Selection</Label>
                                <RadioGroup
                                    value={notifications.sound_selection}
                                    onValueChange={(v) => {
                                        updatePreferences('notifications', { sound_selection: v });
                                        SoundPlayer.getInstance().play(v as any, notifications.sound_volume);
                                    }}
                                    className="grid grid-cols-3 gap-2"
                                >
                                    {['subtle', 'pop', 'classic'].map((tone) => (
                                        <div key={tone}>
                                            <RadioGroupItem value={tone} id={tone} className="peer sr-only" />
                                            <Label
                                                htmlFor={tone}
                                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer text-center capitalize"
                                            >
                                                <Music className="mb-2 h-4 w-4" />
                                                {tone}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>
                        </div>
                    )}
                </div>

            </CardContent>
        </Card>
    );
}
