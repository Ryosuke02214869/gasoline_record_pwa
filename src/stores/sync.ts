import { ref, computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { getLocalDb } from '@/lib/localDb'
import { useNetworkStatus, isServerUnavailable } from '@/composables/useNetworkStatus'
import { useAuthStore } from './auth'
import { useFuelRecordStore } from './fuelRecord'
import { useVehicleStore } from './vehicle'

const LAST_SYNCED_AT_KEY = 'lastSyncedAt'

// サーバーに接続できない間、再接続を試みる間隔
const RECONNECT_INTERVAL_MS = 60 * 1000

export const useSyncStore = defineStore('sync', () => {
  const authStore = useAuthStore()
  const { isOnline, serverUnavailable } = useNetworkStatus()

  // State
  const pendingCount = ref(0)
  const failedCount = ref(0)
  const syncing = ref(false)
  const lastSyncedAt = ref<string | null>(null)

  // Getters
  // サーバーと通信できない理由
  // network: 端末がオフライン / server: サーバーに接続できない（停止中、またはセッションをまだ確認できていない）
  const offlineReason = computed<'network' | 'server' | null>(() => {
    if (!isOnline.value) return 'network'
    if (serverUnavailable.value || authStore.offlineSession) return 'server'
    return null
  })

  // サーバーと通信できない状態（どちらの理由でも、オフラインと同じように扱う）
  const isOffline = computed(() => offlineReason.value !== null)

  // Actions
  async function refreshPendingCount() {
    if (!authStore.user) {
      pendingCount.value = 0
      failedCount.value = 0
      lastSyncedAt.value = null
      return
    }

    const db = getLocalDb(authStore.user.id)
    const pending = await db.pendingRecords.toArray()
    pendingCount.value = pending.length
    failedCount.value = pending.filter((p) => p.last_error).length
    lastSyncedAt.value = (await db.meta.get(LAST_SYNCED_AT_KEY))?.value ?? null
  }

  // 同期を実行する。未送信の記録がすべて送信できた場合は true を返す
  // 同期中に呼ばれた場合は、実行中の同期の後にもう一度同期する（同期中に追加された記録も送信するため）
  let currentSync: Promise<boolean> | null = null
  let rerunRequested = false

  function syncNow() {
    if (currentSync) {
      rerunRequested = true
      return currentSync
    }

    currentSync = (async () => {
      let result = false
      do {
        rerunRequested = false
        result = await runSync()
      } while (rerunRequested)
      return result
    })().finally(() => {
      currentSync = null
    })
    return currentSync
  }

  async function runSync() {
    const userId = authStore.user?.id
    if (!userId || !isOnline.value) {
      return false
    }

    syncing.value = true
    try {
      // オフライン状態で起動していた場合は、ここでセッションを確認・更新する
      if (!(await authStore.ensureOnlineSession())) {
        return false
      }

      // サーバーに接続できるか確認する（停止中なら端末のデータを使い続け、未送信の記録も残しておく）
      const { error: probeError, status: probeStatus } = await supabase
        .from('vehicles')
        .select('id')
        .limit(1)
      if (probeError) {
        if (isServerUnavailable(probeError, probeStatus)) {
          return false
        }
        throw probeError
      }

      const db = getLocalDb(userId)
      const fuelRecordStore = useFuelRecordStore()

      // 登録した順に送信する
      const pending = await db.pendingRecords.orderBy('created_at').toArray()
      for (const record of pending) {
        const { error, status } = await supabase.from('fuel_records').upsert(
          {
            id: record.id,
            vehicle_id: record.vehicle_id,
            date: record.date,
            fuel_amount: record.fuel_amount,
            price_per_liter: record.price_per_liter,
            odometer: record.odometer,
            created_at: record.created_at,
          },
          // 送信済みの記録を再送信した場合は何もしない（二重登録を防ぐ）
          { onConflict: 'id', ignoreDuplicates: true },
        )

        if (error) {
          // 通信できない・サーバー停止の場合は未送信のまま残し、次の同期で再送信する
          if (isServerUnavailable(error, status)) {
            return false
          }
          // サーバーに拒否された記録（別の端末で車両が削除された等）は残しておき、ユーザーに知らせる
          await db.pendingRecords.update(record.id, { last_error: error.message })
          fuelRecordStore.markRecordSyncFailed(record.id, error.message)
          continue
        }

        await db.pendingRecords.delete(record.id)
        fuelRecordStore.markRecordSynced(record.id)
      }

      // 他の端末で登録された記録も含めて最新の状態を取得し、オフライン用のデータも更新する
      await useVehicleStore().fetchVehicles()
      await fuelRecordStore.fetchRecords(undefined, { silent: true })

      await db.meta.put({ key: LAST_SYNCED_AT_KEY, value: new Date().toISOString() })

      return (await db.pendingRecords.count()) === 0
    } catch (err) {
      console.error('Error syncing fuel records:', err)
      return false
    } finally {
      syncing.value = false
      await refreshPendingCount()
    }
  }

  // 自動同期：ログイン時・起動時、オンライン復帰時、アプリが前面に戻った時
  let autoSyncStarted = false

  function startAutoSync() {
    if (autoSyncStarted) return
    autoSyncStarted = true

    watch(
      () => authStore.user?.id,
      async (userId) => {
        await refreshPendingCount()
        if (userId) {
          void syncNow()
        }
      },
      { immediate: true },
    )

    watch(isOnline, (online) => {
      if (online) {
        void syncNow()
      }
    })

    // オフライン状態で起動した後、トークンが更新されてセッションが確認できた時
    watch(
      () => authStore.offlineSession,
      (offlineSession) => {
        if (!offlineSession) {
          void syncNow()
        }
      },
    )

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void syncNow()
      }
    })

    // サーバーに接続できない間は、定期的に再接続を試みる
    setInterval(() => {
      if (authStore.user && offlineReason.value === 'server') {
        void syncNow()
      }
    }, RECONNECT_INTERVAL_MS)
  }

  return {
    // State
    pendingCount,
    failedCount,
    syncing,
    lastSyncedAt,
    // Getters
    offlineReason,
    isOffline,
    // Actions
    refreshPendingCount,
    syncNow,
    startAutoSync,
  }
})
