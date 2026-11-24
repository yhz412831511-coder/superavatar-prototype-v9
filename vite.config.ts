import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import scope from './scripts/postcss-scope.mjs';

const workbenchDir = fileURLToPath(new URL('./src/workbench/', import.meta.url));

export default defineConfig({
  // 相对基址：构建产物可放在任意目录或嵌套路径下预览，沙箱资源随之解析。
  base: './',
  resolve: { alias: { '@': workbenchDir } },
  css: {
    postcss: {
      plugins: [
        tailwindcss(),
        scope({ include: (file: string) => file.startsWith(workbenchDir) }),
      ],
    },
  },
  plugins: [react()],
  server: { port: 8793, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 4000 },
});
