import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
export default defineConfig({
    plugins: [react()], cacheDir: '.cache/meta-vite',
    test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test/setup.ts'],
        alias: { '@': path.resolve(process.cwd(), 'src') },
        env: { ENCRYPTION_KEY: 'test-only-key-32-bytes-long-abcdef' }, fileParallelism: false },
})
