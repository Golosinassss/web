import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    root: '.',
    publicDir: 'public',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: resolve(__dirname, 'index.html'),
        },
        // Minificación real sin obfuscation — reduce JS de 87KB a ~30KB
        minify: 'esbuild',
        sourcemap: false,
    },
    server: {
        port: 5173,
        open: true,
    },
});
