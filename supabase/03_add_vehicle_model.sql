-- ============================================
-- 3. vehicles テーブルに model カラムを追加
-- ============================================

-- vehiclesテーブルにmodelカラムを追加（NULL許可）
-- 既存データとの互換性のため、NULLを許可する
ALTER TABLE vehicles ADD COLUMN model TEXT;

-- インデックス作成（パフォーマンス向上）
-- NULL値はインデックスから除外して効率化
CREATE INDEX idx_vehicles_model ON vehicles(model) WHERE model IS NOT NULL;
