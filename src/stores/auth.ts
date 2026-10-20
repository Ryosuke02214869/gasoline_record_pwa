import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import { deleteLocalDb } from '@/lib/localDb'
import { isNetworkError } from '@/composables/useNetworkStatus'
import type { User, Session } from '@supabase/supabase-js'

// アプリで使うユーザー情報（オフライン時は端末に保存した情報から復元する）
export type AppUser = Pick<User, 'id' | 'email'>

// 最後にログインしたユーザー（オフライン起動時の本人確認に使う。パスワードは保存しない）
const LAST_USER_KEY = 'gasoline-record:last-user'

// 起動時のセッション確認を待つ最大時間
// Supabase はトークン更新に失敗すると最大30秒ほど再試行するため、電波が弱い時に起動が止まらないようにする
const SESSION_CHECK_TIMEOUT_MS = 5000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))])
}

function loadLastUser(): AppUser | null {
  try {
    const value = localStorage.getItem(LAST_USER_KEY)
    return value ? (JSON.parse(value) as AppUser) : null
  } catch {
    return null
  }
}

function saveLastUser(user: AppUser) {
  try {
    localStorage.setItem(LAST_USER_KEY, JSON.stringify({ id: user.id, email: user.email }))
  } catch (error) {
    console.warn('Failed to save last user:', error)
  }
}

function clearLastUser() {
  try {
    localStorage.removeItem(LAST_USER_KEY)
  } catch (error) {
    console.warn('Failed to clear last user:', error)
  }
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<AppUser | null>(null)
  const session = ref<Session | null>(null)
  const loading = ref(true)
  // オフラインのためサーバーでセッションを確認できていない状態
  // （端末に残っているログイン情報で、給油記録の登録と直近の閲覧のみ許可する）
  const offlineSession = ref(false)

  // Getters
  const isAuthenticated = computed(() => !!user.value)

  function applySession(newSession: Session) {
    session.value = newSession
    user.value = { id: newSession.user.id, email: newSession.user.email }
    offlineSession.value = false
    saveLastUser(user.value)
  }

  function clearUser() {
    session.value = null
    user.value = null
    offlineSession.value = false
    clearLastUser()
  }

  // Actions
  async function initialize() {
    loading.value = true
    try {
      // 現在のセッションを取得
      // アクセストークンの期限切れ時は更新が必要なため、オフラインだとエラーになる
      // （オフラインが明らかな場合は確認を待たない。null は時間切れ）
      const result = navigator.onLine
        ? await withTimeout(supabase.auth.getSession(), SESSION_CHECK_TIMEOUT_MS)
        : null
      const currentSession = result?.data.session ?? null

      if (currentSession) {
        applySession(currentSession)
      } else if (!result || (result.error && isNetworkError(result.error))) {
        // 通信できないだけでログイン情報は端末に残っているため、オフライン状態で起動する
        // （通信できるようになり、トークンが更新されると onAuthStateChange でオンライン状態に戻る）
        const lastUser = loadLastUser()
        if (lastUser) {
          user.value = lastUser
          offlineSession.value = true
        }
      }

      // 認証状態の変更を監視
      supabase.auth.onAuthStateChange((event, newSession) => {
        if (newSession) {
          applySession(newSession)
        } else if (event === 'SIGNED_OUT') {
          // セッションなしの通知は、明示的なログアウトや認証エラーの時のみ反映する
          // （オフライン時の INITIAL_SESSION などでオフライン状態を解除しないため）
          clearUser()
        }
      })
    } catch (error) {
      console.error('Error initializing auth:', error)
    } finally {
      loading.value = false
    }
  }

  // オンライン復帰時にセッションを確認・更新する。サーバーと通信できる状態なら true を返す
  async function ensureOnlineSession() {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession()

    if (currentSession) {
      applySession(currentSession)
      return true
    }
    return false
  }

  async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      throw error
    }

    return data
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw error
    }

    applySession(data.session)

    return data
  }

  async function signOut() {
    const userId = user.value?.id

    // Supabaseのサインアウトイベント（SIGNED_OUT）が完全に処理されるまで待機
    // これにより、onAuthStateChangeリスナーが状態を更新する前に
    // router.push()が実行されることを防ぎ、ログアウトの競合状態を回避する
    const signOutComplete = new Promise<void>((resolve) => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
          // イベントリスナーを解除
          subscription.unsubscribe()
          // 状態をクリア
          clearUser()
          // Promiseを解決
          resolve()
        }
      })
    })

    const { error } = await supabase.auth.signOut()

    if (error) {
      throw error
    }

    // SIGNED_OUTイベントが処理され、状態がクリアされるまで待つ
    await signOutComplete

    // 端末に保存していたデータ（閲覧用キャッシュ・未送信の記録）を削除する
    if (userId) {
      await deleteLocalDb(userId)
    }
  }

  return {
    // State
    user,
    session,
    loading,
    offlineSession,
    // Getters
    isAuthenticated,
    // Actions
    initialize,
    ensureOnlineSession,
    signUp,
    signIn,
    signOut,
  }
})
