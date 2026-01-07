
"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useInboxPreferences } from "./use-inbox-preferences";
import { SoundPlayer } from "./sound-player";
import { toast } from "sonner";

export function useMessageNotifications() {
    const { preferences } = useInboxPreferences();
    const { notifications } = preferences;
    const lastPlayedRef = useRef<number>(0);

    useEffect(() => {
        // If everything is disabled, don't subscribe
        if (!notifications.sound_enabled && !notifications.push_enabled) return;

        const channel = supabase
            .channel('global-notifications')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                async (payload) => {
                    const msg = payload.new as any;

                    // Only notify for inbound messages
                    if (msg.direction !== 'inbound') return;

                    // 1. Check Focus Mode / Active Status (Future: Check "Focus Mode" state if mapped to a store)
                    // For now, assume if preferences are loaded, we respect them.

                    // Debounce sounds (max 1 per second)
                    const now = Date.now();
                    if (now - lastPlayedRef.current < 1000) return;

                    // 2. Play Sound
                    if (notifications.sound_enabled) {
                        try {
                            const volume = notifications.sound_volume ?? 0.5;
                            SoundPlayer.getInstance().play(notifications.sound_selection || 'subtle', volume);
                            lastPlayedRef.current = now;
                        } catch (e) {
                            console.error("Error playing sound", e);
                        }
                    }

                    // 3. Push Notification
                    if (notifications.push_enabled) {
                        if (document.hidden) {
                            // Browser Notification
                            if (Notification.permission === 'granted') {
                                new Notification(`New message from ${msg.sender || 'Contact'}`, {
                                    body: msg.content || 'Sent an attachment',
                                    icon: '/icons/icon-192x192.png' // Ensure this exists or use logo
                                });
                            }
                        } else {
                            // In-App Toast
                            toast.info(`New message from ${msg.sender || 'Contact'}`, {
                                description: msg.content?.substring(0, 50),
                            });
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [notifications]);
}
