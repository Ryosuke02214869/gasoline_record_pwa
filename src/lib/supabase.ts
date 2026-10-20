import { createClient } from '@supabase/supabase-js'
import { setServerUnavailable } from '@/composables/useNetworkStatus'

// 環境変数から Supabase の設定を取得
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Supabase への通信の最大待ち時間（サーバーが応答しない時にいつまでも待たないようにする）
const REQUEST_TIMEOUT_MS = 10000

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

// Supabase への通信：時間制限を付け、サーバーに接続できるかどうかを記録する
async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}) {
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(new DOMException('Request timed out', 'TimeoutError')),
    REQUEST_TIMEOUT_MS,
  )
  // 呼び出し元による中断にも対応する
  const callerSignal = init.signal
  if (callerSignal?.aborted) {
    controller.abort(callerSignal.reason)
  } else {
    callerSignal?.addEventListener('abort', () => controller.abort(callerSignal.reason), {
      once: true,
    })
  }

  try {
    const response = await fetch(input, { ...init, signal: controller.signal })

    if (response.status >= 500) {
      setServerUnavailable(true)
      // トークン更新がサーバー停止で失敗した場合、Supabase はエラーの種類によってはログイン情報を削除してしまう
      // 通信エラーとして扱えば、Supabase は再試行してログイン情報を保持するため、ここで通信エラーにする
      const url = requestUrl(input)
      if (url.includes('/auth/v1/token') && url.includes('grant_type=refresh_token')) {
        throw new TypeError('Failed to fetch')
      }
    } else {
      setServerUnavailable(false)
    }

    return response
  } catch (error) {
    // 端末がオフラインの場合や、呼び出し元が中断した場合はサーバー停止とはみなさない
    if (navigator.onLine && !callerSignal?.aborted) {
      setServerUnavailable(true)
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

// Supabase クライアントの初期化
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: fetchWithTimeout,
  },
  auth: {
    // セッションをlocalStorageに永続化
    persistSession: true,
    // トークンを自動的にリフレッシュ
    autoRefreshToken: true,
    // セッション検出を有効化
    detectSessionInUrl: true,
    // リフレッシュトークンの有効期間を延長（デフォルトは3600秒=1時間）
    // 注意: これはクライアント側の設定で、実際のトークン有効期限はSupabaseダッシュボードで設定されます
  },
})
