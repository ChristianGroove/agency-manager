/* eslint-disable @typescript-eslint/no-explicit-any */
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Supabase modules globally if needed, or per test file
vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => {
    const fromMock = vi.fn((table: string) => {
        const builder: any = {
            methods: [] as Array<{ name: string; args: any[] }>,
            then(onFulfilled: any, onRejected: any) {
                return import('@/modules/core/database/supabase-server')
                    .then(async (m) => {
                        const client = await m.createClient();
                        if (client && typeof client.from === 'function') {
                            let query: any = client.from(table);
                            for (const methodCall of builder.methods) {
                                if (typeof query[methodCall.name] === 'function') {
                                    query = query[methodCall.name](...methodCall.args);
                                }
                            }
                            return query;
                        }
                        return { data: null, error: null };
                    })
                    .then(onFulfilled, onRejected);
            }
        };

        const chainableMethods = [
            'select', 'insert', 'update', 'delete', 'upsert',
            'eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'like', 'ilike',
            'is', 'in', 'contains', 'containedBy', 'rangeGt', 'rangeGte',
            'rangeLt', 'rangeLte', 'rangeAdjacent', 'overlaps',
            'textSearch', 'match', 'not', 'or', 'filter', 'order',
            'limit', 'range', 'single', 'maybeSingle', 'csv'
        ];

        chainableMethods.forEach(method => {
            builder[method] = vi.fn((...args: any[]) => {
                builder.methods.push({ name: method, args });
                return builder;
            });
        });

        return builder;
    });

    return {
        supabaseAdmin: {
            from: fromMock,
            rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
            storage: {
                from: vi.fn(() => ({
                    remove: vi.fn().mockResolvedValue({ data: null, error: null }),
                    upload: vi.fn().mockResolvedValue({ data: null, error: null }),
                }))
            }
        },
    };
})

vi.mock('next/headers', () => ({
    headers: vi.fn(async () => new Map()),
    cookies: vi.fn(async () => ({
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
    })),
}))
