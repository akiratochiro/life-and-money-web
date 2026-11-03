/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Mesmo desenho da produção: o navegador só fala com a origem do front, e /api/* é repassado
  // para a API. Sem reescrever o caminho, porque a API também responde sob /api.
  // API_PROXY_TARGET troca o destino sem editar este arquivo, por exemplo quando a 8081 já está
  // ocupada por outra cópia da API. O preview (vite preview) usa o mesmo proxy.
  server: {
    proxy: {
      '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:8081',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
