import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    root: '.',
    publicDir: 'public',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: resolve(__dirname, 'index.html'),
            output: {
                // Hashes en nombres → cache busting perfecto en Cloudflare CDN
                entryFileNames: 'assets/[name]-[hash].js',
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash].[ext]',
                // Separar módulos grandes en chunks independientes
                manualChunks(id) {
                    if (id.includes('player.js')) return 'player';
                    if (id.includes('ui.js')) return 'ui';
                    if (id.includes('app.js')) return 'app';
                },
            },
        },
        minify: 'esbuild',
        sourcemap: false,
        // Inlinar assets pequeños (<4kB) directamente en el HTML
        assetsInlineLimit: 4096,
        // Reportar chunks > 500kB como advertencia
        chunkSizeWarningLimit: 500,
    },
    server: {
        port: 5173,
        open: true,
    },
});

