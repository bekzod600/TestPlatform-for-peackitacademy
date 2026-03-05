<script setup>
import { onMounted } from 'vue'
import { useUsersStore } from './stores/users'

const usersStore = useUsersStore()

onMounted(async () => {
  // Avval localStorage dan tez yuklaymiz (UI bloklanmasin)
  usersStore.loadUserFromStorage()
  // Keyin Supabase dan yangi ma'lumot olamiz (admin test biriktirgan bo'lishi mumkin)
  await usersStore.refreshCurrentUser()
})
</script>

<template>
  <router-view />
</template>