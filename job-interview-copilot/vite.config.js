import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Adjust base for GitHub Pages. If deploying under a repo named "job-interview-copilot",
// this base is correct. Otherwise, set VITE_BASE_PATH env or edit below.
const base = process.env.VITE_BASE_PATH || '/job-interview-copilot/';

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


