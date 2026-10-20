<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSyncStore } from '@/stores/sync'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import { useToast } from 'primevue/usetoast'
import { useInstallPrompt } from '@/composables/useInstallPrompt'

const router = useRouter()
const authStore = useAuthStore()
const syncStore = useSyncStore()
const toast = useToast()
const { canInstall, showIosGuide, install } = useInstallPrompt()

const logoutDialogVisible = ref(false)
const loggingOut = ref(false)

const handleLogout = async () => {
  if (syncStore.isOffline) {
    toast.add({
      severity: 'info',
      summary: 'オフラインです',
      detail: 'ログアウトはインターネットに接続してから行ってください',
      life: 3000,
    })
    return
  }

  // 未送信の記録があれば先に送信を試み、それでも残る場合は警告する
  loggingOut.value = true
  try {
    await syncStore.syncNow()
  } finally {
    loggingOut.value = false
  }

  if (syncStore.pendingCount > 0) {
    logoutDialogVisible.value = true
    return
  }

  await logout()
}

const logout = async () => {
  loggingOut.value = true
  try {
    await authStore.signOut()
    logoutDialogVisible.value = false
    router.push('/login')
  } catch (error) {
    console.error('Logout error:', error)
    toast.add({
      severity: 'error',
      summary: 'エラー',
      detail: 'ログアウトに失敗しました',
      life: 3000,
    })
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <div class="home-container">
    <header class="app-header">
      <div class="header-brand">
        <div class="brand-icon">
          <i class="pi pi-car"></i>
        </div>
        <h1>ガソリン管理システム</h1>
      </div>
      <Button
        label="ログアウト"
        icon="pi pi-sign-out"
        @click="handleLogout"
        :loading="loggingOut"
        text
        class="logout-button"
      />
    </header>

    <!-- 未送信の記録がある場合のログアウト確認 -->
    <Dialog
      v-model:visible="logoutDialogVisible"
      header="未送信の記録があります"
      :modal="true"
      :closable="true"
      :style="{ width: '90vw', maxWidth: '500px' }"
    >
      <p class="logout-warning-text">
        まだ送信されていない給油記録が <strong>{{ syncStore.pendingCount }}件</strong> あります。
      </p>
      <Message severity="warn" :closable="false">
        ログアウトすると、未送信の記録はこの端末から削除され、元に戻せません。
      </Message>
      <template #footer>
        <Button label="キャンセル" @click="logoutDialogVisible = false" severity="secondary" />
        <Button
          label="削除してログアウト"
          @click="logout"
          severity="danger"
          :loading="loggingOut"
        />
      </template>
    </Dialog>

    <main class="main-content">
      <div class="page-title">
        <h2>メニュー</h2>
      </div>

      <div class="menu-grid">
        <Card class="menu-card" @click="$router.push('/vehicles')">
          <template #content>
            <div class="menu-content">
              <div class="icon-badge primary">
                <i class="pi pi-car"></i>
              </div>
              <h3>車両登録</h3>
              <p>車両の登録・管理を行います</p>
            </div>
          </template>
        </Card>

        <Card class="menu-card" @click="$router.push('/fuel-records')">
          <template #content>
            <div class="menu-content">
              <div class="icon-badge secondary">
                <i class="pi pi-book"></i>
              </div>
              <h3>給油記録</h3>
              <p>給油情報の記録・確認</p>
            </div>
          </template>
        </Card>
      </div>

      <!-- ホーム画面への追加案内（未インストール時のみ表示） -->
      <Card v-if="canInstall || showIosGuide" class="install-card">
        <template #content>
          <div class="install-content">
            <div class="install-heading">
              <i class="pi pi-mobile"></i>
              <h3>ホーム画面に追加</h3>
            </div>
            <template v-if="canInstall">
              <p>アプリとしてインストールすると、ホーム画面からすぐに起動できます。</p>
              <Button
                label="インストールする"
                icon="pi pi-download"
                size="large"
                class="install-button"
                @click="install"
              />
            </template>
            <ol v-else class="ios-steps">
              <li>
                画面下（iPad は右上）の共有ボタン
                <i class="pi pi-upload" aria-label="共有"></i>
                をタップ
              </li>
              <li>「ホーム画面に追加」をタップ</li>
              <li>右上の「追加」をタップ</li>
            </ol>
          </div>
        </template>
      </Card>
    </main>
  </div>
</template>

<style scoped>
.home-container {
  min-height: 100vh;
  background: var(--vt-c-bg-lavender);
}

.app-header {
  background: transparent;
  padding: 1.5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-icon {
  width: 40px;
  height: 40px;
  background: var(--vt-c-primary);
  color: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.app-header h1 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--vt-c-text-primary);
}

.logout-button {
  color: var(--vt-c-text-secondary);
}

.main-content {
  padding: 0 2rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  text-align: center;
  margin-bottom: 2rem;
}

.page-title h2 {
  font-size: 1.125rem;
  font-weight: 400;
  color: var(--vt-c-text-secondary);
  margin: 0;
}

.menu-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 1fr;
  max-width: 400px;
  margin: 0 auto;
}

.menu-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 20px;
  background: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.menu-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.menu-card :deep(.p-card-content) {
  padding: 2rem 1.5rem;
}

.menu-content {
  text-align: center;
}

.menu-content h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--vt-c-text-primary);
  margin: 0 0 0.5rem;
}

.menu-content p {
  color: var(--vt-c-text-secondary);
  font-size: 0.875rem;
  margin: 0;
  line-height: 1.5;
}

.logout-warning-text {
  font-size: 1.0625rem;
  line-height: 1.6;
  margin: 0 0 1rem;
}

.install-card {
  max-width: 400px;
  margin: 1.5rem auto 0;
  border-radius: 20px;
  background: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 2px dashed var(--vt-c-primary-light);
}

.install-card :deep(.p-card-content) {
  padding: 1.5rem;
}

.install-heading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.install-heading i {
  font-size: 1.5rem;
  color: var(--vt-c-primary);
}

.install-heading h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--vt-c-text-primary);
  margin: 0;
}

.install-content p {
  color: var(--vt-c-text-secondary);
  font-size: 1rem;
  margin: 0 0 1rem;
  line-height: 1.6;
}

.install-button {
  width: 100%;
  min-height: 52px;
}

.ios-steps {
  margin: 0;
  padding-left: 1.5rem;
  color: var(--vt-c-text-primary);
  font-size: 1rem;
  line-height: 1.9;
}

.ios-steps i {
  color: var(--vt-c-primary);
  margin: 0 0.25rem;
}

/* PC画面（768px以上） */
@media (min-width: 768px) {
  .menu-grid {
    grid-template-columns: repeat(2, 1fr);
    max-width: 800px;
  }

  .install-card {
    max-width: 800px;
  }
}

/* スマホ画面（768px未満） */
@media (max-width: 767px) {
  .app-header {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    align-items: flex-start;
  }

  .header-brand {
    width: 100%;
  }

  .app-header h1 {
    font-size: 1.125rem;
  }

  .logout-button {
    align-self: flex-end;
  }

  .main-content {
    padding: 0 1rem 1rem;
  }

  .menu-grid {
    max-width: 100%;
  }

  .install-card {
    max-width: 100%;
  }
}
</style>
