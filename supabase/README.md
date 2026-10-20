# Supabase セットアップ手順

このドキュメントでは、ガソリン給油記録アプリ用の Supabase データベースのセットアップ手順を説明します。

## 前提条件

- Supabase アカウントを作成済みであること
- 新規プロジェクトを作成済みであること

## セットアップ手順

### 1. Supabase プロジェクトの作成

1. [Supabase](https://supabase.com/) にアクセスし、ログインします
2. 「New Project」をクリックして新規プロジェクトを作成します
3. プロジェクト名を入力します（例: `gasoline-record-app`）
4. データベースパスワードを設定します（安全な場所に保存してください）
5. リージョンを選択します（日本の場合は `Northeast Asia (Tokyo)` を推奨）
6. 「Create new project」をクリックします

### 2. データベーステーブルの作成

プロジェクトが作成されたら、以下の手順でテーブルを作成します：

1. Supabase Dashboard の左メニューから「SQL Editor」を選択します
2. 「New Query」をクリックします
3. `supabase/01_create_tables.sql` の内容をコピー＆ペーストします
4. 「Run」ボタンをクリックして実行します

これで以下のテーブルが作成されます：
- `vehicles` テーブル（車両情報）
- `fuel_records` テーブル（給油記録）

### 3. Row Level Security (RLS) の設定

セキュリティポリシーを設定します：

1. 同じく「SQL Editor」で「New Query」をクリックします
2. `supabase/02_enable_rls.sql` の内容をコピー＆ペーストします
3. 「Run」ボタンをクリックして実行します

これにより、ユーザーは自分のデータのみにアクセスできるようになります。

### 4. Email 認証の設定

1. Supabase Dashboard の左メニューから「Authentication」→「Providers」を選択します
2. 「Email」プロバイダーが有効になっていることを確認します
3. 必要に応じて「Confirm email」の設定を変更します
   - 開発中は OFF にすることを推奨（メール確認なしでログイン可能）
   - 本番環境では ON にすることを推奨

### 5. サイト URL の設定

1. Supabase Dashboard の左メニューから「Authentication」→「URL Configuration」を選択します
2. 「Site URL」に以下を設定します：
   - ローカル開発: `http://localhost:5173`
   - 本番環境: デプロイ後の URL（例: `https://your-app.vercel.app`）
3. 「Redirect URLs」に同じ URL を追加します

### 6. 環境変数の設定

1. Supabase Dashboard の左メニューから「Project Settings」→「API」を選択します
2. 以下の情報をコピーします：
   - **Project URL**
   - **Anon key**（`anon` `public` のキー）

3. プロジェクトルートの `.env` ファイルを開き、以下を設定します：

```bash
VITE_SUPABASE_URL=<Project URL をここに貼り付け>
VITE_SUPABASE_ANON_KEY=<Anon key をここに貼り付け>
```

### 7. 接続テスト

1. 開発サーバーを起動します：
```bash
npm run dev
```

2. ブラウザで `http://localhost:5173` にアクセスします
3. ユーザー登録画面でアカウントを作成してログインできることを確認します

## トラブルシューティング

### テーブルが作成されない

- SQL エディターでエラーメッセージを確認してください
- 既に同名のテーブルが存在する場合は削除してから再実行してください

### ログインできない

- `.env` ファイルの環境変数が正しく設定されているか確認してください
- ブラウザのコンソールでエラーメッセージを確認してください
- Supabase Dashboard の「Authentication」→「Users」でユーザーが作成されているか確認してください

### データが表示されない

- Row Level Security (RLS) ポリシーが正しく設定されているか確認してください
- ユーザーが正しくログインしているか確認してください
- ブラウザのコンソールでエラーメッセージを確認してください

## データベーススキーマ

### vehicles テーブル

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PRIMARY KEY | 車両ID |
| user_id | UUID | FOREIGN KEY, NOT NULL | ユーザーID |
| name | TEXT | NOT NULL | 車名 |
| license_plate | TEXT | NOT NULL | ナンバー |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | 更新日時 |

### fuel_records テーブル

| カラム名 | 型 | 制約 | 説明 |
|---------|-----|------|------|
| id | UUID | PRIMARY KEY | 給油記録ID |
| vehicle_id | UUID | FOREIGN KEY, NOT NULL | 車両ID |
| date | DATE | NOT NULL | 給油日 |
| fuel_amount | DECIMAL(10,2) | NOT NULL | 給油量(L) |
| price_per_liter | DECIMAL(10,2) | NOT NULL | リッター単価(円/L) |
| odometer | INTEGER | NOT NULL | 走行距離(km) |
| created_at | TIMESTAMP | NOT NULL | 作成日時 |
| updated_at | TIMESTAMP | NOT NULL | 更新日時 |

## 参考リンク

- [Supabase 公式ドキュメント](https://supabase.com/docs)
- [Supabase Authentication](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
