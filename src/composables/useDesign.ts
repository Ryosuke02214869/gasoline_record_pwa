import { ref, computed } from 'vue'

// 画面デザインの種類（standard: 従来のデザイン / modern: モダンなデザイン）
export type DesignName = 'standard' | 'modern'

// 選んだデザインはこの端末に保存する
const STORAGE_KEY = 'gasoline-record:design'

// ブラウザのツールバーなどの色（index.html の theme-color）
const THEME_COLORS: Record<DesignName, string> = {
  standard: '#5B5FED',
  modern: '#4F46E5',
}

function loadDesign(): DesignName {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'modern' ? 'modern' : 'standard'
  } catch {
    return 'standard'
  }
}

// アプリ全体で 1 つの状態を共有する
const design = ref<DesignName>(loadDesign())

function applyDesign(name: DesignName) {
  document.documentElement.dataset.design = name
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[name])
}

// 画面表示前に呼び、保存済みのデザインを反映する
export function initDesign() {
  applyDesign(design.value)
}

export function useDesign() {
  const isModern = computed(() => design.value === 'modern')

  function setDesign(name: DesignName) {
    design.value = name
    applyDesign(name)
    try {
      localStorage.setItem(STORAGE_KEY, name)
    } catch (error) {
      console.warn('Failed to save design:', error)
    }
  }

  return { design, isModern, setDesign }
}
