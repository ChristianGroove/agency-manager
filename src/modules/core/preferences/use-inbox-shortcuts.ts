"use client";

import { useHotkeys } from 'react-hotkeys-hook';
import { useInboxPreferences } from './use-inbox-preferences';
import { toast } from 'sonner';

export interface InboxShortcutsProps {
    onSearch?: () => void;
    onArchive?: () => void;
    onNext?: () => void;
    onPrevious?: () => void;
    onDistribute?: () => void;
}

export function useInboxShortcuts({ onSearch, onArchive, onNext, onPrevious, onDistribute }: InboxShortcutsProps = {}) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { preferences } = useInboxPreferences();

    // Focus Search
    useHotkeys('/', (e) => {
        e.preventDefault();
        onSearch?.();
    }, { enableOnFormTags: false });

    // Archive (E)
    useHotkeys('e', (e) => {
        if (onArchive) {
            e.preventDefault();
            onArchive();
            toast("Archived (Shortcut used)");
        }
    }, { enableOnFormTags: false });

    // Navigation (J/K or Arrows)
    useHotkeys('j', () => onNext?.(), { enableOnFormTags: false });
    useHotkeys('k', () => onPrevious?.(), { enableOnFormTags: false });
    useHotkeys('down', () => onNext?.(), { enableOnFormTags: false });
    useHotkeys('up', () => onPrevious?.(), { enableOnFormTags: false });

    // Distribute Unassigned (Ctrl + Alt + A)
    useHotkeys('ctrl+alt+a', (e) => {
        if (onDistribute) {
            e.preventDefault();
            onDistribute();
        }
    }, { enableOnFormTags: false });

    return null; // Logic only
}
