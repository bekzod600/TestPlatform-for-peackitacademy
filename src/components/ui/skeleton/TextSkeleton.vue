<!-- components/skeleton/TextSkeleton.vue -->
<template>
  <div class="flex flex-col gap-2">
    <BaseSkeleton
      v-for="n in lines"
      :key="n"
      class="h-3 w-full"
    />
  </div>
</template>

<script setup lang="ts">
import BaseSkeleton from "./BaseSkeleton.vue"

interface Props {
  lines?: number
}

withDefaults(defineProps<Props>(), {
  lines: 3
})
</script>
