import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Supabase modules globally if needed, or per test file
vi.mock('@/modules/core/database/supabase-server', () => ({
    createClient: vi.fn(),
}))

vi.mock('@/modules/core/database/supabase-admin', () => ({
    supabaseAdmin: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn(),
        })),
        rpc: vi.fn(),
    },
}))
