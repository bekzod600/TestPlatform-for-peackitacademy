<script setup lang="ts">
import { Sun, Moon } from 'lucide-vue-next'
import { ref, onMounted } from 'vue'
import { SESSION } from '@/lib/constants'

const isDark = ref(false)

function syncTheme() {
  isDark.value = document.documentElement.classList.contains('dark')
}

onMounted(() => {
  syncTheme()
})

function toggleTheme() {
  const html = document.documentElement
  if (html.classList.contains('dark')) {
    html.classList.remove('dark')
    localStorage.setItem(SESSION.THEME_KEY, 'light')
  } else {
    html.classList.add('dark')
    localStorage.setItem(SESSION.THEME_KEY, 'dark')
  }
  syncTheme()
}
</script>

<template>
  <button
    @click="toggleTheme"
    class="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 w-9 hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    :title="isDark ? 'Light rejimga o\'tish' : 'Dark rejimga o\'tish'"
  >
    <Transition name="theme-icon" mode="out-in">
      <Sun
        v-if="isDark"
        key="sun"
        class="h-5 w-5 transition-transform duration-300 rotate-0"
      />
      <Moon
        v-else
        key="moon"
        class="h-5 w-5 transition-transform duration-300 rotate-0"
      />
    </Transition>
  </button>
</template>

<style scoped>
.theme-icon-enter-active,
.theme-icon-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.theme-icon-enter-from {
  opacity: 0;
  transform: rotate(-90deg) scale(0.8);
}

.theme-icon-enter-to {
  opacity: 1;
  transform: rotate(0deg) scale(1);
}

.theme-icon-leave-from {
  opacity: 1;
  transform: rotate(0deg) scale(1);
}

.theme-icon-leave-to {
  opacity: 0;
  transform: rotate(90deg) scale(0.8);
}
</style>
