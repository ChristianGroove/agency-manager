
"use client";

import { useEffect, useState, useCallback } from 'react';
import { UserPreferences, UserPreferencesService, DEFAULT_PREFERENCES } from './user-preferences-service';
import { toast } from "sonner";

const service = new UserPreferencesService();

export function useInboxPreferences() {
    const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
    const [loading, setLoading] = useState(true);

    const fetchPreferences = useCallback(async () => {
        try {
            const prefs = await service.getPreferences();
            setPreferences(prefs);
        } catch (error) {
            console.error("Failed to load inbox preferences", error);
            // toast.error("Could not load preferences");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPreferences();
    }, [fetchPreferences]);

    const updatePreferences = async (section: keyof UserPreferences, updates: any) => {
        // Optimistic update
        const oldState = { ...preferences };
        const newState = {
            ...preferences,
            [section]: { ...(preferences[section] as any), ...updates }
        };
        setPreferences(newState);

        try {
            await service.updatePreferences({ [section]: newState[section] });
            toast.success("Settings saved");
        } catch (error) {
            setPreferences(oldState); // Revert
            toast.error("Failed to save settings");
            console.error(error);
        }
    };

    return {
        preferences,
        loading,
        updatePreferences,
        refresh: fetchPreferences
    };
}
