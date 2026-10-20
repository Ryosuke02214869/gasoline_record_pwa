import { ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth'
import { getLocalDb, toPlain } from '@/lib/localDb'
import { isNetworkError } from '@/composables/useNetworkStatus'

export interface Vehicle {
  id: string
  user_id: string
  name: string
  model?: string
  license_plate: string
  created_at: string
  updated_at: string
}

export const useVehicleStore = defineStore('vehicle', () => {
  // State
  const vehicles = ref<Vehicle[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // オフライン閲覧用に車両一覧を端末へ保存する
  async function saveCache() {
    const authStore = useAuthStore()
    if (!authStore.user) return
    const db = getLocalDb(authStore.user.id)
    const plain = toPlain(vehicles.value)
    await db.transaction('rw', db.vehicles, async () => {
      await db.vehicles.clear()
      await db.vehicles.bulkPut(plain)
    })
  }

  async function loadCache() {
    const authStore = useAuthStore()
    if (!authStore.user) return []
    const cached = await getLocalDb(authStore.user.id).vehicles.toArray()
    return cached.sort((a, b) => b.created_at.localeCompare(a.created_at))
  }

  // Actions
  async function fetchVehicles() {
    loading.value = true
    error.value = null

    try {
      // オフラインの場合はサーバーに問い合わせない
      // （トークン更新の再試行が終わるまで待たされるため、すぐに端末のデータを使う）
      if (!navigator.onLine || useAuthStore().offlineSession) {
        throw new TypeError('Failed to fetch')
      }

      const { data, error: fetchError } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false })

      if (fetchError) {
        throw fetchError
      }

      vehicles.value = data || []
      await saveCache()
    } catch (err: any) {
      // オフラインの場合は端末に保存した車両一覧を使う
      if (isNetworkError(err)) {
        vehicles.value = await loadCache()
        return
      }
      console.error('Error fetching vehicles:', err)
      error.value = err.message || '車両の取得に失敗しました'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createVehicle(name: string, licensePlate: string, model?: string) {
    loading.value = true
    error.value = null

    try {
      const authStore = useAuthStore()
      if (!authStore.user) {
        throw new Error('ユーザーが認証されていません')
      }

      const { data, error: createError } = await supabase
        .from('vehicles')
        .insert({
          user_id: authStore.user.id,
          name,
          license_plate: licensePlate,
          ...(model && { model }),
        })
        .select()
        .single()

      if (createError) {
        throw createError
      }

      // ローカルの配列に追加
      if (data) {
        vehicles.value.unshift(data)
        await saveCache()
      }

      return data
    } catch (err: any) {
      console.error('Error creating vehicle:', err)
      error.value = err.message || '車両の登録に失敗しました'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateVehicle(id: string, name: string, licensePlate: string, model?: string) {
    loading.value = true
    error.value = null

    try {
      const { data, error: updateError } = await supabase
        .from('vehicles')
        .update({
          name,
          license_plate: licensePlate,
          ...(model !== undefined && { model: model || null }),
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      // ローカルの配列を更新
      // Vue のリアクティビティを確実にトリガーするため、splice() を使用
      const index = vehicles.value.findIndex((v) => v.id === id)
      if (index !== -1 && data) {
        vehicles.value.splice(index, 1, data)
        await saveCache()
      }

      return data
    } catch (err: any) {
      console.error('Error updating vehicle:', err)
      error.value = err.message || '車両の更新に失敗しました'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteVehicle(id: string) {
    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await supabase.from('vehicles').delete().eq('id', id)

      if (deleteError) {
        throw deleteError
      }

      // ローカルの配列から削除
      vehicles.value = vehicles.value.filter((v) => v.id !== id)
      await saveCache()
    } catch (err: any) {
      console.error('Error deleting vehicle:', err)
      error.value = err.message || '車両の削除に失敗しました'
      throw err
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    // State
    vehicles,
    loading,
    error,
    // Actions
    fetchVehicles,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    clearError,
  }
})
