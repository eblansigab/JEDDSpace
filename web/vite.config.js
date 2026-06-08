import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    open: true,
    hmr: true,
    host: "0.0.0.0",
    cors: true,
  }
})