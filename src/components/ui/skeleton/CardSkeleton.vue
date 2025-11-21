<!-- components/skeleton/CardSkeleton.vue -->
<template>
  <div class="border rounded-lg p-4 space-y-4 shadow-sm bg-white dark:bg-gray-800">
    <BaseSkeleton class="w-full h-40 rounded-lg" />

    <div class="space-y-2">
      <BaseSkeleton class="h-4 w-3/4" />
      <BaseSkeleton class="h-4 w-1/2" />
    </div>

    <BaseSkeleton class="h-10 w-24 rounded-lg" />
  </div>
</template>

<script setup lang="ts">
import BaseSkeleton from "./BaseSkeleton.vue"
</script>
