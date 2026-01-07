
import { supabase } from "@/lib/supabase";

export interface UserPreferences {
    user_id?: string;
    notifications: {
        push_enabled: boolean;
        sound_enabled: boolean;
        sound_volume: number;
        sound_selection: 'subtle' | 'pop' | 'classic';
        desktop_notifications: boolean;
        channel_overrides?: Record<string, any>;
    };
    behavior: {
        auto_advance: boolean;
        send_on_enter: boolean;
        default_view: 'all' | 'unassigned' | 'mentions';
    };
    shortcuts: Record<string, string>;
    theme: {
        mode: 'system' | 'light' | 'dark';
        density: 'compact' | 'comfortable';
    };
}

export const DEFAULT_PREFERENCES: UserPreferences = {
    notifications: {
        push_enabled: false,
        sound_enabled: true,
        sound_volume: 0.5,
        sound_selection: 'subtle',
        desktop_notifications: false
    },
    behavior: {
        auto_advance: false,
        send_on_enter: true,
        default_view: 'all'
    },
    shortcuts: {},
    theme: {
        mode: 'system',
        density: 'comfortable'
    }
};

export class UserPreferencesService {
    private supabase = supabase;

    async getPreferences(): Promise<UserPreferences> {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user) throw new Error("No authenticated user");

        const { data, error } = await this.supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single();

        // PGRST116: Row not found (expected for new users)
        // 42P01: Table not found (migration not applied yet)
        if (error) {
            if (error.code === 'PGRST116' || error.code === '42P01') {
                // Return defaults silently
                return DEFAULT_PREFERENCES;
            }
            console.error('Error fetching preferences:', JSON.stringify(error, null, 2));
            return DEFAULT_PREFERENCES;
        }

        if (!data) {
            // Lazy create? Or just return default
            return DEFAULT_PREFERENCES;
        }

        // Merge with defaults to ensure new fields are present
        return {
            ...DEFAULT_PREFERENCES,
            ...data,
            notifications: { ...DEFAULT_PREFERENCES.notifications, ...data.notifications },
            behavior: { ...DEFAULT_PREFERENCES.behavior, ...data.behavior },
        };
    }

    async updatePreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user) throw new Error("No authenticated user");

        // We need to fetch current first to merge deep JSONB? 
        // Or we can just do a UPSERT with the full object if we maintain state in UI.

        // Strategy: The UI should pass the complete modified object sections
        // But for partial updates (e.g. just toggling sound), we need to be careful not to overwrite other JSON keys if we replace the whole JSON column.

        // For simplicity in this v1, we will upsert the specific columns provided.
        // BUT Supabase update with JSONB is tricky if we want to deep merge.
        // Best approach from frontend: Get current state, modify locally, send full JSON for that column.

        const payload: any = { user_id: user.id, updated_at: new Date().toISOString() };
        if (updates.notifications) payload.notifications = updates.notifications;
        if (updates.behavior) payload.behavior = updates.behavior;
        if (updates.shortcuts) payload.shortcuts = updates.shortcuts;
        if (updates.theme) payload.theme = updates.theme;

        const { data, error } = await this.supabase
            .from('user_preferences')
            .upsert(payload)
            .select()
            .single();

        if (error) throw error;
        return data as UserPreferences;
    }
}
