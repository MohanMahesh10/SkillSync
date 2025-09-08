import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Adjust base for GitHub Pages. Use env override or infer from repo; fallback '/'.
const inferredRepo = (process.env.GITHUB_REPOSITORY || '').split('/')[1];
const base = process.env.VITE_BASE_PATH || (inferredRepo ? `/${inferredRepo}/` : '/');

export default defineConfig({
  base,
  plugins: [svelte()],
  build: {
    target: 'es2018',
    cssMinify: true,
    sourcemap: false,
  },
  server: {
    hmr: { overlay: true },
  },
});


