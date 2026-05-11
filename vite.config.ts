import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Base path for GitHub Pages — see docs/adr/0010-github-pages-publishing.md
const BASE = process.env.VITE_BASE ?? '/castle-archive-memory-vault/';

export default defineConfig({
  base: BASE,
  plugins: [react()],
  build: {
    outDir: 'docs',
    emptyOutDir: false, // preserve docs/adr/*.md and other markdown
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm', '@huggingface/transformers'],
  },
  server: {
    headers: {
      // Required for SharedArrayBuffer / multi-threaded WASM (ONNX runtime, DuckDB)
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
