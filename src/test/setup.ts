import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Supabase modules globally if needed, or per test file
vi.mock('@/lib/supabase-server', () => ({
    createClient: vi.fn(),
}))

vi.mock('@/lib/supabase-admin', () => ({
    supabaseAdmin: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn(),
        })),
        rpc: vi.fn(),
    },
}))
