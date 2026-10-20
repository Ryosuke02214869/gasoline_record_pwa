<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'
import Button from 'primevue/button'
import { useNetworkStatus } from '@/composables/useNetworkStatus'

// Service Worker の登録と更新検知
const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
  onRegisteredSW(_swUrl, registration) {
    // 開きっぱなしでも新しいバージョンに気づけるよう、1時間ごとに更新を確認する
    if (registration) {
      setInterval(() => registration.update(), 60 * 60 * 1000)
    }
  },
})

const closeOfflineReady = () => {
  offlineReady.value = false
}

const closeNeedRefresh = () => {
  needRefresh.value = false
}

// オンライン / オフライン状態
const { isOnline } = useNetworkStatus()
</script>

<template>
  <div v-if="!isOnline" class="offline-banner" role="status">
    <i class="pi pi-wifi"></i>
    <span>オフラインです。給油記録の登録と、各車両の直近2件の確認ができます。</span>
  </div>

  <div v-if="needRefresh" class="pwa-toast" role="alert">
    <p>新しいバージョンがあります。更新しますか？</p>
    <div class="pwa-toast-actions">
      <Button label="更新する" icon="pi pi-refresh" @click="updateServiceWorker(true)" />
      <Button label="あとで" severity="secondary" outlined @click="closeNeedRefresh" />
    </div>
  </div>

  <div v-else-if="offlineReady" class="pwa-toast" role="status">
    <p>アプリの準備ができました。ホーム画面から起動できます。</p>
    <div class="pwa-toast-actions">
      <Button label="閉じる" severity="secondary" outlined @click="closeOfflineReady" />
    </div>
  </div>
</template>

<style scoped>
.offline-banner {
  position: sticky;
  top: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  padding-top: calc(0.875rem + env(safe-area-inset-top));
  background: #b45309;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.5;
}

.pwa-toast {
  position: fixed;
  left: 1rem;
  right: 1rem;
  bottom: calc(1rem + env(safe-area-inset-bottom));
  z-index: 1100;
  max-width: 480px;
  margin: 0 auto;
  padding: 1.25rem;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  border-left: 6px solid var(--vt-c-primary);
}

.pwa-toast p {
  margin: 0 0 1rem;
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--vt-c-text-primary);
  line-height: 1.5;
}

.pwa-toast-actions {
  display: flex;
  gap: 0.75rem;
}

.pwa-toast-actions :deep(.p-button) {
  flex: 1;
  min-height: 48px;
  font-size: 1rem;
}
</style>
