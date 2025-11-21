<script setup>
import { onMounted } from 'vue'
import { useUsersStore } from './stores/users'

const usersStore = useUsersStore()

onMounted(() => {
  usersStore.loadUserFromStorage()
})
</script>

<template>
  <!-- <Button color="primary">
      Primary Button
  </Button> -->
  <router-view />
</template>
