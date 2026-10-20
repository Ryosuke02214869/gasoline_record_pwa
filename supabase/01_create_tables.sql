-- ============================================
-- 1. vehicles テーブル作成
-- ============================================

-- vehicles テーブル作成
CREATE TABLE vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- インデックス作成
CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);

-- updated_at自動更新用トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- vehicles テーブルのトリガー
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- 2. fuel_records テーブル作成
-- ============================================

-- fuel_records テーブル作成
CREATE TABLE fuel_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  fuel_amount DECIMAL(10,2) NOT NULL CHECK (fuel_amount > 0),
  price_per_liter DECIMAL(10,2) NOT NULL CHECK (price_per_liter > 0),
  odometer INTEGER NOT NULL CHECK (odometer >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- インデックス作成
CREATE INDEX idx_fuel_records_vehicle_id ON fuel_records(vehicle_id);
CREATE INDEX idx_fuel_records_date ON fuel_records(date DESC);

-- fuel_records テーブルのトリガー
CREATE TRIGGER update_fuel_records_updated_at
  BEFORE UPDATE ON fuel_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
