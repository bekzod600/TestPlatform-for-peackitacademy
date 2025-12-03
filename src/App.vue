<script setup>
import { onMounted } from 'vue'
import { useUsersStore } from './stores/users'

const usersStore = useUsersStore()

onMounted(() => {
  usersStore.loadUserFromStorage()
})
</script>

<template>
  <router-view />
</template>
