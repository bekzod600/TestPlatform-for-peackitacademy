// =============================================================
// TestPlatform for Peackit Academy — Theme Store (Pinia)
// =============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { SESSION } from '@/lib/constants'

export type ThemeMode = 'light' | 'dark' | 'system'

export const useThemeStore = defineStore('theme', () => {
  // ---------------------------------------------------------
  // State
  // ---------------------------------------------------------
  const mode = ref<ThemeMode>('system')

  // ---------------------------------------------------------
  // Computed
  // ---------------------------------------------------------

  /** Resolved theme taking system preference into account. */
  const resolvedTheme = computed<'light' | 'dark'>(() => {
    if (mode.value === 'system') {
      return getSystemPreference()
    }
    return mode.value
  })

  const isDark = computed<boolean>(() => resolvedTheme.value === 'dark')

  // ---------------------------------------------------------
  // Actions
  // ---------------------------------------------------------

  /** Set theme mode and persist to localStorage. */
  function setTheme(newMode: ThemeMode): void {
    mode.value = newMode
    applyThemeToDocument()
    localStorage.setItem(SESSION.THEME_KEY, newMode)
  }

  /** Cycle through: light -> dark -> system -> light ... */
  function toggleTheme(): void {
    const cycle: ThemeMode[] = ['light', 'dark', 'system']
    const currentIndex = cycle.indexOf(mode.value)
    const nextIndex = (currentIndex + 1) % cycle.length
    setTheme(cycle[nextIndex])
  }

  /**
   * Initialize theme from localStorage or system preference.
   * Call this once on app mount. Also sets up a listener for
   * system preference changes.
   */
  function initTheme(): void {
    const stored = localStorage.getItem(SESSION.THEME_KEY) as ThemeMode | null

    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      mode.value = stored
    } else {
      mode.value = 'system'
    }

    applyThemeToDocument()

    // Listen for system theme changes when in 'system' mode
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', () => {
        if (mode.value === 'system') {
          applyThemeToDocument()
        }
      })
    }
  }

  // ---------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------

  function getSystemPreference(): 'light' | 'dark' {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return 'light'
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }

  function applyThemeToDocument(): void {
    if (typeof document === 'undefined') return

    const effectiveTheme = mode.value === 'system'
      ? getSystemPreference()
      : mode.value

    const root = document.documentElement
    if (effectiveTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  // ---------------------------------------------------------
  // Expose
  // ---------------------------------------------------------
  return {
    // State
    mode,

    // Computed
    resolvedTheme,
    isDark,

    // Actions
    setTheme,
    toggleTheme,
    initTheme,
  }
})
