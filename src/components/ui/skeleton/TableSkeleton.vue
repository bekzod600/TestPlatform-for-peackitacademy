<!-- components/skeleton/TableRowSkeleton.vue -->
<template>
  <tr class="animate-pulse">
    <td v-for="n in columns" :key="n" class="px-6 py-4">
      <BaseSkeleton class="h-4 w-full rounded" />
    </td>
  </tr>
</template>

<script setup lang="ts">
import BaseSkeleton from "./BaseSkeleton.vue"

interface Props {
  columns?: number
}

withDefaults(defineProps<Props>(), {
  columns: 4
})
</script>
