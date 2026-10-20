import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { getLocalDb, toPlain, type PendingFuelRecord } from '@/lib/localDb'
import { isNetworkError } from '@/composables/useNetworkStatus'
import { useAuthStore } from './auth'
import { useVehicleStore } from './vehicle'
import { useSyncStore } from './sync'
import type { Ref, ComputedRef } from 'vue'

export interface FuelRecord {
  id: string
  vehicle_id: string
  date: string
  fuel_amount: number
  price_per_liter: number
  odometer: number
  created_at: string
  updated_at: string
  // リレーション
  vehicles?: {
    name: string
    model?: string
    license_plate: string
  }
  // 計算フィールド
  total_cost?: number
  distance_from_previous?: number | null
  fuel_efficiency?: number | null
  // 同期状態
  pending?: boolean // まだサーバーへ送信していない
  sync_error?: string // サーバーに拒否された理由
  from_cache?: boolean // オフラインのため端末に保存した記録を表示している
}

export interface FuelRecordStore {
  records: Ref<FuelRecord[]>
  loading: Ref<boolean>
  error: Ref<string | null>
  isOfflineView: Ref<boolean>
  recordsByVehicle: ComputedRef<(vehicleId: string) => FuelRecord[]>
  fetchRecords: (vehicleId?: string, options?: { silent?: boolean }) => Promise<void>
  createRecord: (
    vehicleId: string,
    date: string,
    fuelAmount: number,
    pricePerLiter: number,
    odometer: number,
  ) => Promise<FuelRecord>
  updateRecord: (
    id: string,
    vehicleId: string,
    date: string,
    fuelAmount: number,
    pricePerLiter: number,
    odometer: number,
  ) => Promise<FuelRecord | null>
  deleteRecord: (id: string) => Promise<void>
  discardPendingRecord: (id: string) => Promise<void>
  findPreviousRecord: (vehicleId: string, date: string) => Promise<FuelRecord | null>
  markRecordSynced: (id: string) => void
  markRecordSyncFailed: (id: string, message: string) => void
  clearError: () => void
}

// オフライン閲覧用に端末へ保存する、車両ごとの直近の記録件数
const RECENT_RECORDS_PER_VEHICLE = 2

const RECORD_SELECT = `
  *,
  vehicles (
    name,
    model,
    license_plate
  )
`

// 日付 → 登録日時(created_at) の順で比較する（同じ日に複数回給油した場合も正しく並ぶように）
export function compareRecordsAsc(a: FuelRecord, b: FuelRecord) {
  if (a.date !== b.date) {
    return a.date < b.date ? -1 : 1
  }
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
}

function compareRecordsDesc(a: FuelRecord, b: FuelRecord) {
  return compareRecordsAsc(b, a)
}

// 燃費計算関数
export function calculateFuelEfficiency(recordsList: FuelRecord[]): FuelRecord[] {
  if (recordsList.length === 0) return []

  // 車両IDごとにグループ化（異なる車両のレコードを比較しないようにする）
  const recordsByVehicle = new Map<string, FuelRecord[]>()

  for (const record of recordsList) {
    const vehicleRecords = recordsByVehicle.get(record.vehicle_id) || []
    vehicleRecords.push(record)
    recordsByVehicle.set(record.vehicle_id, vehicleRecords)
  }

  // 各車両ごとに燃費を計算
  const allCalculatedRecords: FuelRecord[] = []

  for (const vehicleRecords of recordsByVehicle.values()) {
    // 車両内で日付・登録日時順にソート（古い順）
    const sorted = [...vehicleRecords].sort(compareRecordsAsc)

    // 同じ車両のレコード同士のみで燃費計算
    const calculated = sorted.map((record, index) => {
      // 給油金額の計算
      const total_cost = record.fuel_amount * record.price_per_liter

      // 端末に保存した直近の記録は、オンライン時に全履歴から計算した値をそのまま使う
      if (record.from_cache) {
        return { ...record, total_cost }
      }

      // 前回の記録（同じ車両のもの）
      const previousRecord = index > 0 ? sorted[index - 1] : undefined

      // 最初の記録の場合は前回からの計算ができない
      if (!previousRecord) {
        return {
          ...record,
          total_cost,
          distance_from_previous: null,
          fuel_efficiency: null,
        }
      }

      // 前回からの走行距離
      const distance_from_previous = record.odometer - previousRecord.odometer

      // 燃費（km/L）
      const fuel_efficiency =
        distance_from_previous > 0 ? distance_from_previous / record.fuel_amount : null

      return {
        ...record,
        total_cost,
        distance_from_previous,
        fuel_efficiency,
      }
    })

    allCalculatedRecords.push(...calculated)
  }

  return allCalculatedRecords
}

