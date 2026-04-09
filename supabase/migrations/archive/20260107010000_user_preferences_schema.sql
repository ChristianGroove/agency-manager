-- Migration: User Preferences Schema
-- Description: Stores per-user configuration for Inbox (Notifications, Sounds, Shortcuts) and other platform settings.
-- Date: 2026-01-07

CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Notifications Configuration
    notifications JSONB DEFAULT '{
        "push_enabled": false,
        "sound_enabled": true,
        "sound_volume": 0.5,
        "sound_selection": "subtle",
        "desktop_notifications": false,
        "channel_overrides": {}
    }'::jsonb,

    -- Inbox Behavior & Productivity
    behavior JSONB DEFAULT '{
        "auto_advance": false,
        "send_on_enter": true, 
        "default_view": "all"
    }'::jsonb,

    -- Custom Shortcuts Map
    shortcuts JSONB DEFAULT '{}'::jsonb,

    -- Visual Theme & Density
    theme JSONB DEFAULT '{
        "mode": "system",
        "density": "comfortable"
    }'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Users can only see/edit their own preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences" ON public.user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON public.user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Auto-update timestamp
CREATE TRIGGER update_user_preferences_modtime
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp(); -- Reusing existing function
