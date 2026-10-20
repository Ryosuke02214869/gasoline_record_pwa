/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/vue" />
/// <reference types="vite-plugin-pwa/info" />

import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresGuest?: boolean
    // オフラインでは使えない画面
    requiresOnline?: boolean
    // オフライン時の移動先（ルート名）
    offlineFallback?: string
  }
}
