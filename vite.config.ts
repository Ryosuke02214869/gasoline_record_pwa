import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    VitePWA({
      // 新しいバージョンがあるときはユーザーに確認してから更新する
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'pwa-icon.svg'],
      manifest: {
        name: 'ガソリン給油記録',
        short_name: '給油記録',
        description: '給油量・単価・走行距離を記録して燃費を管理するアプリ',
        lang: 'ja',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#5B5FED',
        background_color: '#E8E8F5',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: '給油を記録',
            short_name: '給油を記録',
            url: '/fuel-records/create',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: '給油記録一覧',
            short_name: '記録一覧',
            url: '/fuel-records',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        // アプリ本体（HTML/JS/CSS/フォント/画像）をキャッシュしてオフラインでも起動できるようにする
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot}'],
        // SPA のため、どのパスでも index.html を返す
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Supabase への通信はキャッシュしない（常に最新データを取得する）
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
