-- ============================================
-- Row Level Security (RLS) ポリシー設定
-- ============================================

-- ============================================
-- 1. vehicles テーブルの RLS
-- ============================================

-- RLSを有効化
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の車両のみ閲覧可能
CREATE POLICY "Users can view own vehicles"
  ON vehicles FOR SELECT
  USING (auth.uid() = user_id);

-- ユーザーは自分の車両のみ作成可能
CREATE POLICY "Users can create own vehicles"
  ON vehicles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分の車両のみ更新可能
CREATE POLICY "Users can update own vehicles"
  ON vehicles FOR UPDATE
  USING (auth.uid() = user_id);

-- ユーザーは自分の車両のみ削除可能
CREATE POLICY "Users can delete own vehicles"
  ON vehicles FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================
-- 2. fuel_records テーブルの RLS
-- ============================================

-- RLSを有効化
ALTER TABLE fuel_records ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の車両の給油記録のみ閲覧可能
CREATE POLICY "Users can view own fuel records"
  ON fuel_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = fuel_records.vehicle_id
      AND vehicles.user_id = auth.uid()
    )
  );

-- ユーザーは自分の車両の給油記録のみ作成可能
CREATE POLICY "Users can create own fuel records"
  ON fuel_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = fuel_records.vehicle_id
      AND vehicles.user_id = auth.uid()
    )
  );

-- ユーザーは自分の車両の給油記録のみ更新可能
CREATE POLICY "Users can update own fuel records"
  ON fuel_records FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = fuel_records.vehicle_id
      AND vehicles.user_id = auth.uid()
    )
  );

-- ユーザーは自分の車両の給油記録のみ削除可能
CREATE POLICY "Users can delete own fuel records"
  ON fuel_records FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM vehicles
      WHERE vehicles.id = fuel_records.vehicle_id
      AND vehicles.user_id = auth.uid()
    )
  );
