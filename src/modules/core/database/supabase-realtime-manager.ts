/* 
 * CRITICAL: SupabaseRealtimeManager (Singleton)
 * --------------------------------------------
 * This manager prevents WebSocket connection flooding ("Thundering Herd")
 * by decoupling channels from React lifecycles. 
 * 
 * DESIGN RULE: Always use realtimeManager.getOrCreateChannel() + releaseChannel()
 * instead of direct supabase.channel() in components.
 * 
 * For full documentation, see: realtime_architecture_guide.md
 */

import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'

/**
 * Singleton manager to preserve Realtime channels across React re-renders and unmounts.
 * This prevents "thundering herd" connection attempts and stabilizes WebSockets.
 */
class SupabaseRealtimeManager {
    private channels: Map<string, {
        channel: RealtimeChannel;
        refCount: number;
        cleanupTimeout?: NodeJS.Timeout;
    }> = new Map();

    /**
     * Get or create a persistent channel.
     * @param channelName Unique name for the channel
     * @param setup Callback to configure the channel (runs every time to allow new listeners)
     */
    public async getOrCreateChannel(
        channelName: string, 
        setup: (channel: RealtimeChannel) => void
    ): Promise<RealtimeChannel> {
        let entry = this.channels.get(channelName);

        if (entry) {
            console.log(`[RealtimeManager] Reusing channel: ${channelName}`);
            if (entry.cleanupTimeout) {
                clearTimeout(entry.cleanupTimeout);
                entry.cleanupTimeout = undefined;
            }
            entry.refCount++;
            
            // RUN SETUP RE-REGISTRATION (Allow adding more listeners/filters)
            setup(entry.channel);
            
            return entry.channel;
        }

        console.log(`[RealtimeManager] Creating NEW channel: ${channelName}`);
        const channel = supabase.channel(channelName);
        
        // Initial setup
        setup(channel);
        
        channel.subscribe((status) => {
            console.log(`[RealtimeManager] Channel ${channelName} status: ${status}`);
        });

        this.channels.set(channelName, { channel, refCount: 1 });
        return channel;
    }

    /**
     * Decrease refCount and cleanup after a delay if no one is using it.
     */
    public releaseChannel(channelName: string) {
        const entry = this.channels.get(channelName);
        if (!entry) return;

        entry.refCount--;
        if (entry.refCount <= 0) {
            console.log(`[RealtimeManager] Channel ${channelName} marked for cleanup...`);
            // Wait 10s before truly closing to handle rapid re-mounts
            entry.cleanupTimeout = setTimeout(() => {
                console.log(`[RealtimeManager] Closing idle channel: ${channelName}`);
                supabase.removeChannel(entry.channel);
                this.channels.delete(channelName);
            }, 10000);
        }
    }
}

export const realtimeManager = new SupabaseRealtimeManager();
