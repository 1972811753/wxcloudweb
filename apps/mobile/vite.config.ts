import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@galaxy/shared-types': resolve(__dirname, '../../packages/shared-types/src/index.ts'),
      '@galaxy/shared-hooks': resolve(__dirname, '../../packages/shared-hooks/src/index.ts'),
    },
  },
  server: {
    port: 5174,
    host: true,
  },
})
