import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Dev only: forward /api calls to the Express backend (npm run dev in backend/)
    proxy: { '/api': 'http://localhost:3001' },
  },
})
