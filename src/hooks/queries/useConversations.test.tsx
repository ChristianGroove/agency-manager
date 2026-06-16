import { renderHook } from '@testing-library/react';
import { useConversations } from './useConversations';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase to avoid real network requests
vi.mock('@/modules/core/database/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            gt: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            then: (resolve: any) => resolve({ data: [], error: null })
        }))
    }
}));

const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

describe('useConversations Realtime Optimization (Local Event architecture)', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = createTestQueryClient();
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );

    it('listens to pixy:conversations-update and modifies cache directly on non-critical updates', async () => {
        const orgId = 'org-123';
        
        // Setup initial cache
        queryClient.setQueryData(['conversations', orgId], {
            pages: [[
                { id: 'conv-1', state: 'open', status: 'active', unread_count: 0, assigned_to: 'agent-1' }
            ]],
            pageParams: [0]
        });

        // Spy on setQueriesData and invalidateQueries
        const setSpy = vi.spyOn(queryClient, 'setQueriesData');
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        renderHook(() => useConversations({
            orgId,
            userId: 'agent-1',
            hasGlobalView: false,
            isAdmin: false,
            authorizedChannels: [],
            identityLoaded: true,
        }), { wrapper });

        // Simulate a minor UPDATE event (no critical fields changed)
        const minorEvent = new CustomEvent('pixy:conversations-update', {
            detail: {
                eventType: 'UPDATE',
                new: { id: 'conv-1', state: 'open', status: 'active', unread_count: 0, assigned_to: 'agent-1', preview: 'new message' }
            }
        });
        window.dispatchEvent(minorEvent);

        // Verify cache was updated locally without refetching
        expect(setSpy).toHaveBeenCalled();
        expect(invalidateSpy).not.toHaveBeenCalled(); // No invalidate needed for minor updates

        // Verify cache content changed
        const cache: any = queryClient.getQueryData(['conversations', orgId]);
        expect(cache.pages[0][0].preview).toBe('new message');
    });

    it('invalidates cache to force network refetch on critical field updates (e.g., reassignment)', async () => {
        const orgId = 'org-123';
        
        queryClient.setQueryData(['conversations', orgId], {
            pages: [[
                { id: 'conv-1', state: 'open', status: 'active', unread_count: 0, assigned_to: 'agent-1' }
            ]],
            pageParams: [0]
        });

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        renderHook(() => useConversations({
            orgId,
            userId: 'agent-1',
            hasGlobalView: false,
            isAdmin: false,
            authorizedChannels: [],
            identityLoaded: true,
        }), { wrapper });

        // Simulate a critical UPDATE event (assigned_to changed)
        const criticalEvent = new CustomEvent('pixy:conversations-update', {
            detail: {
                eventType: 'UPDATE',
                new: { id: 'conv-1', state: 'open', status: 'active', unread_count: 0, assigned_to: 'agent-2' }
            }
        });
        window.dispatchEvent(criticalEvent);

        // Should invalidate query to refetch due to filter impact
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['conversations', orgId] });
    });

    it('invalidates cache on INSERT events to fetch joins (leads, clients, etc.)', async () => {
        const orgId = 'org-123';
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        renderHook(() => useConversations({
            orgId,
            userId: 'agent-1',
            hasGlobalView: false,
            isAdmin: false,
            authorizedChannels: [],
            identityLoaded: true,
        }), { wrapper });

        // Simulate an INSERT event
        const insertEvent = new CustomEvent('pixy:conversations-update', {
            detail: {
                eventType: 'INSERT',
                new: { id: 'conv-2', state: 'open', status: 'active', unread_count: 1, assigned_to: 'agent-1' }
            }
        });
        window.dispatchEvent(insertEvent);

        // INSERT always requires refetch to get relational data
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['conversations', orgId] });
    });
});
