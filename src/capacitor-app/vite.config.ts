import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    minify: 'esbuild',
    target: 'es2020',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
      },
    },
    // 針對 mobile 優化
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
  },
  server: {
    port: 8787,
    host: true,
    cors: true,
  },
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.CAPACITOR': 'true',
    'process.env.APP_VERSION': JSON.stringify(process.env.npm_package_version || '1.0.0'),
    // 應用常數
    '__APP_CONFIG__': JSON.stringify({
      MAX_VIDEO_DURATION_SECONDS: 1800,
      MAX_FILE_SIZE_MB: 500,
      WHISPER_MODEL: 'small',
      SUPPORTED_PROVIDERS: ['openai', 'gemini', 'nvidia'],
    }),
  },
  esbuild: {
    pure: ['console.debug'],
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
});