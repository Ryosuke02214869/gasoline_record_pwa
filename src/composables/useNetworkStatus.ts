import { ref, readonly } from 'vue'

// ブラウザのオンライン / オフライン状態（アプリ全体で 1 つの状態を共有する）
const isOnline = ref(navigator.onLine)

window.addEventListener('online', () => (isOnline.value = true))
window.addEventListener('offline', () => (isOnline.value = false))

export function useNetworkStatus() {
  return { isOnline: readonly(isOnline) }
}

// 通信できなかったことによるエラーかどうか（サーバーが返したエラーとは区別する）
export function isNetworkError(err: unknown): boolean {
  if (!navigator.onLine) return true
  const e = err as { name?: string; message?: string } | null
  if (e?.name === 'AuthRetryableFetchError') return true
  // Chrome: Failed to fetch / Firefox: NetworkError / Safari: Load failed
  return /Failed to fetch|NetworkError|Load failed|fetch failed|Network request failed/i.test(
    e?.message ?? '',
  )
}
