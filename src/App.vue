<script setup>
import { onMounted } from 'vue'
import { useUsersStore } from './stores/users'

console.log('[v0] App.vue mounting')

const usersStore = useUsersStore()

onMounted(() => {
  console.log('[v0] App mounted, loading user from storage')
  usersStore.loadUserFromStorage()
  console.log('[v0] Current user:', usersStore.currentUser)
})
</script>

<template>
  <router-view />
</template>
