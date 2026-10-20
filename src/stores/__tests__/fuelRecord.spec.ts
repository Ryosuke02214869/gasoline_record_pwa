import { describe, it, expect } from 'vitest'
import { calculateFuelEfficiency, type FuelRecord } from '../fuelRecord'

const record = (overrides: Partial<FuelRecord>): FuelRecord => ({
  id: 'id',
  vehicle_id: 'car-1',
  date: '2026-10-01',
  fuel_amount: 40,
  price_per_liter: 170,
  odometer: 10000,
  created_at: '2026-10-01T00:00:00.000Z',
  updated_at: '2026-10-01T00:00:00.000Z',
  ...overrides,
})

const byId = (list: FuelRecord[]) => new Map(list.map((r) => [r.id, r]))

describe('calculateFuelEfficiency', () => {
  it('同じ日の記録は created_at 順に前回として扱う', () => {
    const result = byId(
      calculateFuelEfficiency([
        // 取得順（新しい順）で渡されても正しく計算されること
        record({ id: 'b', date: '2026-10-05', odometer: 10600, created_at: '2026-10-05T09:00:00.000+00:00' }),
        record({ id: 'a', date: '2026-10-05', odometer: 10400, created_at: '2026-10-05T01:00:00.000Z' }),
        record({ id: 'first', date: '2026-10-01', odometer: 10000 }),
      ]),
    )

    expect(result.get('first')?.distance_from_previous).toBeNull()
    expect(result.get('a')?.distance_from_previous).toBe(400)
    expect(result.get('b')?.distance_from_previous).toBe(200)
    expect(result.get('b')?.fuel_efficiency).toBe(5)
  })

  it('車両ごとに計算する', () => {
    const result = byId(
      calculateFuelEfficiency([
        record({ id: 'c1', vehicle_id: 'car-1', date: '2026-10-01', odometer: 10000 }),
        record({ id: 'c2', vehicle_id: 'car-2', date: '2026-10-02', odometer: 50000 }),
        record({ id: 'c3', vehicle_id: 'car-1', date: '2026-10-03', odometer: 10400 }),
      ]),
    )

    expect(result.get('c2')?.distance_from_previous).toBeNull()
    expect(result.get('c3')?.distance_from_previous).toBe(400)
  })

  it('走行距離が減っている場合は距離をマイナスで返し、燃費は計算しない', () => {
    const result = byId(
      calculateFuelEfficiency([
        record({ id: 'x', date: '2026-10-01', odometer: 10500 }),
        record({ id: 'y', date: '2026-10-02', odometer: 10400 }),
      ]),
    )

    expect(result.get('y')?.distance_from_previous).toBe(-100)
    expect(result.get('y')?.fuel_efficiency).toBeNull()
  })

  it('端末に保存した直近の記録は保存時の計算結果を使い、未送信の記録はそれを前回として計算する', () => {
    const result = byId(
      calculateFuelEfficiency([
        // 直近2件のうち古い方：前回の記録は端末にないが、保存時の値を保持する
        record({
          id: 'cached-old',
          date: '2026-10-01',
          odometer: 10000,
          from_cache: true,
          distance_from_previous: 500,
          fuel_efficiency: 12.5,
        }),
        record({
          id: 'cached-new',
          date: '2026-10-08',
          odometer: 10480,
          from_cache: true,
          distance_from_previous: 480,
          fuel_efficiency: 12,
        }),
        record({ id: 'pending', date: '2026-10-15', odometer: 10880, pending: true }),
      ]),
    )

    expect(result.get('cached-old')?.fuel_efficiency).toBe(12.5)
    expect(result.get('cached-new')?.distance_from_previous).toBe(480)
    expect(result.get('pending')?.distance_from_previous).toBe(400)
    expect(result.get('pending')?.fuel_efficiency).toBe(10)
    expect(result.get('pending')?.total_cost).toBe(6800)
  })
})
