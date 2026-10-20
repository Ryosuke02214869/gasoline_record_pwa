import { test, expect } from '@playwright/test'

test('未ログインの場合はログイン画面が表示される', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page).toHaveTitle('ガソリン給油記録')
})
