# ガソリン給油記録（PWA版）

給油量・リッター単価・走行距離を記録して、燃費を自動計算するWebアプリです。
スマホのホーム画面に追加して使える PWA に対応し、電波が届かない場所でも給油記録を登録できます。

## 主な機能

- メールアドレスでのアカウント登録・ログイン
- 車両の登録・編集・削除（1アカウントで複数台）
- 給油記録の登録・編集・削除
- 給油金額・前回からの走行距離・燃費(km/L)の自動計算
- PWA
  - ホーム画面への追加（Android / PC はインストールボタン、iOS は手順を案内）
  - アプリ本体のキャッシュによるオフライン起動
  - 新しいバージョンの通知
- オフライン対応
  - 給油記録の登録（端末に保存し、オンライン復帰時に自動送信）
  - 各車両の直近2件の閲覧
  - 同期状態の表示と「今すぐ同期」（給油記録一覧の画面上部）

## 技術スタック

- Vue 3 / TypeScript / Vite
- Pinia / Vue Router / PrimeVue
- Supabase（認証・データベース）
- vite-plugin-pwa（Service Worker・Web App Manifest）
- Dexie.js（IndexedDB：オフライン用データ・未送信の記録）

## セットアップ

Node.js `^20.19.0` または `>=22.12.0` が必要です。

```sh
npm install
cp .env.example .env   # Supabase の URL と Anon Key を設定する
```

### データベース

Supabase の SQL Editor で、`supabase/` 以下の SQL を番号順に実行します（詳細は [supabase/README.md](supabase/README.md)）。

1. `01_create_tables.sql` … `vehicles` / `fuel_records` テーブル
2. `02_enable_rls.sql` … Row Level Security（自分のデータのみ操作可能）
3. `03_add_vehicle_model.sql` … 車種(model)カラムの追加

## 開発

```sh
npm run dev          # 開発サーバー（Service Worker は無効）
npm run build        # 型チェック + 本番ビルド
npm run preview      # ビルド結果の確認（PWA・オフライン動作はこちらで確認）
npm run test:unit    # 単体テスト（Vitest）
npm run test:e2e     # E2Eテスト（Playwright）
npm run lint         # ESLint
```

PWA用アイコンは `public/pwa-icon.svg` から生成しています。変更した場合は以下で再生成してください。

```sh
npm run generate-pwa-assets
```

## オフライン対応の仕組み

| 項目 | 内容 |
|---|---|
| ログイン状態 | オフライン時は端末に残っているログイン情報で起動し、オンライン復帰時にトークンを更新する（未ログインの端末では利用不可） |
| 登録 | 記録はまず IndexedDB に保存してから送信する。IDと登録日時(`created_at`)は端末側で決めるため、再送信しても二重登録にならない |
| 自動送信 | 起動時・オンライン復帰時・アプリが前面に戻った時。同期状態をタップすると手動でも同期できる |
| 閲覧 | オンライン時に各車両の直近2件（燃費などの計算結果を含む）を端末へ保存しておき、オフライン時に表示する |
| 走行距離チェック | 前回の記録より大きいかを、表示中・端末保存・未送信の記録から判定する |
| オンライン限定 | 給油記録の編集・削除、車両の登録・編集・削除、ログアウト |
| ログアウト | 未送信の記録が残っている場合は警告する。ログアウトすると端末のデータは削除される |

端末のデータが消えないよう、ホーム画面に追加して使うことを前提にしています（起動時に `navigator.storage.persist()` で永続化も依頼します）。

## デプロイ

Vercel を想定しています（`vercel.json` で SPA のルーティングと Service Worker のキャッシュ設定を行っています）。
環境変数 `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を設定してください。
PWA として動作させるには HTTPS が必要です。
