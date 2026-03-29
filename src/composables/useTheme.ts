import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import type { ThemeMode } from '@/stores/theme'

/**
 * Composable that wraps the theme store for convenient use in components.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useTheme } from '@/composables/useTheme'
 * const { isDark, toggleTheme } = useTheme()
 * </script>
 *
 * <template>
 *   <button @click="toggleTheme">
 *     {{ isDark ? 'Light mode' : 'Dark mode' }}
 *   </button>
 * </template>
 * ```
 */
export function useTheme() {
  const themeStore = useThemeStore()

  const currentTheme = computed<'light' | 'dark'>(() => themeStore.resolvedTheme)
  const mode = computed<ThemeMode>(() => themeStore.mode)
  const isDark = computed<boolean>(() => themeStore.isDark)

  function toggleTheme(): void {
    themeStore.toggleTheme()
  }

  function setTheme(theme: ThemeMode): void {
    themeStore.setTheme(theme)
  }

  return {
    currentTheme,
    mode,
    isDark,
    toggleTheme,
    setTheme,
  }
}
