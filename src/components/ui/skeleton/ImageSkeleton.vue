<!-- components/skeleton/ImageSkeleton.vue -->
<template>
  <BaseSkeleton :class="`w-full ${height}`" />
</template>

<script setup lang="ts">
import BaseSkeleton from "./BaseSkeleton.vue"

interface Props {
  height?: string
}

withDefaults(defineProps<Props>(), {
  height: "h-48"
})
</script>
