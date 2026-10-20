import { ref, readonly } from 'vue'

// ブラウザのオンライン / オフライン状態（アプリ全体で 1 つの状態を共有する）
const isOnline = ref(navigator.onLine)

// サーバー（Supabase）に接続できない状態
// （無料プランでの一時停止・障害・応答なしなど。端末はオンラインでもオフラインと同じように扱う）
const serverUnavailable = ref(false)

window.addEventListener('online', () => (isOnline.value = true))
window.addEventListener('offline', () => (isOnline.value = false))

export function useNetworkStatus() {
  return { isOnline: readonly(isOnline), serverUnavailable: readonly(serverUnavailable) }
}

export function setServerUnavailable(value: boolean) {
  serverUnavailable.value = value
}

// サーバーへ問い合わせてよい状態か（オフライン・サーバー停止中は端末のデータを使う）
export function canReachServer() {
  return navigator.onLine && !serverUnavailable.value
}

// 通信できなかったことによるエラーかどうか（サーバーが返したエラーとは区別する）
export function isNetworkError(err: unknown): boolean {
  if (!navigator.onLine) return true
  const e = err as { name?: string; message?: string } | null
  if (e?.name === 'AuthRetryableFetchError') return true
  // Chrome: Failed to fetch / Firefox: NetworkError / Safari: Load failed / 時間切れ: TimeoutError
  return /Failed to fetch|NetworkError|Load failed|fetch failed|Network request failed|TimeoutError|timed out/i.test(
    e?.message ?? '',
  )
}

// サーバーに接続できないことによる失敗か（通信エラー・時間切れ・5xx エラー）
// status は Supabase の応答のステータスコード（通信できなかった場合は 0）
export function isServerUnavailable(err: unknown, status?: number): boolean {
  return isNetworkError(err) || (status !== undefined && (status === 0 || status >= 500))
}
