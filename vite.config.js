import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  base: './',
  root: 'src',
  build: {
    outDir: '../dist/renderer',
    emptyOutDir: true,
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/flag-icons/flags/4x3/*.svg',
          dest: 'flags',
        },
      ],
    }),
  ],
  server: { port: 5173 },
})
