import { defineConfig } from 'vite'
import type { PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Strips the @vite/client script tag that Vite injects into HTML.
// This prevents WebSocket connection errors when serving behind a
// reverse proxy that doesn't support WebSocket upgrades.
function stripHmrClient(): PluginOption {
  return {
    name: 'strip-hmr-client',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html.replace(
          /<script type="module" src="\/@vite\/client"><\/script>\n?/,
          '',
        )
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), stripHmrClient()],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    hmr: false,
  },
})
