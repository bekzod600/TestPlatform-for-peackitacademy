<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const authStore = useAuthStore()
const themeStore = useThemeStore()

onMounted(async () => {
  // Initialize theme from localStorage / system preference
  themeStore.initTheme()

  // Hydrate auth state from localStorage (synchronous, non-blocking)
  authStore.loadFromStorage()

  // Refresh user data from Supabase in the background
  await authStore.refreshUser()
})
</script>

<template>
  <RouterView />
</template>
