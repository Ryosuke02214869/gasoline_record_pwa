import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import ToastService from 'primevue/toastservice'

// PrimeVue CSS
import 'primeicons/primeicons.css'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { useSyncStore } from './stores/sync'
import { requestPersistentStorage } from './lib/localDb'
import { initDesign } from './composables/useDesign'

// 保存済みのデザインを画面表示前に反映する（切り替わりのちらつきを防ぐ）
initDesign()

// アプリの初期化を非同期関数で実行
async function initializeApp() {
  const app = createApp(App)

  const pinia = createPinia()
  app.use(pinia)

  // 認証ストアを初期化してセッションを復元
  const authStore = useAuthStore()
  await authStore.initialize()

  // 認証の初期化が完了してからルーターを設定
  app.use(router)
  app.use(PrimeVue, {
    theme: {
      preset: Aura,
      options: {
        // PrimeVueのダークモード自動検出を無効化（常にライトモード表示）
        // OSのprefers-color-schemeに関わらず、ライトモードのみを使用する
        darkModeSelector: false,
        // シニア世代向けに大きめのフォントサイズを設定
        cssLayer: {
          name: 'primevue',
          order: 'tailwind-base, primevue, tailwind-utilities'
        }
      }
    }
  })
  app.use(ToastService)

  app.mount('#app')

  // 未送信の記録が自動削除されないよう、端末データの永続化を依頼する
  void requestPersistentStorage()
  // 未送信の記録の自動同期を開始する
  useSyncStore().startAutoSync()
}

// アプリを起動
initializeApp()
