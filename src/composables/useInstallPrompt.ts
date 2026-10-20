import { ref, computed } from 'vue'

// Chrome / Edge / Android が発行する beforeinstallprompt イベントの型
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// アプリ全体で 1 つの状態を共有する（ページ遷移してもイベントを失わないように）
const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
const isStandalone = ref(
  window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari でホーム画面から起動した場合
    (navigator as Navigator & { standalone?: boolean }).standalone === true,
)

window.addEventListener('beforeinstallprompt', (event) => {
  // ブラウザ標準のミニ情報バーを出さず、アプリ内のボタンから表示する
  event.preventDefault()
  deferredPrompt.value = event as BeforeInstallPromptEvent
})

window.addEventListener('appinstalled', () => {
  deferredPrompt.value = null
  isStandalone.value = true
})

const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  // iPadOS は Mac として振る舞うためタッチ対応で判定する
  (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)

export function useInstallPrompt() {
  // Android / PC: インストールボタンで直接インストールできる
  const canInstall = computed(() => !isStandalone.value && deferredPrompt.value !== null)
  // iOS: 共有メニューから「ホーム画面に追加」する手順を案内する
  const showIosGuide = computed(() => !isStandalone.value && isIos)

  async function install() {
    if (!deferredPrompt.value) return false
    await deferredPrompt.value.prompt()
    const { outcome } = await deferredPrompt.value.userChoice
    deferredPrompt.value = null
    return outcome === 'accepted'
  }

  return {
    isStandalone,
    canInstall,
    showIosGuide,
    install,
  }
}
