import { renderHook, act } from '@testing-library/react';
import { GlobalMessageListener } from './global-message-listener';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

// Mock dependencies
const mocks = vi.hoisted(() => {
    const mockOn = vi.fn().mockReturnThis();
    const mockSubscribe = vi.fn().mockReturnThis();
    const mockChannel = vi.fn(() => ({
        on: mockOn,
        subscribe: mockSubscribe
    }));
    return { mockOn, mockSubscribe, mockChannel };
});

vi.mock('@/modules/core/database/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'agent-123' } } })
        },
        channel: mocks.mockChannel,
        removeChannel: vi.fn(),
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { name: 'Test Lead' } })
        }))
    }
}));

vi.mock('next/navigation', () => ({
    usePathname: vi.fn(() => '/dashboard')
}));

vi.mock('@/modules/core/preferences/use-inbox-preferences', () => ({
    useInboxPreferences: vi.fn(() => ({
        preferences: { notifications: { sound_enabled: false } }
    }))
}));

vi.mock('@/modules/features/messaging/context/inbox-context', () => ({
    useSafeInboxContext: vi.fn(() => ({}))
}));

vi.mock('@/modules/features/messaging/context/global-inbox-context', () => ({
    useGlobalInbox: vi.fn(() => ({ openInbox: vi.fn() }))
}));

vi.mock('@/modules/core/organizations/hooks/use-current-organization', () => ({
    useCurrentOrganization: vi.fn(() => ({ organizationId: 'org-123' }))
}));

vi.mock('@/modules/features/messaging/conversation-actions', () => ({
    getOrgConnectionIds: vi.fn().mockResolvedValue(['chan-1', 'chan-2'])
}));

// We'll mock the permissions response dynamically in tests
let mockPermissions = { role: 'agent', hierarchy: 10, permissions: {} };
vi.mock('@/modules/core/settings/actions/team', () => ({
    getCurrentUserPermissions: vi.fn(() => Promise.resolve(mockPermissions))
}));

vi.mock('@/modules/core/iam/utils/inbox-permissions', () => ({
    evaluateInboxPermissions: vi.fn((perms) => {
        if (perms.role === 'owner') return { hasGlobalView: true, authorizedChannels: [] };
        if (perms.permissions.inbox_access) return { hasGlobalView: false, authorizedChannels: perms.permissions.inbox_access };
        return { hasGlobalView: false, authorizedChannels: [] };
    })
}));

describe('GlobalMessageListener Micro-Subscriptions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('creates a single global subscription for Owners', async () => {
        mockPermissions = { role: 'owner', hierarchy: 100, permissions: {} };
        renderHook(() => GlobalMessageListener());

        // Wait for the async permission fetch to resolve (2000ms delay in component)
        await new Promise(resolve => setTimeout(resolve, 2100));

        // Should have called channel creation
        expect(mocks.mockChannel).toHaveBeenCalledWith(expect.stringContaining('global-conv-org-123'));
        
        // Should have subscribed to the entire organization
        expect(mocks.mockOn).toHaveBeenCalledWith('postgres_changes', expect.objectContaining({
            filter: 'organization_id=eq.org-123'
        }), expect.any(Function));

        // Should NOT have subscribed to specific assignments
        expect(mocks.mockOn).not.toHaveBeenCalledWith('postgres_changes', expect.objectContaining({
            filter: 'assigned_to=eq.agent-123'
        }), expect.any(Function));
    });

    it('creates targeted micro-subscriptions for Restricted Agents with channels', async () => {
        mockPermissions = { 
            role: 'agent', 
            hierarchy: 10, 
            permissions: { inbox_access: ['chan-1', 'chan-2'] } 
        };
        
        renderHook(() => GlobalMessageListener());

        await new Promise(resolve => setTimeout(resolve, 2100));

        // 1 for assigned_to + 2 for channels = 3 total `.on()` calls
        expect(mocks.mockOn).toHaveBeenCalledTimes(3);

        // Subscribes to personal assignments
        expect(mocks.mockOn).toHaveBeenCalledWith('postgres_changes', expect.objectContaining({
            filter: 'assigned_to=eq.agent-123'
        }), expect.any(Function));

        // Subscribes to authorized channel 1
        expect(mocks.mockOn).toHaveBeenCalledWith('postgres_changes', expect.objectContaining({
            filter: 'connection_id=eq.chan-1'
        }), expect.any(Function));

        // Subscribes to authorized channel 2
        expect(mocks.mockOn).toHaveBeenCalledWith('postgres_changes', expect.objectContaining({
            filter: 'connection_id=eq.chan-2'
        }), expect.any(Function));
    });

    it('creates only a personal subscription for Basic Agents with no channels', async () => {
        mockPermissions = { 
            role: 'agent', 
            hierarchy: 10, 
            permissions: {} // No inbox_access
        };
        
        renderHook(() => GlobalMessageListener());

        await new Promise(resolve => setTimeout(resolve, 2100));

        // Only 1 call to `.on()`
        expect(mocks.mockOn).toHaveBeenCalledTimes(1);

        // Subscribes ONLY to personal assignments
        expect(mocks.mockOn).toHaveBeenCalledWith('postgres_changes', expect.objectContaining({
            filter: 'assigned_to=eq.agent-123'
        }), expect.any(Function));
    });
});
