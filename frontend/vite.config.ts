import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// @ts-ignore
import sri from 'vite-plugin-sri'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), sri()],
})
