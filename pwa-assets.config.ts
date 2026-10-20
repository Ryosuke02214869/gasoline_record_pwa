import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// public/pwa-icon.svg から PWA 用アイコン一式（favicon / apple-touch-icon / maskable など）を生成する
export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: {
    ...minimal2023Preset,
    maskable: {
      ...minimal2023Preset.maskable,
      resizeOptions: { background: '#5B5FED' },
    },
    apple: {
      ...minimal2023Preset.apple,
      resizeOptions: { background: '#5B5FED' },
    },
  },
  images: ['public/pwa-icon.svg'],
})
