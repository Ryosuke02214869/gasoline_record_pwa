import Dexie, { type Table } from 'dexie'
import type { Vehicle } from '@/stores/vehicle'
import type { FuelRecord } from '@/stores/fuelRecord'

// オフライン中に登録し、まだサーバーへ送信していない給油記録
export interface PendingFuelRecord {
  id: string
  vehicle_id: string
  date: string
  fuel_amount: number
  price_per_liter: number
  odometer: number
  // 端末で登録した日時（送信時もこの値を created_at として使う）
  created_at: string
  // サーバーに拒否された場合のエラーメッセージ
  last_error?: string
}

interface MetaEntry {
  key: string
  value: string
}

class LocalDb extends Dexie {
  // オフライン閲覧用：車両一覧
  vehicles!: Table<Vehicle, string>
  // オフライン閲覧用：各車両の直近2件（燃費などの計算結果を含む）
  recentRecords!: Table<FuelRecord, string>
  // 送信待ちの給油記録
  pendingRecords!: Table<PendingFuelRecord, string>
  // 最終同期日時などの付随情報
  meta!: Table<MetaEntry, string>

  constructor(name: string) {
    super(name)
    this.version(1).stores({
      vehicles: 'id',
      recentRecords: 'id, vehicle_id',
      pendingRecords: 'id, vehicle_id, created_at',
      meta: 'key',
    })
  }
}

// ユーザーごとに DB を分けて、別アカウントのデータが混ざらないようにする
const dbName = (userId: string) => `gasoline-record-${userId}`
const instances = new Map<string, LocalDb>()

export function getLocalDb(userId: string): LocalDb {
  let db = instances.get(userId)
  if (!db) {
    db = new LocalDb(dbName(userId))
    instances.set(userId, db)
  }
  return db
}

export async function deleteLocalDb(userId: string) {
  instances.get(userId)?.close()
  instances.delete(userId)
  await Dexie.delete(dbName(userId))
}

// Vue のリアクティブなオブジェクトは IndexedDB に保存できないため、プレーンなオブジェクトに変換する
export function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

// ブラウザに端末データの永続化を依頼する（容量不足時などに自動削除されにくくなる）
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist()
    }
  } catch (error) {
    console.warn('Persistent storage request failed:', error)
  }
}