export const useFuelRecordStore = defineStore('fuelRecord', () => {
  // State
  const records = ref<FuelRecord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  // オフラインのため、端末に保存した直近の記録を表示しているか
  const isOfflineView = ref(false)
  // 直近の取得結果が全車両・全件か（オフライン用キャッシュの更新可否の判定に使う）
  let hasAllRecords = false

  // Getters
  const recordsByVehicle = computed(() => {
    return (vehicleId: string) => {
      return records.value.filter((r) => r.vehicle_id === vehicleId)
    }
  })

  // 燃費を再計算し、新しい順に並べて保持する
  function setRecords(list: FuelRecord[]) {
    records.value = calculateFuelEfficiency(list).sort(compareRecordsDesc)
  }

  function userDb() {
    const authStore = useAuthStore()
    if (!authStore.user) {
      throw new Error('ユーザーが認証されていません')
    }
    return getLocalDb(authStore.user.id)
  }

  function pendingToRecord(pending: PendingFuelRecord): FuelRecord {
    const vehicle = useVehicleStore().vehicles.find((v) => v.id === pending.vehicle_id)
    return {
      id: pending.id,
      vehicle_id: pending.vehicle_id,
      date: pending.date,
      fuel_amount: pending.fuel_amount,
      price_per_liter: pending.price_per_liter,
      odometer: pending.odometer,
      created_at: pending.created_at,
      updated_at: pending.created_at,
      vehicles: vehicle
        ? { name: vehicle.name, model: vehicle.model, license_plate: vehicle.license_plate }
        : undefined,
      pending: true,
      sync_error: pending.last_error,
    }
  }

  async function loadPendingRecords(vehicleId?: string) {
    const db = userDb()
    const list = vehicleId
      ? await db.pendingRecords.where('vehicle_id').equals(vehicleId).toArray()
      : await db.pendingRecords.toArray()
    return list.map(pendingToRecord)
  }

  async function loadRecentCache(vehicleId?: string) {
    const db = userDb()
    const list = vehicleId
      ? await db.recentRecords.where('vehicle_id').equals(vehicleId).toArray()
      : await db.recentRecords.toArray()
    return list.map((r) => ({ ...r, from_cache: true }))
  }

  // オフライン閲覧用に、各車両の直近の記録（計算結果を含む）を端末へ保存する
  async function saveRecentCache() {
    if (!hasAllRecords || isOfflineView.value) return

    const latest: FuelRecord[] = []
    const counts = new Map<string, number>()
    for (const record of records.value) {
      if (record.pending) continue
      const count = counts.get(record.vehicle_id) ?? 0
      if (count < RECENT_RECORDS_PER_VEHICLE) {
        latest.push(record)
        counts.set(record.vehicle_id, count + 1)
      }
    }

    const db = userDb()
    const plain = toPlain(latest)
    await db.transaction('rw', db.recentRecords, async () => {
      await db.recentRecords.clear()
      await db.recentRecords.bulkPut(plain)
    })
  }

  // Actions
  async function fetchRecords(vehicleId?: string, options: { silent?: boolean } = {}) {
    if (!options.silent) {
      loading.value = true
    }
    error.value = null

    try {
      let serverRecords: FuelRecord[]

      try {
        // オフラインの場合はサーバーに問い合わせない
        // （トークン更新の再試行が終わるまで待たされるため、すぐに端末のデータを使う）
        if (!navigator.onLine || useAuthStore().offlineSession) {
          throw new TypeError('Failed to fetch')
        }

        let query = supabase
          .from('fuel_records')
          .select(RECORD_SELECT)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })

        if (vehicleId) {
          query = query.eq('vehicle_id', vehicleId)
        }

        const { data, error: fetchError } = await query

        if (fetchError) {
          throw fetchError
        }

        serverRecords = data || []
        isOfflineView.value = false
        hasAllRecords = !vehicleId
      } catch (err) {
        if (!isNetworkError(err)) {
          throw err
        }
        // オフラインの場合は端末に保存した直近の記録を使う
        serverRecords = await loadRecentCache(vehicleId)
        isOfflineView.value = true
        hasAllRecords = false
      }

      // 未送信の記録も一覧に含める
      const serverIds = new Set(serverRecords.map((r) => r.id))
      const pendingRecords = (await loadPendingRecords(vehicleId)).filter(
        (r) => !serverIds.has(r.id),
      )

      // 燃費計算を追加
      setRecords([...serverRecords, ...pendingRecords])
      await saveRecentCache()
    } catch (err: any) {
      console.error('Error fetching fuel records:', err)
      error.value = err.message || '給油記録の取得に失敗しました'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createRecord(
    vehicleId: string,
    date: string,
    fuelAmount: number,
    pricePerLiter: number,
    odometer: number,
  ) {
    if (!vehicleId || vehicleId.trim() === '') {
      throw new Error('車両IDが指定されていません')
    }

    loading.value = true
    error.value = null

    try {
      const pending: PendingFuelRecord = {
        // 端末側でIDを決めておくことで、再送信しても二重登録にならない
        id: crypto.randomUUID(),
        vehicle_id: vehicleId,
        date,
        fuel_amount: fuelAmount,
        price_per_liter: pricePerLiter,
        odometer,
        // 端末で登録した日時をそのまま created_at として送信する
        created_at: new Date().toISOString(),
      }

      // 通信状況に関わらず、まず端末に保存してから送信する（送信に失敗しても記録が失われないように）
      await userDb().pendingRecords.add(pending)
      setRecords([...records.value, pendingToRecord(pending)])

      const syncStore = useSyncStore()
      await syncStore.refreshPendingCount()
      await syncStore.syncNow()

      // 送信できたかどうか（pending）は一覧の状態を参照する
      return records.value.find((r) => r.id === pending.id) ?? pendingToRecord(pending)
    } catch (err: any) {
      console.error('Error creating fuel record:', err)
      error.value = err.message || '給油記録の登録に失敗しました'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateRecord(
    id: string,
    vehicleId: string,
    date: string,
    fuelAmount: number,
    pricePerLiter: number,
    odometer: number,
  ) {
    if (!vehicleId || vehicleId.trim() === '') {
      throw new Error('車両IDが指定されていません')
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: updateError } = await supabase
        .from('fuel_records')
        .update({
          vehicle_id: vehicleId,
          date,
          fuel_amount: fuelAmount,
          price_per_liter: pricePerLiter,
          odometer,
        })
        .eq('id', id)
        .select(RECORD_SELECT)
        .single()

      if (updateError) {
        throw updateError
      }

      // リストを更新して再計算
      if (data) {
        setRecords(records.value.map((r) => (r.id === id ? data : r)))
        await saveRecentCache()
      }

      return data
    } catch (err: any) {
      console.error('Error updating fuel record:', err)
      error.value = err.message || '給油記録の更新に失敗しました'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteRecord(id: string) {
    loading.value = true
    error.value = null

    try {
      const recordToDelete = records.value.find((r) => r.id === id)
      if (!recordToDelete) {
        throw new Error('削除対象の記録が見つかりません')
      }

      const { error: deleteError } = await supabase.from('fuel_records').delete().eq('id', id)

      if (deleteError) {
        throw deleteError
      }

      // リストから削除して再計算
      setRecords(records.value.filter((r) => r.id !== id))
      await saveRecentCache()
    } catch (err: any) {
      console.error('Error deleting fuel record:', err)
      error.value = err.message || '給油記録の削除に失敗しました'
      throw err
    } finally {
      loading.value = false
    }
  }

  // 未送信の記録を端末から削除する（サーバーには送信しない。オフラインでも実行できる）
  async function discardPendingRecord(id: string) {
    await userDb().pendingRecords.delete(id)
    setRecords(records.value.filter((r) => r.id !== id))
    await useSyncStore().refreshPendingCount()
  }

  // 指定した日付以前で最も新しい記録（走行距離のチェックに使う）
  // オフラインでも判定できるよう、表示中の記録・端末に保存した直近の記録・未送信の記録から探す
  async function findPreviousRecord(vehicleId: string, date: string) {
    const candidates = new Map<string, FuelRecord>()
    const sources = [
      records.value.filter((r) => r.vehicle_id === vehicleId),
      await loadRecentCache(vehicleId),
      await loadPendingRecords(vehicleId),
    ]
    for (const source of sources) {
      for (const record of source) {
        if (!candidates.has(record.id)) {
          candidates.set(record.id, record)
        }
      }
    }

    const previous = [...candidates.values()]
      .filter((r) => r.date <= date)
      .sort(compareRecordsDesc)
    return previous[0] ?? null
  }

  // 送信が完了した記録の未送信状態を解除する
  function markRecordSynced(id: string) {
    const index = records.value.findIndex((r) => r.id === id)
    const record = records.value[index]
    if (record) {
      records.value.splice(index, 1, { ...record, pending: false, sync_error: undefined })
    }
  }

  function markRecordSyncFailed(id: string, message: string) {
    const index = records.value.findIndex((r) => r.id === id)
    const record = records.value[index]
    if (record) {
      records.value.splice(index, 1, { ...record, sync_error: message })
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    // State
    records,
    loading,
    error,
    isOfflineView,
    // Getters
    recordsByVehicle,
    // Actions
    fetchRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    discardPendingRecord,
    findPreviousRecord,
    markRecordSynced,
    markRecordSyncFailed,
    clearError,
  }
})
