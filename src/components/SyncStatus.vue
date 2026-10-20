<script setup lang="ts">
import { computed } from 'vue'
import { useSyncStore } from '@/stores/sync'
import { useToast } from 'primevue/usetoast'

const syncStore = useSyncStore()
const toast = useToast()

const status = computed(() => {
  if (syncStore.syncing) {
    return { tone: 'info', icon: 'pi pi-spin pi-sync', label: '同期中…', sub: '' }
  }
  if (syncStore.isOffline) {
    return {
      tone: 'offline',
      icon: 'pi pi-wifi',
      label: 'オフライン',
      sub: syncStore.pendingCount > 0 ? `未送信 ${syncStore.pendingCount}件` : '',
    }
  }
  if (syncStore.failedCount > 0) {
    return {
      tone: 'error',
      icon: 'pi pi-exclamation-triangle',
      label: `送信エラー ${syncStore.failedCount}件`,
      sub: 'タップで再送信',
    }
  }
  if (syncStore.pendingCount > 0) {
    return {
      tone: 'warn',
      icon: 'pi pi-cloud-upload',
      label: `未送信 ${syncStore.pendingCount}件`,
      sub: 'タップで今すぐ同期',
    }
  }
  if (!syncStore.lastSyncedAt) {
    return { tone: 'info', icon: 'pi pi-sync', label: '未同期', sub: 'タップで同期' }
  }
  return {
    tone: 'ok',
    icon: 'pi pi-check-circle',
    label: '同期済み',
    sub: `${formatTime(syncStore.lastSyncedAt)} 更新`,
  }
})

function formatTime(iso: string) {
  const date = new Date(iso)
  const today = new Date()
  const time = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  if (date.toDateString() === today.toDateString()) {
    return time
  }
  return `${date.getMonth() + 1}/${date.getDate()} ${time}`
}

const handleClick = async () => {
  if (syncStore.syncing) return

  if (syncStore.isOffline) {
    toast.add({
      severity: 'info',
      summary: 'オフラインです',
      detail: 'インターネットに接続すると自動で送信されます',
      life: 3000,
    })
    return
  }

  const allSent = await syncStore.syncNow()
  toast.add(
    allSent
      ? { severity: 'success', summary: '同期しました', detail: '最新の記録を取得しました', life: 3000 }
      : {
          severity: 'warn',
          summary: '送信できなかった記録があります',
          detail: '一覧で「送信エラー」の記録を確認してください',
          life: 4000,
        },
  )
}
</script>

<template>
  <button
    type="button"
    :class="['sync-status', `tone-${status.tone}`]"
    :aria-busy="syncStore.syncing"
    @click="handleClick"
  >
    <i :class="status.icon" aria-hidden="true"></i>
    <span class="sync-text">
      <span class="sync-label">{{ status.label }}</span>
      <span v-if="status.sub" class="sync-sub">{{ status.sub }}</span>
    </span>
  </button>
</template>

<style scoped>
.sync-status {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0.375rem 0.875rem;
  border-radius: 12px;
  border: 2px solid transparent;
  background: #ffffff;
  font: inherit;
  cursor: pointer;
  text-align: left;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.sync-status i {
  font-size: 1.25rem;
}

.sync-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.sync-label {
  font-size: 0.9375rem;
  font-weight: 700;
}

.sync-sub {
  font-size: 0.75rem;
  color: var(--vt-c-text-secondary);
}

.tone-ok {
  color: #15803d;
  border-color: #bbf7d0;
}

.tone-info {
  color: var(--vt-c-primary-dark);
  border-color: #c7c8fa;
}

.tone-warn {
  color: #a16207;
  border-color: #fde68a;
  background: #fffbeb;
}

.tone-error {
  color: #b91c1c;
  border-color: #fecaca;
  background: #fef2f2;
}

.tone-offline {
  color: #92400e;
  border-color: #fcd34d;
  background: #fffbeb;
}
</style>
