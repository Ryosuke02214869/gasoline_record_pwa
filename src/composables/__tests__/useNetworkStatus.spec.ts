import { describe, it, expect } from 'vitest'
import { isServerUnavailable } from '../useNetworkStatus'

describe('isServerUnavailable', () => {
  it('通信できない・時間切れはサーバーに接続できないと判定する', () => {
    expect(isServerUnavailable({ message: 'TypeError: Failed to fetch' }, 0)).toBe(true)
    expect(isServerUnavailable({ message: 'TimeoutError: Request timed out' })).toBe(true)
    expect(isServerUnavailable({ name: 'AuthRetryableFetchError', message: '' })).toBe(true)
  })

  it('5xx エラーはサーバーに接続できないと判定する', () => {
    expect(isServerUnavailable({ message: '<html>Service Unavailable</html>' }, 503)).toBe(true)
    expect(isServerUnavailable({ message: '' }, 540)).toBe(true)
  })

  it('4xx エラー（入力や権限の誤り）はサーバー停止とはみなさない', () => {
    expect(isServerUnavailable({ message: 'new row violates row-level security policy' }, 403)).toBe(
      false,
    )
    expect(isServerUnavailable({ message: 'insert or update violates foreign key' }, 409)).toBe(false)
  })
})
