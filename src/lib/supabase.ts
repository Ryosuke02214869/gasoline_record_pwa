import { createClient } from '@supabase/supabase-js'

// 環境変数から Supabase の設定を取得
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Supabase クライアントの初期化
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
